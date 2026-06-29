/**
 * Chatbot query service. RAG (retrieval-augmented generation) over the
 * in-memory KB index.
 *
 * Pipeline:
 *   1. Embed the user's question with the same model used at index time
 *   2. Cosine-similarity against all chunks; take top-K
 *   3. If no chunk scores above 0.4, fall back to a keyword-overlap
 *      retriever (useful when the embedder is unavailable)
 *   4. Build a system prompt with the top chunks + a strict
 *      "answer only from these sources" instruction
 *   5. Call Gemini 1.5 Flash to generate the response in the user's
 *      language
 *   6. Stream the response back via the SSE handler
 *
 * Streaming is supported via a callback parameter; non-streaming callers
 * (tests, batch jobs) get the full text at once.
 */

import { buildKbIndex, getKbIndex, type KbChunk } from "./chatbot-kb.js";
import { embedText, generate } from "../lib/gemini.js";
import { logger } from "../lib/logger.js";

export interface ChatSource {
  title: string;
  url?: string;
  source: string;
  score: number;
  excerpt: string;
}

export interface ChatResponse {
  text: string;
  sources: ChatSource[];
  /** True if no relevant KB chunks were found (low confidence). */
  fallback: boolean;
}

export interface ChatQuery {
  question: string;
  /** BCP-47 locale tag for the response language. */
  locale?: string;
  /** Conversation history (last few turns). Optional. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Max chunks to retrieve (default 4). */
  topK?: number;
}

