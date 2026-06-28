import { describe, it, expect } from "vitest";
import { sanitizeBlogHtml, sanitizeUrl } from "./sanitize.js";

describe("sanitizeBlogHtml", () => {
  it("preserves safe tags (h2, p, a, strong)", () => {
    const html = "<h2>Hello</h2><p>This is <strong>bold</strong>.</p>";
    const out = sanitizeBlogHtml(html);
    expect(out).toContain("<h2>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("This is");
  });

  it("strips script tags entirely", () => {
    const html = '<p>Before</p><script>alert("XSS")</script><p>After</p>';
    const out = sanitizeBlogHtml(html);
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("alert(");
    expect(out).toContain("Before");
    expect(out).toContain("After");
  });

  it("strips event handlers from any tag", () => {
    const html = '<p onclick="alert(\'XSS\')" onerror="alert(1)">Click me</p>';
    const out = sanitizeBlogHtml(html);
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("onerror");
    expect(out).toContain("Click me");
  });

  it("strips javascript: URIs from href", () => {
    const html = '<a href="javascript:alert(\'XSS\')">click</a>';
    const out = sanitizeBlogHtml(html);
    expect(out.toLowerCase()).not.toContain("javascript:");
  });

  it("strips data: URIs from src", () => {
    const html = '<img src="data:image/svg+xml;base64,PHN2Zz4=">';
    const out = sanitizeBlogHtml(html);
    // DOMPurify may strip the entire img tag or just the data URI
    expect(out.toLowerCase()).not.toMatch(/data:image\/svg/);
  });

  it("strips iframe tags", () => {
    const html = '<iframe src="https://evil.com"></iframe>';
    const out = sanitizeBlogHtml(html);
    expect(out).not.toContain("<iframe");
  });

  it("strips style tags (potential CSS injection)", () => {
    const html = '<style>body { display: none }</style><p>Visible</p>';
    const out = sanitizeBlogHtml(html);
    expect(out).not.toContain("<style");
    expect(out).toContain("Visible");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeBlogHtml("")).toBe("");
  });

  it("preserves https:// links", () => {
    const html = '<a href="https://example.com">Link</a>';
    const out = sanitizeBlogHtml(html);
    expect(out).toContain('href="https://example.com"');
  });

  it("preserves mailto: links", () => {
    const html = '<a href="mailto:hi@example.com">Email</a>';
    const out = sanitizeBlogHtml(html);
    expect(out).toContain("mailto:hi@example.com");
  });

  it("strips object/embed tags", () => {
    const html = '<object data="evil.swf"></object><embed src="evil.swf">';
    const out = sanitizeBlogHtml(html);
    expect(out).not.toContain("<object");
    expect(out).not.toContain("<embed");
  });

  it("strips base64-encoded data URIs (defense in depth)", () => {
    const html = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">click</a>';
    const out = sanitizeBlogHtml(html);
    expect(out.toLowerCase()).not.toContain("data:text/html");
  });
});

describe("sanitizeUrl", () => {
  it("accepts https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("accepts mailto URLs", () => {
    expect(sanitizeUrl("mailto:hi@example.com")).toBe("mailto:hi@example.com");
  });

  it("rejects javascript: URIs", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects data: URIs", () => {
    expect(sanitizeUrl("data:text/html,<script>")).toBeNull();
  });

  it("rejects vbscript: URIs", () => {
    expect(sanitizeUrl("vbscript:msgbox")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(sanitizeUrl("")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com");
  });
});
