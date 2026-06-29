/**
 * Chatbot service tests. Test the retrieval + response shape in
 * isolation from the Gemini API (mocked).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock gemini BEFORE importing the service
const generateMock = vi.fn();
const embedTextMock = vi.fn();
const embedTextsMock = vi.fn();
vi.mock("../lib/gemini.js", () => ({
  generate: (...args: unknown[]) => generateMock(...args),
  embedText: (...args: unknown[]) => embedTextMock(...args),
  embedTexts: (...args: unknown[]) => embedTextsMock(...args),
}));

// Mock the KB indexer so we can inject a fake index
const getKbIndexMock = vi.fn();
const buildKbIndexMock = vi.fn();
vi.mock("./chatbot-kb.js", () => ({
  getKbIndex: () => getKbIndexMock(),
  buildKbIndex: (...args: unknown[]) => buildKbIndexMock(...args),
  KbChunk: class {},
}));

const { answerQuestion, retrieveChunks } = await import("./chatbot.js");

interface FakeChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: { source: string; title?: string; url?: string; section?: string };
}

function vec(n: number): number[] {
  return new Array(768).fill(0).map((_, i) => (i === 0 ? n : 0));
}

describe("retrieveChunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns chunks sorted by similarity", async () => {
    const chunks: FakeChunk[] = [
      { id: "0", content: "Pricing is 10% commission.", embedding: vec(0.9), metadata: { source: "pricing.md" } },
      { id: "1", content: "Refunds within 7 days.", embedding: vec(0.5), metadata: { source: "refunds.md" } },
      { id: "2", content: "Languages supported.", embedding: vec(0.1), metadata: { source: "faq.md" } },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 3 });
    embedTextMock.mockResolvedValueOnce(vec(1.0));

    const result = await retrieveChunks("How much is the commission?");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.chunk.id).toBe("0"); // highest sim
  });

  it("builds the index if not cached", async () => {
    getKbIndexMock.mockReturnValue(null);
    buildKbIndexMock.mockResolvedValue({
      chunks: [
        { id: "0", content: "test", embedding: vec(0.8), metadata: { source: "x" } },
      ],
      sourceCount: 1,
    });
    embedTextMock.mockResolvedValueOnce(vec(1.0));

    const result = await retrieveChunks("test query");
    expect(buildKbIndexMock).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("falls back to keyword matching when embeddings fail", async () => {
    const chunks: FakeChunk[] = [
      { id: "0", content: "refund policy refund refund refund", embedding: vec(0.5), metadata: { source: "refund" } },
      { id: "1", content: "weather is nice today", embedding: vec(0.5), metadata: { source: "weather" } },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 2 });
    embedTextMock.mockRejectedValueOnce(new Error("embed failed"));

    const result = await retrieveChunks("refund");
    expect(result[0]?.chunk.id).toBe("0");
  });

  it("returns empty array for empty index", async () => {
    getKbIndexMock.mockReturnValue({ chunks: [], sourceCount: 0 });
    const result = await retrieveChunks("anything");
    expect(result).toEqual([]);
  });
});

describe("answerQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a fallback message when no relevant chunks found", async () => {
    const chunks: FakeChunk[] = [
      { id: "0", content: "weather is nice", embedding: vec(0.0), metadata: { source: "x" } },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 1 });
    embedTextMock.mockResolvedValueOnce(vec(0.0));
    generateMock.mockResolvedValueOnce({ text: "I don't know.", record: { modelName: "x", tokensIn: 0, tokensOut: 0, costUsd: 0 } });

    const result = await answerQuestion({ question: "what is the meaning of life?" });
    expect(result.fallback).toBe(true);
    expect(result.sources).toEqual([]);
  });

  it("includes sources in the response when chunks are relevant", async () => {
    const chunks: FakeChunk[] = [
      {
        id: "0",
        content: "Creators keep 90% of each sale. Elixio takes 10%.",
        embedding: vec(1.0),
        metadata: {
          source: "pricing.md",
          title: "Pricing",
          url: "/docs/pricing",
        },
      },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 1 });
    embedTextMock.mockResolvedValueOnce(vec(1.0));
    generateMock.mockResolvedValueOnce({
      text: "Creators keep 90% of each sale.",
      record: { modelName: "gemini-2.5-flash", tokensIn: 100, tokensOut: 50, costUsd: 0 },
    });

    const result = await answerQuestion({ question: "How much do creators keep?" });
    expect(result.fallback).toBe(false);
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.title).toBe("Pricing");
    expect(result.sources[0]?.url).toBe("/docs/pricing");
    expect(result.text).toContain("90%");
  });

  it("passes locale to the generation prompt", async () => {
    const chunks: FakeChunk[] = [
      { id: "0", content: "Bienvenue", embedding: vec(1.0), metadata: { source: "x" } },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 1 });
    embedTextMock.mockResolvedValueOnce(vec(1.0));
    generateMock.mockResolvedValueOnce({
      text: "Bonjour!",
      record: { modelName: "x", tokensIn: 0, tokensOut: 0, costUsd: 0 },
    });

    await answerQuestion({ question: "Salut", locale: "fr" });
    const systemPrompt = generateMock.mock.calls[0][0];
    expect(systemPrompt).toContain("French");
  });

  it("gracefully degrades when generation fails (returns top excerpt)", async () => {
    const chunks: FakeChunk[] = [
      {
        id: "0",
        content: "Refund policy: full refund within 7 days.",
        embedding: vec(1.0),
        metadata: { source: "refund.md", title: "Refunds" },
      },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 1 });
    embedTextMock.mockResolvedValueOnce(vec(1.0));
    generateMock.mockRejectedValueOnce(new Error("Gemini 503"));

    const result = await answerQuestion({ question: "How do refunds work?" });
    expect(result.fallback).toBe(false);
    expect(result.text).toContain("Refund policy");
    expect(result.sources).toHaveLength(1);
  });

  it("handles empty question gracefully", async () => {
    getKbIndexMock.mockReturnValue({ chunks: [], sourceCount: 0 });
    const result = await answerQuestion({ question: "" });
    // No chunks → fallback. Should not throw.
    expect(result.fallback).toBe(true);
  });
});

describe("history threading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes history to the prompt", async () => {
    const chunks: FakeChunk[] = [
      { id: "0", content: "Yes, creators can sell templates.", embedding: vec(1.0), metadata: { source: "x" } },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 1 });
    embedTextMock.mockResolvedValueOnce(vec(1.0));
    generateMock.mockResolvedValueOnce({
      text: "Yes.",
      record: { modelName: "x", tokensIn: 0, tokensOut: 0, costUsd: 0 },
    });

    await answerQuestion({
      question: "What about templates?",
      history: [
        { role: "user", content: "Can I sell on Elixio?" },
        { role: "assistant", content: "Yes, anyone can become a creator." },
      ],
    });

    const userPrompt = generateMock.mock.calls[0][1];
    expect(userPrompt).toContain("Can I sell on Elixio?");
    expect(userPrompt).toContain("What about templates?");
  });
});
describe("Aura branding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("system prompt identifies the assistant as Aura", async () => {
    const chunks: FakeChunk[] = [
      { id: "0", content: "test", embedding: vec(1.0), metadata: { source: "x" } },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 1 });
    embedTextMock.mockResolvedValueOnce(vec(1.0));
    generateMock.mockResolvedValueOnce({
      text: "Hi!",
      record: { modelName: "x", tokensIn: 0, tokensOut: 0, costUsd: 0 },
    });

    await answerQuestion({ question: "Hello", locale: "en" });
    const systemPrompt = generateMock.mock.calls[0][0];
    expect(systemPrompt).toContain("Aura");
  });

  it("system prompt uses localized greeting for the user's language", async () => {
    const chunks: FakeChunk[] = [
      { id: "0", content: "test", embedding: vec(1.0), metadata: { source: "x" } },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 1 });
    embedTextMock.mockResolvedValueOnce(vec(1.0));
    generateMock.mockResolvedValueOnce({
      text: "Bonjour",
      record: { modelName: "x", tokensIn: 0, tokensOut: 0, costUsd: 0 },
    });

    await answerQuestion({ question: "Salut", locale: "fr" });
    const systemPrompt = generateMock.mock.calls[0][0];
    // French greeting should mention "Aura" and French words
    expect(systemPrompt).toContain("Aura");
    expect(systemPrompt).toMatch(/French/i);
  });

  it("system prompt includes localized fallback message", async () => {
    // No relevant chunks
    const chunks: FakeChunk[] = [
      { id: "0", content: "unrelated", embedding: vec(0.0), metadata: { source: "x" } },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 1 });
    embedTextMock.mockResolvedValueOnce(vec(0.0));
    generateMock.mockResolvedValueOnce({
      text: "I don't know.",
      record: { modelName: "x", tokensIn: 0, tokensOut: 0, costUsd: 0 },
    });

    await answerQuestion({ question: "what?", locale: "es" });
    const systemPrompt = generateMock.mock.calls[0][0];
    expect(systemPrompt).toContain("Aura");
    // The Spanish fallback string should be in the prompt
    expect(systemPrompt).toMatch(/docs|ayuda|seguro/i);
  });

  it("system prompt mentions Aura is for Elixio", async () => {
    const chunks: FakeChunk[] = [
      { id: "0", content: "test", embedding: vec(1.0), metadata: { source: "x" } },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 1 });
    embedTextMock.mockResolvedValueOnce(vec(1.0));
    generateMock.mockResolvedValueOnce({
      text: "Hi",
      record: { modelName: "x", tokensIn: 0, tokensOut: 0, costUsd: 0 },
    });

    await answerQuestion({ question: "Hi", locale: "en" });
    const systemPrompt = generateMock.mock.calls[0][0];
    expect(systemPrompt).toContain("Elixio");
  });

  it("supports RTL locales (Arabic, Hebrew, Urdu) in prompt construction", async () => {
    const chunks: FakeChunk[] = [
      { id: "0", content: "test", embedding: vec(1.0), metadata: { source: "x" } },
    ];
    getKbIndexMock.mockReturnValue({ chunks, sourceCount: 1 });
    embedTextMock.mockResolvedValueOnce(vec(1.0));
    generateMock.mockResolvedValueOnce({
      text: "مرحبا",
      record: { modelName: "x", tokensIn: 0, tokensOut: 0, costUsd: 0 },
    });

    await answerQuestion({ question: "مرحبا", locale: "ar" });
    const systemPrompt = generateMock.mock.calls[0][0];
    expect(systemPrompt).toContain("Aura");
    // Arabic greeting contains "Aura" in Arabic script
    expect(systemPrompt).toContain("أورا");
  });
});
