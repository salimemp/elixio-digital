/**
 * Knowledge base indexer. Builds an in-memory vector index from:
 *
 *   1. `apps/api/src/data/kb/*.md` — hand-curated FAQ + feature docs
 *   2. `apps/api/src/data/kb/routes.json` — app route inventory
 *   3. `apps/api/src/data/kb/schema.json` — database schema (Prisma
 *      model names + field lists)
 *
 * Each chunk is embedded with Gemini's `text-embedding-004` and stored
 * with the embedding vector + metadata (source file, section, URL).
 *
 * The index is built at server startup if `KB_BUILD_ON_BOOT=true` (or
 * always in dev). The build is async so it doesn't block startup.
 * Queries fall back to keyword matching if the index isn't ready yet.
 *
 * For production scale (>10k chunks), swap this for pgvector + an
 * incremental update pipeline. The current shape (in-memory array of
 * {id, content, embedding, metadata}) is the same shape pgvector would
 * return.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { embedTexts } from "../lib/gemini.js";
import { logger } from "../lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// apps/api/src/services/chatbot.ts → apps/api/src/data/kb/
const KB_DIR = path.resolve(__dirname, "../data/kb");

export interface KbChunk {
  id: string;
  content: string;
  /** 768-dim embedding vector from text-embedding-004. */
  embedding: number[];
  metadata: {
    source: string; // e.g. "docs/ARCHITECTURE.md", "routes", "schema"
    section?: string;
    title?: string;
    url?: string; // Public URL to send the user to
  };
}

export interface KbIndex {
  chunks: KbChunk[];
  builtAt: Date;
  sourceCount: number;
}

let cachedIndex: KbIndex | null = null;
let buildPromise: Promise<KbIndex> | null = null;

/** Read a Markdown file and split it into chunks (one per ## section). */
function chunkMarkdown(content: string, source: string): Array<{
  content: string;
  metadata: KbChunk["metadata"];
}> {
  const lines = content.split("\n");
  const out: Array<{ content: string; metadata: KbChunk["metadata"] }> = [];

  // File-level preamble (before any ## heading) becomes a single chunk.
  let preamble: string[] = [];
  let currentSection: string | null = null;
  let currentBody: string[] = [];
  let currentTitle: string | null = null;

  const flush = () => {
    if (currentSection !== null && currentBody.length > 0) {
      const body = currentBody.join("\n").trim();
      if (body.length > 30) {
        out.push({
          content: `# ${currentTitle ?? currentSection}\n\n${body}`,
          metadata: {
            source,
            section: currentSection,
            title: currentTitle ?? currentSection,
          },
        });
      }
    } else if (currentSection === null && preamble.length > 0) {
      const pre = preamble.join("\n").trim();
      if (pre.length > 30) {
        out.push({
          content: pre,
          metadata: { source },
        });
      }
    }
    currentBody = [];
    currentTitle = null;
  };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);
    if (h2) {
      flush();
      currentSection = h2[1].trim();
      currentTitle = currentSection;
    } else if (h1) {
      currentTitle = h1[1].trim();
      if (currentSection === null) preamble.push(line);
      else currentBody.push(line);
    } else if (currentSection !== null) {
      currentBody.push(line);
    } else {
      preamble.push(line);
    }
  }
  flush();

  return out;
}

function chunkJsonArray(
  arr: Array<{ title: string; content: string; url?: string; section?: string }>,
  source: string,
): Array<{ content: string; metadata: KbChunk["metadata"] }> {
  return arr
    .filter((x) => x.content && x.content.length > 20)
    .map((x) => ({
      content: `${x.title}\n\n${x.content}`,
      metadata: {
        source,
        section: x.section,
        title: x.title,
        url: x.url,
      },
    }));
}

