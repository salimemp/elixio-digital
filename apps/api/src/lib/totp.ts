import { createHmac, randomBytes } from "node:crypto";

/**
 * RFC 6238 TOTP + RFC 4226 HOTP, minimal implementation.
 * - HMAC-SHA1, 6 digits, 30-second period (the de-facto defaults).
 * - 1-period window on either side (allows ±30s of clock drift).
 *
 * Encoding: the "secret" is a base32 string. We accept it directly
 * and decode here — no extra plugin needed.
 */

const PERIOD = 30;
const DIGITS = 6;
const WINDOW = 1;

function counterFromTimestamp(t: number): bigint {
  return BigInt(Math.floor(t / PERIOD));
}

function hmacSha1(key: Buffer, counter: bigint): Buffer {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(counter);
  return createHmac("sha1", key).update(counterBuf).digest();
}

function dynamicTruncate(hmac: Buffer): number {
  const offset = hmac[hmac.length - 1] & 0x0f;
  return (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  );
}

function hotp(secret: Buffer, counter: bigint): string {
  const code = dynamicTruncate(hmacSha1(secret, counter)) % 10 ** DIGITS;
  return code.toString().padStart(DIGITS, "0");
}

// Base32 (RFC 4648) decoder — accepts both upper- and lowercase, strips
// padding/whitespace.
function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) throw new Error("invalid base32 character in TOTP secret");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

function base32Encode(buf: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += alphabet[(value >> bits) & 0x1f];
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 0x1f];
  while (out.length % 8 !== 0) out += "=";
  return out;
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export function generate(secret: string, timestamp = Date.now()): string {
  return hotp(base32Decode(secret), counterFromTimestamp(timestamp));
}

/** Returns true if the supplied code matches within the window. */
export function check(code: string, secret: string, timestamp = Date.now()): boolean {
  const clean = code.replace(/\s+/g, "");
  if (clean.length !== DIGITS) return false;
  const counter = counterFromTimestamp(timestamp);
  const key = base32Decode(secret);
  for (let i = -WINDOW; i <= WINDOW; i++) {
    if (constantTimeEqual(hotp(key, counter + BigInt(i)), clean)) {
      return true;
    }
  }
  return false;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Build an otpauth:// URI suitable for QR code display. */
export function keyUri(secret: string, accountName: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
