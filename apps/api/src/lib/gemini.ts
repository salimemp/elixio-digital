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

const DEFAULT_MODEL = "gemini-1.5-flash-8b";

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
  const model = c.getGenerativeModel({
    model: options.model ?? DEFAULT_MODEL,
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      responseMimeType: options.jsonMode ? "application/json" : undefined,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
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