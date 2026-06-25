/**
 * Envelope encryption for secrets at rest (TOTP seeds, OAuth tokens).
 *
 * Each encrypted value is stored as: <version>:<iv_b64>:<ciphertext_b64>:<tag_b64>
 * - AES-256-GCM
 * - 12-byte random IV per encryption
 * - KEK comes from env (ELIXIO_MFA_KEY_ENCRYPTION_KEY), 32 bytes base64.
 *
 * Loss of the KEK = loss of every encrypted value. Back it up.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const VERSION = "v1";
const ALG = "aes-256-gcm";
const IV_BYTES = 12;
const KEK_BYTES = 32;

let kekBuf: Buffer | null = null;
function getKek(): Buffer {
  if (kekBuf) return kekBuf;
  const raw = env.ELIXIO_MFA_KEY_ENCRYPTION_KEY;
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEK_BYTES) {
    throw new Error(
      `ELIXIO_MFA_KEY_ENCRYPTION_KEY must decode to ${KEK_BYTES} bytes (got ${buf.length})`
    );
  }
  kekBuf = buf;
  return kekBuf;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, getKek(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

export function decrypt(envelope: string): string {
  const parts = envelope.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("invalid or unsupported encryption envelope");
  }
  const iv = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  const decipher = createDecipheriv(ALG, getKek(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function safeDecryptOrNull(envelope: string | null | undefined): string | null {
  if (!envelope) return null;
  try {
    return decrypt(envelope);
  } catch {
    return null;
  }
}
