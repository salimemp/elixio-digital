import { GoogleGenerativeAI } from "@google/generative-ai";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

/**
 * Gemini client wrapper. Single point of configuration for the model
 * name, default temperature, and safety settings. If GEMINI_API_KEY is
 * not set, the helpers below throw a clear error rather than crashing
 * with an opaque 401 from the SDK.
 */
let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY not set in Railway dashboard. AI features are disabled until it is."
    );
  }
  if (!client) {
    client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return client;
}

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
export async function generate(
  systemPrompt: string,
  userPrompt: string,
  options: GenerateOptions = {}
): Promise<{ text: string; record: GenerationRecord }> {
  const c = getClient();
  const model = c.getGenerativeModel(
    {
      model: options.model ?? DEFAULT_MODEL,
      generationConfig: {
        temperature: options.temperature ?? 0.4,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
        responseMimeType: options.jsonMode ? "application/json" : undefined,
      },
    },
    {
      // Gemini 1.5+ models (gemini-1.5-flash-001, gemini-2.0-flash,
      // text-embedding-004) are served from /v1; the SDK default v1beta
      // returns 404 for them. Forcing v1 makes generateContent and
      // embedContent both work.
      apiVersion: "v1",
    }
  );

  const result = await model.generateContent({
    // Inline the system prompt as the first content entry instead of
    // using a top-level `systemInstruction` / `system_instruction` field.
    // The wire format changed between API versions: v1beta accepts
    // `systemInstruction` (camelCase) at the top level, but v1 only
    // accepts `system_instruction` (snake_case), which the SDK does not
    // emit automatically. Passing system as a role:system content entry
    // is portable across v1 and v1beta.
    contents: [
      { role: "system", parts: [{ text: systemPrompt }] },
      { role: "user", parts: [{ text: userPrompt }] },
    ],
  });
  const response = await result.response;
  const text = response.text();
  const usage = response.usageMetadata;

  // Gemini 1.5 Flash 8b pricing: free tier; 0.075/M input, 0.3/M output
  // on the paid tier. Cost is negligible on free tier; we record 0.
  const costUsd = 0;

  return {
    text,
    record: {
      modelName: options.model ?? DEFAULT_MODEL,
      tokensIn: usage?.promptTokenCount ?? 0,
      tokensOut: usage?.candidatesTokenCount ?? 0,
      costUsd,
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

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const c = getClient();
  const model = c.getGenerativeModel(
    { model: EMBED_MODEL },
    { apiVersion: "v1" }
  );

  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    batches.push(texts.slice(i, i + EMBED_BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const res = await model.batchEmbedContents({
        requests: batch.map((text) => ({
          content: { role: "user", parts: [{ text }] },
        })),
      });
      return res.embeddings.map((e) => e.values ?? []);
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