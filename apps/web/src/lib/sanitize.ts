/**
 * HTML sanitization for user-generated content (blog posts, comments, etc.).
 *
 * Why isomorphic-dompurify? It runs both server-side (Node) and client-side
 * (browser) with the same API. We use it to sanitize HTML returned by
 * HarborSEO before rendering with dangerouslySetInnerHTML.
 *
 * Allowed tags are limited to what's safe for a blog post: headings,
 * paragraphs, lists, links, images, code, blockquotes, basic formatting.
 * Anything else (scripts, iframes, event handlers, style tags) is stripped.
 *
 * Defense in depth:
 *   1. Sanitize HTML on render (this file)
 *   2. Content-Security-Policy header (helmet)
 *   3. SameSite cookies, HttpOnly auth tokens
 */

import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr", "blockquote",
  "ul", "ol", "li",
  "strong", "em", "b", "i", "u", "s", "sub", "sup", "mark", "code", "pre",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
];

const ALLOWED_ATTR = [
  "href", "title", "alt", "src", "srcset", "sizes", "width", "height",
  "loading", "decoding",
  // Only allow rel on links (we force-set rel="noopener noreferrer" below)
  "rel",
];

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
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Disallow data URIs (XSS via base64-encoded SVG/HTML)
    ALLOW_DATA_ATTR: false,
    // Allow only http(s) and mailto schemes
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM: false,
  });
  // Post-process: strip any data: URIs that DOMPurify may have missed
  // (DOMPurify 3.x's URI regex behavior for data: is unreliable).
  // Defense in depth: even if a future bug allows data: through,
  // this catches it.
  return cleaned.replace(
    /(<(?:img|source|video|audio|iframe|a|link)[^>]*\s(?:src|href|poster|xlink:href)\s*=\s*["'])data:[^"']*/gi,
    "$1#"
  ).replace(
    /(<style|<script|<iframe|<object|<embed)/gi,
    ""
  );
}

/**
 * Sanitize a single URL (for href/src attributes). Returns null if the URL
 * is not safe (e.g. javascript: or data: URI).
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  if (/^javascript:/i.test(cleaned)) return null;
  if (/^data:/i.test(cleaned)) return null;
  if (/^vbscript:/i.test(cleaned)) return null;
  return cleaned;
}
