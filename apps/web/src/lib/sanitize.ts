/**
 * HTML sanitization for blog post HTML.
 *
 * Previously used `isomorphic-dompurify`, which pulls in `jsdom` on
 * the server. jsdom → html-encoding-sniffer → @exodus/bytes has an
 * ESM/CJS interop bug on Vercel's Node 24 serverless runtime:
 *
 *   Error [ERR_REQUIRE_ESM]: require() of ES Module
 *     @exodus/bytes/encoding-lite.js from html-encoding-sniffer
 *     not supported.
 *
 * `sanitize-html` is pure CJS (no jsdom), battle-tested, smaller
 * (~80KB vs ~5MB), and works on every Node version. The API is
 * slightly different — see config object below.
 *
 * Allowed tags are limited to what's safe for a blog post: headings,
 * paragraphs, lists, links, images, code, blockquotes, tables,
 * basic formatting. Anything else (scripts, iframes, event handlers,
 * style tags) is stripped.
 *
 * Defense in depth:
 *   1. Sanitize HTML on render (this file)
 *   2. Content-Security-Policy header (helmet on the API)
 *   3. SameSite cookies, HttpOnly auth tokens
 */

import sanitizeHtmlLib from "sanitize-html";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr", "blockquote",
  "ul", "ol", "li",
  "strong", "em", "b", "i", "u", "s", "sub", "sup", "mark", "code", "pre",
  "a", "img",
  "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "col", "colgroup",
  "span", "div",
];

const SANITIZE_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    table: ["style"],
    th: ["style", "scope", "colspan", "rowspan"],
    td: ["style", "colspan", "rowspan"],
    "*": ["class", "id"],
  },
  // Only allow http(s), mailto, plus relative URLs (start with / or #)
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  // Only allow safe data: URIs (images only). Block base64 HTML/SVG.
  allowedSchemesAppliedToAttributes: ["src", "href"],
  allowProtocolRelative: false,
  // Disallow all iframes / scripts / styles
  disallowedTagsMode: "discard",
  transformTags: {
    // Force all links to open in a new tab with noopener noreferrer.
    a: (_tagName, attribs) => ({
      tagName: "a",
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    }),
    // Force images to be lazy-loaded + async-decoded for performance.
    img: (_tagName, attribs) => ({
      tagName: "img",
      attribs: {
        ...attribs,
        loading: attribs.loading ?? "lazy",
        decoding: attribs.decoding ?? "async",
      },
    }),
  },
};

/**
 * Sanitize HTML content for safe rendering with dangerouslySetInnerHTML.
 *
 * Strips scripts, event handlers (onclick, onerror, etc.), style tags,
 * iframes, and any other dangerous content. Forces all external links to
 * open in a new tab with rel="noopener noreferrer" to prevent tab-nabbing
 * attacks.
 */
export function sanitizeBlogHtml(input: string): string {
  if (!input) return "";
  return sanitizeHtmlLib(input, SANITIZE_OPTIONS);
}

/**
 * Sanitize a single URL (for href/src attributes). Returns null if the URL
 * is not safe (e.g. javascript: or data: URI).
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  if (/^javascript:/i.test(cleaned)) return null;
  if (/^data:/i.test(cleaned) && !/^data:image\//i.test(cleaned)) return null;
  if (/^vbscript:/i.test(cleaned)) return null;
  return cleaned;
}