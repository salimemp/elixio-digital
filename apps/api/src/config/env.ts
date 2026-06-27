import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000").transform((value) => Number.parseInt(value, 10)),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // E2E encryption KEK — base64-encoded 32 bytes. Used to wrap TOTP
  // secrets and OAuth tokens at rest. Loss of this key = loss of those
  // secrets; rotate via re-encryption job, not in-place.
  ELIXIO_MFA_KEY_ENCRYPTION_KEY: z.string().min(40, "must be 32-byte base64 (44 chars)"),

  // Resend
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("Elixio Digital <no-reply@elixiodigital.com>"),

  // Public URLs (used in email links + OAuth callback config)
  ELIXIO_API_URL: z.string().url().default("http://localhost:3000"),
  ELIXIO_WEB_URL: z.string().url().default("http://localhost:3001"),
  ELIXIO_MOBILE_URL: z.string().default("elixio://"),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),

  // WebAuthn (passkeys)
  ELIXIO_WEBAUTHN_RP_ID: z.string().default("localhost"),
  ELIXIO_WEBAUTHN_ORIGINS: z.string().default("http://localhost:3001"),

  // Gemini — creator AI (listing copywriter, asset critique, sales coach)
  GEMINI_API_KEY: z.string().default(""),
});

export const env = envSchema.parse(process.env);

export const webauthnOrigins = env.ELIXIO_WEBAUTHN_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export type Env = z.infer<typeof envSchema>;
