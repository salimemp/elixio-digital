import sharp from "sharp";
// archiver is CJS with no proper default export — use createRequire
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const archiver = require("archiver");
import { PDFDocument } from "pdf-lib";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
// PDF.js for full-fidelity rendering (Apache 2.0 from Mozilla — no AGPL).
// Pairs with @napi-rs/canvas (Skia-backed offscreen canvas) to produce
// PNG/JPEG buffers without needing poppler/ghostscript on the host.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

// Register pdfjs's bundled Liberation Sans fonts with @napi-rs/canvas
// so PDF text falls back to legible glyphs when the source PDF uses
// standard fonts (Helvetica / Times / Courier) without embedding them.
// Idempotent — only runs once per process.
let _fontsRegistered = false;
function registerStandardFonts(): void {
  if (_fontsRegistered) return;
  _fontsRegistered = true;
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const fontsDir = resolve(
      __dirname,
      "../../node_modules/pdfjs-dist/standard_fonts/"
    );
    if (!existsSync(fontsDir)) return;
    for (const file of readdirSync(fontsDir)) {
      if (!file.endsWith(".ttf")) continue;
      // pdfjs ships 4 Liberation Sans variants; register each so all
      // bold/italic combinations render.
      GlobalFonts.registerFromPath(resolve(fontsDir, file), file.replace(".ttf", ""));
    }
  } catch {
    // Non-fatal — PDF still renders shapes + images, text falls back to .notdef
  }
}

export interface PdfToImageInput {
  pdfBuffer: Buffer;
  /** DPI for rasterization. Default 150. */
  dpi?: number;
  /** Output format. Default "png". */
  format?: "png" | "jpeg" | "webp";
  /** Max width per page. Default 2400. */
  maxWidth?: number;
}

export interface PdfToImageOutputPage {
  pageNumber: number;
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}

export interface PdfToImageOutput {
  pages: PdfToImageOutputPage[];
  totalPages: number;
  totalBytes: number;
}

/**
 * Convert each page of a PDF to an image at the requested DPI.
 *
 * Implementation: Mozilla pdfjs-dist (Apache 2.0) parses the PDF and
 * produces a per-page render. We paint that onto a @napi-rs/canvas
 * Skia surface, then export via sharp. No system poppler/ghostscript
 * needed — works cleanly on Railway's alpine base image.
 *
 * Why not MuPDF.js? The official mupdf npm package is AGPL-3.0, which
 * would require open-sourcing the entire SaaS under AGPL. pdfjs-dist is
 * Apache 2.0 from Mozilla and gives us essentially the same fidelity for
 * rasterization use cases (no OCR / advanced editing — those still want
 * MuPDF with a commercial license if/when we need them).
 */
export async function pdfToImages(
  input: PdfToImageInput
): Promise<PdfToImageOutput> {
  const format = input.format ?? "png";
  const targetDpi = input.dpi ?? 150;
  const maxWidth = input.maxWidth ?? 2400;
  // pdfjs render scale: device-pixel-ratio; PDF points are 72dpi base.
  const scale = Math.min(4, Math.max(0.5, targetDpi / 72));
  const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";

  // Register Liberation Sans with @napi-rs/canvas so pdfjs finds it via
  // the canvas font API. Combined with useSystemFonts=true, this gives
  // us proper text rendering for PDFs that reference standard fonts
  // (Helvetica / Times / Courier) without embedding them.
  registerStandardFonts();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(input.pdfBuffer),
    disableFontFace: false, // let pdfjs use canvas font lookup
    useSystemFonts: true, // query registered fonts
  });
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;
  const pages: PdfToImageOutputPage[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    // 1) Native viewport at scale=1 (in CSS pixels at 72dpi)
    const baseViewport = page.getViewport({ scale: 1 });
    const intrinsicW = baseViewport.width;
    // 2) Apply scale + maxWidth clamp
    let renderScale = scale;
    if (intrinsicW * renderScale > maxWidth) {
      renderScale = maxWidth / intrinsicW;
    }
    const viewport = page.getViewport({ scale: renderScale });
    const w = Math.ceil(viewport.width);
    const h = Math.ceil(viewport.height);

    // 3) Create offscreen canvas at the render size
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    // Paint white background (PDFs with transparency show as black otherwise)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // 4) Render the PDF page onto the canvas. pdfjs uses the standard
    //    CanvasRenderingContext2D API which our @napi-rs/canvas ctx satisfies.
    //    We pass `canvas` (the HTMLCanvasElement-like surface) so pdfjs
    //    allocates any internal pattern/shading surfaces through our
    //    @napi-rs/canvas instance too.
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    }).promise;

    // 5) Encode via sharp (handles png/jpeg/webp compression)
    const rawPng = canvas.toBuffer("image/png");
    let out: Buffer;
    let finalW = w;
    let finalH = h;
    if (mime === "image/png") {
      out = rawPng;
    } else if (mime === "image/jpeg") {
      out = await sharp(rawPng).jpeg({ quality: 88 }).toBuffer();
    } else {
      out = await sharp(rawPng).webp({ quality: 88 }).toBuffer();
    }

    pages.push({
      pageNumber: i,
      buffer: out,
      width: finalW,
      height: finalH,
      format,
      sizeBytes: out.length,
    });

    // Free per-page memory
    page.cleanup();
  }

  await doc.cleanup();

  return {
    pages,
    totalPages,
    totalBytes: pages.reduce((s, p) => s + p.sizeBytes, 0),
  };
}

