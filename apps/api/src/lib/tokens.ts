import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/** Random URL-safe base64 string with N bytes of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Constant-time hex comparison of two strings. */
export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256B64Url(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

/** 10-char alphanumeric backup code (Crockford-style — no I/L/O/0/1). */
/**
 * Generate a backup code using rejection sampling to avoid modulo bias.
 *
 * Naive: `alphabet[bytes[i] % alphabet.length]` produces biased output
 * because 256 is not evenly divisible by 32 (the alphabet size). Each
 * character would have a slightly different probability. For an attacker
 * who knows the bias, this could reduce the effective entropy of the code.
 *
 * Rejection sampling: throw away bytes >= 224 (= 7 * 32) since they would
 * otherwise wrap and bias the result. This makes each character equally
 * likely at the cost of occasionally consuming an extra byte.
 */
export function generateBackupCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const ALPHABET_SIZE = 32; // must be a power of 2 for clean rejection
  // Since 32 does not divide 256, we use threshold 32 * 8 = 256. That's too high.
  // Use 32 * 7 = 224 instead (common pattern: largest multiple of N <= 256).
  const THRESHOLD = ALPHABET_SIZE * 7; // 224 — bytes >= 224 are rejected
  
  const out: string[] = [];
  while (out.length < 10) {
    const bytes = randomBytes(10);
    for (const byte of bytes) {
      if (byte < THRESHOLD && out.length < 10) {
        out.push(alphabet[byte % ALPHABET_SIZE]);
      }
    }
  }
  return `${out.slice(0, 5).join("")}-${out.slice(5).join("")}`;
}

export function formatBackupCodes(codes: string[]): string[] {
  return codes;
}
