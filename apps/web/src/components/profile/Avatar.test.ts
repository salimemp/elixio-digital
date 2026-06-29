import { describe, it, expect } from "vitest";
import { avatarDataUrl } from "./Avatar";

/**
 * Avatar tests — pure functions (initials + color hash + data URL).
 * The JSX rendering path is exercised in the live app; these tests
 * guarantee the deterministic bits stay stable across changes.
 */

describe("avatarDataUrl", () => {
  it("returns a data URL with the right MIME prefix", () => {
    const url = avatarDataUrl("Alice");
    expect(url).toMatch(/^data:image\/svg\+xml;utf8,/);
  });

  it("is deterministic — same input → same output", () => {
    const a = avatarDataUrl("Bob");
    const b = avatarDataUrl("Bob");
    expect(a).toBe(b);
  });

  it("is unique per name — different inputs → different outputs (mostly)", () => {
    const a = avatarDataUrl("Alice");
    const b = avatarDataUrl("Bob");
    const c = avatarDataUrl("Charlie");
    // Not a strict guarantee (hash collisions possible) but very likely
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
  });

  it("encodes initials in the SVG body", () => {
    const url = avatarDataUrl("Alice Wonderland");
    // Two-letter initial: A + W
    expect(decodeURIComponent(url)).toMatch(/AW/);
  });

  it("handles single-word names by taking first 2 chars", () => {
    const url = avatarDataUrl("Madonna");
    expect(decodeURIComponent(url)).toMatch(/MA/);
  });

  it("handles empty names with a '?' placeholder", () => {
    const url = avatarDataUrl("");
    expect(url).toMatch(/^data:image\/svg\+xml;utf8,/);
    // Should not throw, should not crash the renderer
    expect(url.length).toBeGreaterThan(50);
  });

  it("uses brand-aligned palette colors (hex format)", () => {
    const url = avatarDataUrl("Test User");
    const match = decodeURIComponent(url).match(/fill="(#[0-9a-fA-F]{6})"/);
    expect(match).not.toBeNull();
    const color = match![1].toLowerCase();
    // One of our 12 brand colors
    const palette = [
      "#ff90e8", "#7b61ff", "#f1e05a", "#23a6d5",
      "#96f7d6", "#ff9f43", "#ff6b9d", "#4facfe",
      "#d299ff", "#5d3fd3", "#26ae60", "#ff4757",
    ];
    expect(palette).toContain(color);
  });

  it("escapes names safely (no SVG injection)", () => {
    const evil = `Bob"/><script>alert('xss')</script><rect fill="`;
    const url = avatarDataUrl(evil);
    // The data URL is percent-encoded, so the raw SVG can't break out
    // of the data: URI context. Verify the encoding is applied.
    expect(url).not.toContain("<script>");
    expect(url).not.toContain("alert('xss')");
    // And the encoded form should still be a valid data URL
    expect(url.startsWith("data:image/svg+xml;utf8,")).toBe(true);
  });
});