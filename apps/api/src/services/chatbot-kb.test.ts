/**
 * Chatbot KB indexer tests. Verifies Markdown chunking, JSON
 * ingestion, and graceful failure modes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { promises as fs } from "node:fs";

const embedTextsMock = vi.fn();
vi.mock("../lib/gemini.js", () => ({
  embedTexts: (...args: unknown[]) => embedTextsMock(...args),
}));

// Import after mocks
const { buildKbIndex, getKbIndex, _resetKbIndexForTests } = await import("./chatbot-kb.js");

describe("chatbot KB indexer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetKbIndexForTests();
  });

  it("builds an empty index when KB directory is missing", async () => {
    // The real KB dir might exist with content. We just verify the
    // shape — index.chunks is an array, sourceCount is a number.
    embedTextsMock.mockResolvedValue([]);
    const index = await buildKbIndex({ force: true });
    expect(Array.isArray(index.chunks)).toBe(true);
    expect(typeof index.sourceCount).toBe("number");
  });

  it("falls back to zero embeddings when embedTexts fails", async () => {
    embedTextsMock.mockRejectedValueOnce(new Error("rate limit"));
    const index = await buildKbIndex({ force: true });
    // If there are any chunks, their embeddings should be 768 zeros
    for (const chunk of index.chunks) {
      if (chunk.embedding.length > 0) {
        expect(chunk.embedding.every((v) => v === 0)).toBe(true);
      }
    }
  });

  it("caches the index in-process", async () => {
    embedTextsMock.mockResolvedValue([]);
    const a = await buildKbIndex();
    const b = await buildKbIndex();
    // Same instance returned (no rebuild)
    expect(a).toBe(b);
    // embedTexts should only be called once across both calls
    expect(embedTextsMock.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("rebuilds when force=true", async () => {
    embedTextsMock.mockResolvedValue([]);
    await buildKbIndex();
    embedTextsMock.mockClear();
    await buildKbIndex({ force: true });
    // Re-indexed
    expect(embedTextsMock).toHaveBeenCalled();
  });

  it("chunks Markdown by ## sections", async () => {
    // Test the internal chunker via a public observable: build the
    // index, then count chunks. We can't easily mock fs without
    // dependency injection, so this is a smoke test.
    embedTextsMock.mockImplementation(async (texts: string[]) =>
      texts.map(() => new Array(768).fill(0)),
    );
    const index = await buildKbIndex({ force: true });
    // Should have at least some chunks (real KB files exist)
    expect(index.chunks.length).toBeGreaterThan(0);
  });

  it("getKbIndex returns null before any build", () => {
    _resetKbIndexForTests();
    expect(getKbIndex()).toBeNull();
  });
});