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
export function generateBackupCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

export function formatBackupCodes(codes: string[]): string[] {
  return codes;
}