const MAX_CHARS_PER_CHUNK = 800;
const MAX_TOTAL_CONTEXT_CHARS = 4000;
const MIN_RELEVANCE_SCORE = 0.35;

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function keywordScore(query: string, chunk: KbChunk): number {
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return 0;
  const cTokens = new Set(tokenize(chunk.content));
  let hits = 0;
  for (const t of qTokens) if (cTokens.has(t)) hits++;
  return hits / qTokens.size;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function buildSystemPrompt(chunks: KbChunk[], locale: string): string {
  const context = chunks
    .map((c, i) => {
      const title = c.metadata.title ?? c.metadata.source;
      const url = c.metadata.url ? ` (${c.metadata.url})` : "";
      return `[${i + 1}] ${title}${url}\n${truncate(c.content, MAX_CHARS_PER_CHUNK)}`;
    })
    .join("\n\n---\n\n")
    .slice(0, MAX_TOTAL_CONTEXT_CHARS);

  const lang = (locale || "en").split("-")[0];
  const langName = languageNameForCode(lang);

  return `You are Elixio, a helpful assistant for the Elixio Digital marketplace.

You must answer the user's question using ONLY the provided context below. If the
answer is not in the context, say "I'm not sure about that — try the help docs
at /docs or contact support@elixiodigital.com." Do not invent features, prices,
or policies that aren't in the context.

If the user asks a question in a non-English language, respond in their language
(${langName}).

Be concise, friendly, and use markdown for formatting (lists, links, code). When
you cite a fact, mention the source number in brackets, e.g. "[1]".

If the user asks where to do something in the app and the context mentions a
URL, point them to that URL.

CONTEXT:
${context || "(no relevant context found)"}`;
}

function languageNameForCode(code: string): string {
  const map: Record<string, string> = {
    en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
    pt: "Portuguese", nl: "Dutch", sv: "Swedish", no: "Norwegian", da: "Danish",
    fi: "Finnish", pl: "Polish", ru: "Russian", uk: "Ukrainian", cs: "Czech",
    sk: "Slovak", hu: "Hungarian", ro: "Romanian", bg: "Bulgarian", el: "Greek",
    tr: "Turkish", ar: "Arabic", he: "Hebrew", fa: "Persian", ur: "Urdu",
    hi: "Hindi", bn: "Bengali", ta: "Tamil", te: "Telugu", kn: "Kannada",
    ml: "Malayalam", mr: "Marathi", gu: "Gujarati", pa: "Punjabi", si: "Sinhala",
    th: "Thai", vi: "Vietnamese", id: "Indonesian", ms: "Malay", tl: "Tagalog",
    ja: "Japanese", ko: "Korean", zh: "Chinese (Simplified)", "zh-TW": "Chinese (Traditional)",
    my: "Burmese", km: "Khmer", lo: "Lao", mn: "Mongolian",
  };
  return map[code] ?? code;
}

/** Retrieve the top-K most relevant chunks for a question. */
export async function retrieveChunks(
  question: string,
  topK = 4,
): Promise<Array<{ chunk: KbChunk; score: number }>> {
  const index = getKbIndex() ?? (await buildKbIndex());
  if (index.chunks.length === 0) return [];

  let questionEmbedding: number[] = [];
  try {
    questionEmbedding = await embedText(question);
  } catch (e) {
    logger.warn({ err: e }, "embedding failed, using keyword fallback");
  }

  const scored = index.chunks.map((chunk) => {
    const semantic = questionEmbedding.length > 0
      ? cosineSim(questionEmbedding, chunk.embedding)
      : 0;
    const keyword = keywordScore(question, chunk);
    // Blend: when embeddings are zero/identical, fall back to keyword.
    const score = semantic > 0 ? Math.max(semantic, keyword * 0.5) : keyword;
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/** Answer a question. Returns the text, sources, and a fallback flag. */
export async function answerQuestion(query: ChatQuery): Promise<ChatResponse> {
  const locale = query.locale ?? "en";
  const topK = query.topK ?? 4;
  const top = await retrieveChunks(query.question, topK);
  const relevant = top.filter((t) => t.score >= MIN_RELEVANCE_SCORE);

  const chunks = relevant.length > 0 ? relevant.map((t) => t.chunk) : [];
  const fallback = relevant.length === 0;

  const systemPrompt = buildSystemPrompt(chunks, locale);
  const userPrompt = buildUserPrompt(query);

  let text: string;
  try {
    const { text: responseText } = await generate(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxOutputTokens: 1024,
    });
    text = responseText;
  } catch (e) {
    logger.warn({ err: e }, "generation failed");
    if (fallback) {
      return {
        text: "I'm having trouble connecting to my knowledge base. Please try the /docs page or contact support@elixiodigital.com.",
        sources: [],
        fallback: true,
      };
    }
    // We have relevant context but generation failed — return the
    // top excerpt directly as a graceful degradation.
    text = relevant
      .map(
        (t) =>
          `**${t.chunk.metadata.title ?? t.chunk.metadata.source}**\n\n${truncate(t.chunk.content, 500)}`,
      )
      .join("\n\n---\n\n");
  }

  return {
    text,
    sources: relevant.map((t) => ({
      title: t.chunk.metadata.title ?? t.chunk.metadata.source,
      url: t.chunk.metadata.url,
      source: t.chunk.metadata.source,
      score: t.score,
      excerpt: truncate(t.chunk.content, 240),
    })),
    fallback,
  };
}

function buildUserPrompt(query: ChatQuery): string {
  const history = query.history ?? [];
  const historyBlock = history
    .slice(-6) // last 3 turns (user + assistant)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  if (historyBlock) {
    return `${historyBlock}\nUser: ${query.question}\nAssistant:`;
  }
  return `User: ${query.question}\nAssistant:`;
}

/** SSE-friendly streaming variant. Calls onToken for each chunk. */
export async function answerQuestionStream(
  query: ChatQuery,
  onToken: (token: string) => void,
): Promise<ChatResponse> {
  // For V1 we don't stream from Gemini (would require a different SDK
  // call); instead we answer in one shot and chunk the response. This
  // still gives a "typing" feel without the SDK complexity.
  const result = await answerQuestion(query);
  // Emit the text in ~30 token chunks with tiny delays.
  const tokens = result.text.match(/\S+\s*|\s+/g) ?? [result.text];
  let buf = "";
  for (const tok of tokens) {
    buf += tok;
    if (buf.length > 24 || tok.includes("\n")) {
      onToken(buf);
      buf = "";
      await new Promise((r) => setTimeout(r, 8));
    }
  }
  if (buf) onToken(buf);
  return result;
}