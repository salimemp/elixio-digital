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

  // Cloudflare R2 (S3-compatible object storage for asset files +
  // media). Free egress is the big cost win vs S3. Leave all four
  // blank in dev — the storage service degrades gracefully to a
  // placeholder mode where uploads return 503 and downloads return
  // a metadata-only stub.
  //
  // Set these in Railway dashboard when wiring real storage:
  //   CLOUDFLARE_R2_ACCOUNT_ID     — from R2 dashboard sidebar
  //   CLOUDFLARE_R2_ACCESS_KEY_ID  — from API token
  //   CLOUDFLARE_R2_SECRET_ACCESS_KEY
  //   CLOUDFLARE_R2_BUCKET         — e.g. "elixio-assets-prod"
  //   CLOUDFLARE_R2_PUBLIC_URL     — optional custom CDN domain
  //                                  (e.g. assets.elixiodigital.com);
  //                                  when set, public files use this URL
  //                                  instead of the r2.cloudflarestorage.com
  //                                  endpoint.
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().default(""),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().default(""),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().default(""),
  CLOUDFLARE_R2_BUCKET: z.string().default(""),
  CLOUDFLARE_R2_PUBLIC_URL: z
    .string()
    .default("")
    .transform((s) => (s.trim() === "" ? "" : s))
    .pipe(z.string().url().or(z.literal(""))),
});

export const env = envSchema.parse(process.env);

export const webauthnOrigins = env.ELIXIO_WEBAUTHN_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export type Env = z.infer<typeof envSchema>;
