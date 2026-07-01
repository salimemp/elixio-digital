import { FastifyInstance } from "fastify";
import { z } from "zod";
import { answerQuestion, answerQuestionStream } from "../services/chatbot.js";
import { buildKbIndex, getKbIndex } from "../services/chatbot-kb.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const chatRequestSchema = z.object({
  question: z.string().min(1).max(2000),
  locale: z.string().min(2).max(10).optional(),
  history: z.array(chatMessageSchema).max(20).optional(),
  topK: z.number().int().min(1).max(10).optional(),
  /** When true, response is streamed as text/event-stream. */
  stream: z.boolean().optional(),
});

const feedbackSchema = z.object({
  /** The user question (or a hash of it) that was answered. */
  question: z.string().min(1).max(2000),
  /** The assistant's response that was rated. */
  answer: z.string().min(1).max(8000),
  /** thumbs up or down. */
  rating: z.enum(["up", "down"]),
  /** Free-text feedback. */
  comment: z.string().max(1000).optional(),
  locale: z.string().max(10).optional(),
});

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  // Build the KB index at server start (idempotent).
  buildKbIndex().catch((e) => {
    app.log.warn({ err: e }, "[chat] failed to build KB index at startup");
  });

  /**
   * POST /chat (becomes /v1/chat when the parent registers with that
   * prefix).
   *
   * Public (no auth required) — anyone can ask questions about the
   * platform.
   *
   * Rate-limited per IP: 30 req/min. The global rate-limit plugin
   * runs with `global: false` (see app.ts), so each route opts in.
   * 30/min is chosen because each call invokes Gemini 2.5 Flash +
   * the RAG retriever + a KB chunk-embedding search — expensive
   * enough that 30/min/IP is generous for legitimate use and stops
   * trivial abuse (script kiddies) without breaking real users.
   *
   * For higher limits, sign in (authenticated routes get a separate
   * higher quota via lib/rate-limit.ts).
   *
   * Body: { question, locale?, history?, topK?, stream? }
   * Returns: { text, sources[], fallback }
   */
  app.post(
    "/",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
    const input = chatRequestSchema.parse(request.body);

    if (input.stream) {
      // SSE response
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no"); // disable proxy buffering

      const result = await answerQuestionStream(input, (token) => {
        reply.raw.write(`event: token\n`);
        reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
      });
      reply.raw.write(`event: done\n`);
      reply.raw.write(`data: ${JSON.stringify(result)}\n\n`);
      reply.raw.end();
      return reply;
    }

    const result = await answerQuestion(input);
    return result;
  });

  /**
   * GET /chat/health
   *
   * Returns index status + a flag indicating whether Gemini is
   * configured. Useful for the widget to show a "knowledge base
   * loading" state.
   */
  app.get("/health", async () => {
    const index = getKbIndex();
    return {
      kbReady: index !== null,
      kbChunks: index?.chunks.length ?? 0,
      kbSources: index?.sourceCount ?? 0,
      geminiConfigured: !!env.GEMINI_API_KEY,
    };
  });

  /**
   * POST /chat/feedback
   *
   * Accepts thumbs-up/down + free-text. Persisted to chat_feedback
   * table for product analytics: which KB chunks get voted up vs
   * down, which languages have lowest satisfaction, etc.
   *
   * No auth required — anonymous feedback is fine for V1. We do
   * NOT log IP addresses here (GDPR data-minimization).
   *
   * Rate-limited per IP: 60 req/min. Feedback is cheap (single
   * DB INSERT) but we don't want bots to flood it.
   */
  app.post(
    "/feedback",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const input = feedbackSchema.parse(request.body);

      // If the request includes a valid bearer token, attribute the
      // feedback to that user. Otherwise anonymous.
      //
      // SECURITY: we never trust the contents of `request.user` unless
      // `request.jwtVerify()` succeeded. The previous code silently
      // swallowed JWT errors, which CodeQL correctly flagged as a
      // "user-controlled bypass of security check" — a malformed
      // token could leave `request.user` populated from a prior
      // middleware while we proceeded as if verification succeeded.
      //
      // We now log failed verifications (no PII) and explicitly set
      // `userId` from the verified payload only.
      let userId: string | null = null;
      const authHeader = request.headers.authorization;
      if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        try {
          await request.jwtVerify();
          // Verified: now we can trust request.user.
          userId = (request.user as { userId?: string } | undefined)?.userId ?? null;
        } catch (err) {
          // Verification failed. Log the failure category for
          // security monitoring (no token contents — they may be
          // sensitive). The request proceeds as anonymous feedback.
          app.log.warn(
            { err: (err as Error).message },
            "[chat] feedback: bearer token verification failed; treating as anonymous"
          );
        }
      }

    try {
      await prisma.chatFeedback.create({
        data: {
          userId,
          question: input.question.slice(0, 2000),
          answer: input.answer.slice(0, 8000),
          rating: input.rating,
          comment: input.comment ?? null,
          locale: input.locale ?? "en",
        },
      });
    } catch (e) {
      // Don't fail the user-visible feedback flow on a DB hiccup —
      // log it for ops to investigate.
      app.log.warn({ err: e }, "[chat] feedback persistence failed");
    }

    app.log.info(
      {
        rating: input.rating,
        questionLength: input.question.length,
        answerLength: input.answer.length,
        hasComment: !!input.comment,
        locale: input.locale,
        attributedToUser: !!userId,
      },
      "[chat] feedback",
    );
    return { ok: true };
  });
}