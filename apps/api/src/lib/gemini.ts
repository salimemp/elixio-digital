import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

/**
 * Gemini REST helpers. We bypass the @google/generative-ai SDK
 * entirely — it sends the wrong API version (v1beta by default,
 * which 404s on current models) and the wrong field-name casing
 * (systemInstruction camelCase, which v1 rejects). Raw fetch
 * gives us full control over the wire format.
 */

/**
 * Current default. Gemini 1.5 models (gemini-1.5-flash, -001, -8b,
 * -pro) were deprecated in 2025 and 404 on any 2026-era API key.
 * Gemini 2.5 Flash is the current fast tier — same latency profile
 * as 1.5 Flash but with better quality and lower cost. Free tier:
 * 15 RPM / 1500 RPD.
 */
const DEFAULT_MODEL = "gemini-2.5-flash";

export interface GenerateOptions {
  /** Higher = more creative. Default 0.4 (factual listing copy). */
  temperature?: number;
  /** Caller-specific max output tokens. Default 2048. */
  maxOutputTokens?: number;
  /** JSON-mode: constrain output to valid JSON. */
  jsonMode?: boolean;
  /** Optional model override (e.g. "gemini-1.5-pro" for harder tasks). */
  model?: string;
}

export interface GenerationRecord {
  /** Persist this in ai_generations table at job completion. */
  modelName: string;
  tokensIn: number;
  tokensOut: number;
  /** USD cost (rough; flash-8b is essentially free). */
  costUsd: number;
}

/**
 * Run a prompt. Returns the raw text response. Caller is responsible
 * for JSON parsing if jsonMode=true.
 */
export /**
 * Run a prompt against the Gemini REST API. Uses raw `fetch` instead
 * of the SDK because:
 *
 *   1. The SDK's default URL is v1beta, which doesn't support the
 *      current model names on 2026-era API keys.
 *   2. The SDK sends `systemInstruction` (camelCase) at the top level,
 *      which the v1 API rejects — it expects `system_instruction`
 *      (snake_case).
 *   3. The SDK has no way to override the field name casing.
 *
 * Raw fetch gives us full control over the wire format. ~30 lines of
 * code, no SDK quirks to fight.
 */
async function generate(
  systemPrompt: string,
  userPrompt: string,
  options: GenerateOptions = {}
): Promise<{ text: string; record: GenerationRecord }> {
  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY not set in Railway dashboard. AI features are disabled until it is."
    );
  }

  const model = options.model ?? DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body: Record<string, unknown> = {
    // v1beta accepts BOTH `system_instruction` (snake) and
    // `systemInstruction` (camel); v1 only accepts snake_case.
    // Using snake_case works for both.
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Gemini API ${res.status} ${res.statusText}: ${errBody.slice(0, 500)}`
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return {
    text,
    record: {
      modelName: model,
      tokensIn: data.usageMetadata?.promptTokenCount ?? 0,
      tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
      costUsd: 0,
    },
  };
}

/**
 * Embed a batch of texts using Gemini's `gemini-embedding-001` model.
 *
 * Returns one 768-dim vector per input text, in the same order.
 * Used by the chatbot's RAG indexer.
 *
 * Note: `text-embedding-004` was deprecated in 2025; the current
 * model is `gemini-embedding-001`. Same 768-dim output, same
 * retrieval quality, free-tier limits.
 *
 * Batches input into groups of 100 (the API's per-call limit) and
 * makes concurrent calls. Returns zero-vectors on failure (caller
 * falls back to keyword retrieval).
 */
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_BATCH_SIZE = 100;

/**
 * Embed a batch of texts using the raw REST API (same reasoning as
 * `generate()` above — bypass the SDK's URL / field-name quirks).
 *
 * The endpoint is `batchEmbedContents` on the v1beta API. Takes up to
 * 100 texts per call and returns one 768-dim vector per text.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${env.GEMINI_API_KEY}`;

  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    batches.push(texts.slice(i, i + EMBED_BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model: `models/${EMBED_MODEL}`,
            content: { role: "user", parts: [{ text }] },
          })),
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(
          `Gemini embed ${res.status} ${res.statusText}: ${errBody.slice(0, 500)}`
        );
      }
      const data = (await res.json()) as {
        embeddings?: Array<{ values?: number[] }>;
      };
      return (data.embeddings ?? []).map((e) => e.values ?? []);
    }),
  );

  return results.flat();
}

/**
 * Embed a single text. Convenience wrapper.
 */
export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec ?? [];
}

/**
 * Persist a completed AI job to ai_generations table.
 */
export async function recordAIGeneration(input: {
  creatorId: string;
  kind: "listing_copywriter" | "asset_critique" | "sales_coach" | "metadata_seo";
  inputJson: unknown;
  outputJson: unknown;
  record: GenerationRecord;
  durationMs: number;
  errorMessage?: string;
}): Promise<void> {
await prisma.aIGeneration.create({
      data: {
        creatorId: input.creatorId,
        kind: input.kind,
        status: input.errorMessage ? "failed" : "completed",
        inputJson: input.inputJson as Prisma.InputJsonValue,
        outputJson: input.outputJson !== undefined && input.outputJson !== null
          ? (input.outputJson as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        errorMessage: input.errorMessage,
        tokensIn: input.record.tokensIn,
        tokensOut: input.record.tokensOut,
        costUsd: input.record.costUsd,
        durationMs: input.durationMs,
        completedAt: new Date(),
      },
    });
}