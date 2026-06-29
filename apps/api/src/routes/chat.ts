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
   * GET /chat/diag
   *
   * Diagnostic endpoint — lists models available to the configured
   * Gemini API key. Returns both the raw model list (name + supported
   * methods) AND the result of a real test call to detect if the key
   * is rate-limited, region-restricted, or has the API disabled.
   *
   * Temporary (Phase 1 only). Will be removed once Aura is stable.
   */
  app.get("/diag", async () => {
    if (!env.GEMINI_API_KEY) {
      return { error: "GEMINI_API_KEY not set" };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`;
    let listResult: unknown = null;
    let listError: string | null = null;
    try {
      const r = await fetch(url);
      const body = await r.json();
      if (!r.ok) {
        listError = `${r.status} ${r.statusText} — ${JSON.stringify(body).slice(0, 300)}`;
      } else {
        // Slim the response — just names + supported methods.
        const models = (body as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> }).models ?? [];
        listResult = models.map((m) => ({
          name: m.name,
          methods: m.supportedGenerationMethods ?? [],
        }));
      }
    } catch (e: any) {
      listError = e?.message ?? String(e);
    }

    // Also test a real generate call with each known model name.
    const candidates = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      "gemini-pro",
      "gemini-2.0-flash",
      "gemini-2.0-flash-exp",
    ];
    const probeResults: Record<string, string> = {};
    await Promise.all(
      candidates.map(async (m) => {
        const probeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${env.GEMINI_API_KEY}`;
        try {
          const r = await fetch(probeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "hi" }] }],
            }),
          });
          const body = await r.json();
          probeResults[m] = r.ok
            ? `OK (${(body as { candidates?: unknown[] }).candidates?.length ?? 0} candidates)`
            : `${r.status} — ${JSON.stringify(body).slice(0, 200)}`;
        } catch (e: any) {
          probeResults[m] = `ERR — ${e?.message ?? String(e)}`;
        }
      })
    );

    return {
      keyConfigured: true,
      keyPrefix: env.GEMINI_API_KEY.slice(0, 6) + "...",
      listResult,
      listError,
      probeResults,
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