export interface BundleZipInput {
  files: Array<{
    /** Filename inside the zip, including path. */
    name: string;
    buffer: Buffer;
  }>;
  /** Zip-level comment, optional. */
  comment?: string;
}

/**
 * Bundle multiple files into a single zip. Returns the zip buffer.
 * Used by creators to package their assets into one downloadable
 * bundle after upload.
 */
export async function bundleZip(input: BundleZipInput): Promise<{
  buffer: Buffer;
  fileCount: number;
  sizeBytes: number;
}> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });
    if (input.comment) archive.append(input.comment, { name: "README.txt" });
    for (const f of input.files) {
      archive.append(f.buffer, { name: f.name });
    }
    archive.on("data", (c: Buffer) => chunks.push(c));
    archive.on("warning", (e: Error) => reject(e));
    archive.on("error", (e: Error) => reject(e));
    archive.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer,
        fileCount: input.files.length,
        sizeBytes: buffer.length,
      });
    });
    archive.finalize().catch(reject);
  });
}

export interface ThumbnailInput {
  buffer: Buffer;
  /** Output width in pixels. Default 600. */
  width?: number;
  /** Output format. Default "webp" for size. */
  format?: "webp" | "jpeg" | "png";
}

/**
 * Generate a thumbnail from an uploaded image. Returns the resized
 * buffer. Used for cover images on asset listings.
 */
export async function makeThumbnail(input: ThumbnailInput): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}> {
  const format = input.format ?? "webp";
  const width = input.width ?? 600;
  const img = sharp(input.buffer).resize(width, null, { withoutEnlargement: true });
  let pipeline;
  if (format === "webp") pipeline = img.webp({ quality: 80 });
  else if (format === "jpeg") pipeline = img.jpeg({ quality: 85 });
  else pipeline = img.png({ compressionLevel: 9 });
  const buffer = await pipeline.toBuffer();
  const meta = await sharp(buffer).metadata();
  return {
    buffer,
    width: meta.width ?? width,
    height: meta.height ?? 0,
    format,
    sizeBytes: buffer.length,
  };
}

export interface MetadataExtractInput {
  buffer: Buffer;
  /** Mime type of the buffer. */
  mimeType: string;
  /** Optional original filename. */
  filename?: string;
}

export interface ExtractedMetadata {
  width?: number;
  height?: number;
  format?: string;
  pages?: number;
  fileSize: number;
  /** Detected dominant color in hex (e.g. "#3a82f6"). */
  dominantColor?: string;
  /** Has alpha channel. */
  hasAlpha?: boolean;
}

/**
 * Extract metadata from an uploaded file. Image formats are
 * inspected via sharp; PDFs via pdf-lib page count.
 */
export async function extractMetadata(
  input: MetadataExtractInput
): Promise<ExtractedMetadata> {
  const base: ExtractedMetadata = { fileSize: input.buffer.length };
  try {
    if (input.mimeType.startsWith("image/")) {
      const meta = await sharp(input.buffer).metadata();
      const stats = await sharp(input.buffer).stats();
      const dom = stats.dominant;
      const hex = `#${[dom.r, dom.g, dom.b]
        .map((c) => Math.round(c).toString(16).padStart(2, "0"))
        .join("")}`;
      return {
        ...base,
        width: meta.width,
        height: meta.height,
        format: meta.format,
        hasAlpha: meta.hasAlpha,
        dominantColor: hex,
      };
    }
    if (input.mimeType === "application/pdf") {
      const pdf = await PDFDocument.load(input.buffer);
      return { ...base, format: "pdf", pages: pdf.getPageCount() };
    }
  } catch {
    // ignore — return base only
  }
  return base;
}