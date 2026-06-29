import { FastifyInstance } from "fastify";
import { z } from "zod";
import { answerQuestion, answerQuestionStream } from "../services/chatbot.js";
import { buildKbIndex, getKbIndex } from "../services/chatbot-kb.js";
import { env } from "../config/env.js";

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
   * platform. Rate-limited via the global @fastify/rate-limit plugin
   * (2000/min/IP). For higher limits, sign in.
   *
   * Body: { question, locale?, history?, topK?, stream? }
   * Returns: { text, sources[], fallback }
   */
  app.post("/", async (request, reply) => {
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
   * Accepts thumbs-up/down + free-text. Stored for product review;
   * not surfaced in the UI yet. No auth required (anonymous feedback
   * is fine for V1).
   */
  app.post("/feedback", async (request) => {
    const input = feedbackSchema.parse(request.body);
    // For now, log + 200. Phase 2: persist to a `chat_feedback` table
    // and surface in admin analytics.
    app.log.info(
      {
        rating: input.rating,
        questionLength: input.question.length,
        answerLength: input.answer.length,
        hasComment: !!input.comment,
        locale: input.locale,
      },
      "[chat] feedback",
    );
    return { ok: true };
  });
}