async function readKbDirectory(): Promise<{
  mdChunks: Array<{ content: string; metadata: KbChunk["metadata"] }>;
  jsonChunks: Array<{ content: string; metadata: KbChunk["metadata"] }>;
  sourceCount: number;
}> {
  const mdChunks: Array<{ content: string; metadata: KbChunk["metadata"] }> = [];
  const jsonChunks: Array<{ content: string; metadata: KbChunk["metadata"] }> = [];
  let sourceCount = 0;

  let entries: string[] = [];
  try {
    entries = await fs.readdir(KB_DIR);
  } catch (e) {
    logger.warn({ err: e }, "[chatbot-kb] KB directory not found, building empty index");
    return { mdChunks, jsonChunks, sourceCount: 0 };
  }

  for (const entry of entries) {
    const full = path.join(KB_DIR, entry);
    if (entry.endsWith(".md")) {
      try {
        const content = await fs.readFile(full, "utf8");
        const chunks = chunkMarkdown(content, `kb/${entry}`);
        mdChunks.push(...chunks);
        sourceCount += 1;
      } catch (e) {
        logger.warn({ err: e, file: entry }, "[chatbot-kb] failed to read markdown file");
      }
    } else if (entry.endsWith(".json")) {
      try {
        const content = await fs.readFile(full, "utf8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const chunks = chunkJsonArray(parsed, `kb/${entry}`);
          jsonChunks.push(...chunks);
          sourceCount += 1;
        } else if (parsed && Array.isArray(parsed.routes)) {
          const chunks = chunkJsonArray(
            parsed.routes.map((r: { path: string; title: string; description: string; section?: string }) => ({
              title: r.title,
              content: `${r.path} — ${r.description}`,
              url: r.path,
              section: r.section ?? "routes",
            })),
            `kb/${entry}`,
          );
          jsonChunks.push(...chunks);
          sourceCount += 1;
        } else if (parsed && Array.isArray(parsed.models)) {
          const chunks = chunkJsonArray(
            parsed.models.map((m: { name: string; description: string; fields?: string[] }) => ({
              title: m.name,
              content: m.fields?.length
                ? `${m.description}\n\nFields: ${m.fields.join(", ")}`
                : m.description,
              section: "schema",
            })),
            `kb/${entry}`,
          );
          jsonChunks.push(...chunks);
          sourceCount += 1;
        }
      } catch (e) {
        logger.warn({ err: e, file: entry }, "[chatbot-kb] failed to read JSON file");
      }
    }
  }

  return { mdChunks, jsonChunks, sourceCount };
}

/**
 * Build the KB index. Cached in-process; safe to call multiple times.
 *
 * If Gemini embeddings aren't configured (no API key), we fall back to
 * a TF-IDF-lite "all-zero vectors" mode where retrieval uses pure
 * keyword matching — still useful for a small KB.
 */
export async function buildKbIndex(opts: { force?: boolean } = {}): Promise<KbIndex> {
  if (cachedIndex && !opts.force) return cachedIndex;
  if (buildPromise && !opts.force) return buildPromise;

  buildPromise = (async () => {
    const start = Date.now();
    const { mdChunks, jsonChunks, sourceCount } = await readKbDirectory();
    const all = [...mdChunks, ...jsonChunks];
    logger.info(
      { markdownChunks: mdChunks.length, jsonChunks: jsonChunks.length, total: all.length, sources: sourceCount },
      "[chatbot-kb] building index",
    );

    if (all.length === 0) {
      cachedIndex = { chunks: [], builtAt: new Date(), sourceCount: 0 };
      return cachedIndex;
    }

    let embeddings: number[][] = [];
    try {
      embeddings = await embedTexts(all.map((c) => c.content));
    } catch (e) {
      logger.warn({ err: e }, "[chatbot-kb] embedding failed, using zero vectors (keyword fallback)");
      embeddings = all.map(() => new Array(768).fill(0));
    }

    const chunks: KbChunk[] = all.map((c, i) => ({
      id: `chunk-${i}`,
      content: c.content,
      embedding: embeddings[i] ?? new Array(768).fill(0),
      metadata: c.metadata,
    }));

    cachedIndex = { chunks, builtAt: new Date(), sourceCount };
    const ms = Date.now() - start;
    logger.info({ chunks: chunks.length, sources: sourceCount, ms }, "[chatbot-kb] index built");
    return cachedIndex;
  })();

  try {
    return await buildPromise;
  } finally {
    buildPromise = null;
  }
}

export function getKbIndex(): KbIndex | null {
  return cachedIndex;
}

/** Test-only: drop the cached index so the next call rebuilds. */
export function _resetKbIndexForTests(): void {
  cachedIndex = null;
  buildPromise = null;
}