/**
 * Cloudflare R2 storage service.
 *
 * Wraps the AWS SDK v3 S3 client (R2 is S3-compatible) with:
 *   - lazy init (no client is created unless credentials are present)
 *   - graceful "unconfigured" mode for local dev / first deploy
 *   - presigned PUT URLs (creator uploads directly to R2)
 *   - presigned GET URLs (buyer downloads directly from R2 — zero
 *     egress cost on our side, since Cloudflare serves it)
 *   - server-side helpers (uploadBuffer, deleteObject) for the
 *     asset thumbnail / PDF-to-images pipelines that don't go via
 *     a presigned URL
 *
 * Storage key convention:
 *   assets/{assetId}/v{version}/{filename}
 *   media/{assetId}/{kind}/{filename}
 *   temp/{userId}/{uploadId}/{filename}
 *
 * The key is opaque to the client — they only see the presigned URL.
 *
 * Performance: the AWS SDK pulls a few MB of code. We lazy-require
 * the client so test runs / cold starts without R2 credentials
 * don't pay the cost.
 */

import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

export interface UploadUrlInput {
  /** Storage key (path within the bucket). Use `buildAssetKey` etc. */
  key: string;
  /** Content type. Browsers use this to set the MIME on upload. */
  contentType: string;
  /** Content length (optional but recommended — helps R2 enforce quota). */
  contentLength?: number;
  /** URL expiry in seconds. Default 1 hour (3600). */
  expiresInSeconds?: number;
  /** Override the file name in the response headers. */
  contentDisposition?: string;
}

export interface PresignedUrl {
  url: string;
  key: string;
  expiresAt: Date;
  method: "PUT" | "GET";
}

export interface UploadResult {
  key: string;
  sizeBytes?: number;
  etag?: string;
  publicUrl?: string;
}

/**
 * Configuration status — exposes whether the service has working
 * credentials. Used by routes to decide between 503 (unconfigured)
 * and 500 (actual error).
 */
export interface StorageConfigStatus {
  configured: boolean;
  bucket: string;
  endpoint: string;
  hasPublicUrl: boolean;
}

export function getStorageStatus(): StorageConfigStatus {
  return {
    configured: isConfigured(),
    bucket: env.CLOUDFLARE_R2_BUCKET,
    endpoint: buildEndpoint(),
    hasPublicUrl: !!env.CLOUDFLARE_R2_PUBLIC_URL,
  };
}

function isConfigured(): boolean {
  return (
    !!env.CLOUDFLARE_R2_ACCOUNT_ID &&
    !!env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    !!env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    !!env.CLOUDFLARE_R2_BUCKET
  );
}

function buildEndpoint(): string {
  if (!env.CLOUDFLARE_R2_ACCOUNT_ID) return "";
  return `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

/* ---------------------------------------------------------------- *
 *  Lazy S3 client
 * ---------------------------------------------------------------- */

let _clientPromise: Promise<unknown> | null = null;

/**
 * Returns the S3 client or throws a structured error if R2 isn't
 * configured. We lazy-import the AWS SDK so the cost (~few MB of
 * code) is only paid on first use.
 */
async function getS3Client(): Promise<any> {
  if (!isConfigured()) {
    throw new StorageNotConfiguredError(
      "Cloudflare R2 is not configured. Set CLOUDFLARE_R2_ACCOUNT_ID, " +
        "CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and " +
        "CLOUDFLARE_R2_BUCKET in Railway dashboard.",
    );
  }
  if (_clientPromise) return _clientPromise;
  _clientPromise = (async () => {
    // Dynamic import keeps cold-start cost low when R2 isn't used.
    const { S3Client } = await import("@aws-sdk/client-s3");
    return new S3Client({
      region: "auto", // R2 ignores region but the SDK requires it
      endpoint: buildEndpoint(),
      credentials: {
        accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
      // The AWS SDK v3 defaults to requestChecksumCalculation:
      // "WHEN_SUPPORTED", which silently adds `x-amz-sdk-checksum-algorithm`
      // and `x-amz-checksum-crc32` query params to presigned URLs. Cloudflare
      // R2 reads those URL params and enforces the checksum, but the value
      // baked into the URL is the CRC32 of an EMPTY payload — so any actual
      // upload body fails with SignatureDoesNotMatch.
      //
      // Setting this to "WHEN_REQUIRED" means the SDK only adds the
      // checksum when the destination service requires it. R2 does not,
      // so the query params are omitted and PUTs work with any body.
      requestChecksumCalculation: "WHEN_REQUIRED",
      // Same logic for response integrity check on GETs.
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  })();
  return _clientPromise;
}

/** Reset the cached client — used by tests. */
export function _resetStorageClientForTests(): void {
  _clientPromise = null;
}

/* ---------------------------------------------------------------- *
 *  Storage key builders
 * ---------------------------------------------------------------- */

export function buildAssetKey(assetId: string, version: number, filename: string): string {
  return `assets/${assetId}/v${version}/${sanitizeFilename(filename)}`;
}

export function buildMediaKey(assetId: string, kind: string, filename: string): string {
  return `media/${assetId}/${kind}/${sanitizeFilename(filename)}`;
}

export function buildTempKey(userId: string, filename: string): string {
  return `temp/${userId}/${randomUUID()}/${sanitizeFilename(filename)}`;
}

function sanitizeFilename(name: string): string {
  // Strip path separators and control characters. Keep Unicode.
  return name
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/\.\.+/g, ".")
    .replace(/[\\/]/g, "_")
    .slice(0, 200) || "file";
}

/* ---------------------------------------------------------------- *
 *  Public API: presigned URLs
 * ---------------------------------------------------------------- */

/**
 * Generate a presigned PUT URL so the client can upload directly to
 * R2 without proxying through our server (saves bandwidth + CPU).
 *
 * Browser flow:
 *   1. Client calls POST /assets/:id/files/upload → gets back {url, key}
 *   2. Client does `fetch(url, { method: 'PUT', body: file })`
 *   3. On 200, client calls POST /assets/:id/files/finalize with the
 *      returned key to record the AssetFile row.
 */
export async function generateUploadUrl(input: UploadUrlInput): Promise<PresignedUrl> {
  const client = await getS3Client();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const expiresIn = input.expiresInSeconds ?? 3600;
  const cmd = new PutObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    ContentDisposition: input.contentDisposition,
  });

  const url = await getSignedUrl(client, cmd, { expiresIn });
  return {
    url,
    key: input.key,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    method: "PUT",
  };
}

/**
 * Generate a presigned GET URL so the buyer can download directly
 * from R2. Short expiry (5 min default) limits URL leak risk.
 *
 * If `CLOUDFLARE_R2_PUBLIC_URL` is set and the asset is intended to
 * be public, returns the public CDN URL instead of a presigned one.
 */
export async function generateDownloadUrl(input: {
  key: string;
  expiresInSeconds?: number;
  /** Force a presigned URL even if a public URL is configured. */
  forceSigned?: boolean;
  /** Override the filename in the Content-Disposition header. */
  filename?: string;
}): Promise<PresignedUrl> {
  const expiresIn = input.expiresInSeconds ?? 300; // 5 min

  // Public-URL path: only for assets marked public. Buyers always
  // get presigned (their access is grant-based, not public).
  if (env.CLOUDFLARE_R2_PUBLIC_URL && !input.forceSigned) {
    const publicUrl = `${env.CLOUDFLARE_R2_PUBLIC_URL.replace(/\/$/, "")}/${input.key}`;
    // No expiry on public URLs — they're meant to be stable.
    return {
      url: publicUrl,
      key: input.key,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      method: "GET",
    };
  }

  const client = await getS3Client();
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const cmd = new GetObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET,
    Key: input.key,
    ResponseContentDisposition: input.filename
      ? `attachment; filename="${input.filename.replace(/[\\"\r\n]/g, "_")}"`
      : undefined,
  });

  const url = await getSignedUrl(client, cmd, { expiresIn });
  return {
    url,
    key: input.key,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    method: "GET",
  };
}

/* ---------------------------------------------------------------- *
 *  Public API: server-side operations
 *
 *  Used for things the client can't do directly — e.g. generating
 *  thumbnails, generating PDF previews, moving temp uploads to
 *  permanent storage. These route through our server because we
 *  need to read or write bytes locally.
 * ---------------------------------------------------------------- */

export async function uploadBuffer(input: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  /** Make the object publicly readable via CLOUDFLARE_R2_PUBLIC_URL. */
  publicRead?: boolean;
  metadata?: Record<string, string>;
}): Promise<UploadResult> {
  const client = await getS3Client();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  await client.send(
    new PutObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.publicRead ? "public, max-age=31536000, immutable" : "private, max-age=300",
      Metadata: input.metadata,
    }),
  );

  return {
    key: input.key,
    publicUrl: input.publicRead && env.CLOUDFLARE_R2_PUBLIC_URL
      ? `${env.CLOUDFLARE_R2_PUBLIC_URL.replace(/\/$/, "")}/${input.key}`
      : undefined,
  };
}

export async function deleteObject(key: string): Promise<void> {
  const client = await getS3Client();
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET,
      Key: key,
    }),
  );
}

export async function objectExists(key: string): Promise<boolean> {
  const client = await getS3Client();
  const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: env.CLOUDFLARE_R2_BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch (e: any) {
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === "NotFound") return false;
    throw e;
  }
}

export async function getObjectMetadata(key: string): Promise<{
  sizeBytes: number;
  contentType: string | undefined;
  etag: string | undefined;
} | null> {
  const client = await getS3Client();
  const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
  try {
    const res = await client.send(
      new HeadObjectCommand({
        Bucket: env.CLOUDFLARE_R2_BUCKET,
        Key: key,
      }),
    );
    return {
      sizeBytes: res.ContentLength ?? 0,
      contentType: res.ContentType,
      etag: res.ETag,
    };
  } catch (e: any) {
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === "NotFound") return null;
    throw e;
  }
}

/* ---------------------------------------------------------------- *
 *  Errors
 * ---------------------------------------------------------------- */

export class StorageNotConfiguredError extends Error {
  override readonly name = "StorageNotConfiguredError";
  readonly code = "STORAGE_NOT_CONFIGURED";
  readonly statusCode = 503;

  constructor(message: string) {
    super(message);
  }
}

export class StorageError extends Error {
  override readonly name = "StorageError";
  readonly code: string;
  readonly statusCode: number;
  override readonly cause?: unknown;

  constructor(message: string, code: string, statusCode = 500, cause?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    if (cause !== undefined) this.cause = cause;
  }
}

/**
 * Top-level try/catch wrapper. Converts AWS SDK errors into our
 * StorageError so route handlers can return clean HTTP responses.
 */
export async function withStorageErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) throw e;
    if (e instanceof StorageError) throw e;

    const err = e as { name?: string; $metadata?: { httpStatusCode?: number }; message?: string };

    if (err.name === "NoSuchKey" || err.name === "NotFound") {
      throw new StorageError("Object not found in storage", "STORAGE_NOT_FOUND", 404, e);
    }
    if (err.name === "AccessDenied" || err.$metadata?.httpStatusCode === 403) {
      throw new StorageError("Storage access denied — check R2 API token permissions", "STORAGE_FORBIDDEN", 403, e);
    }
    if (err.name === "InvalidAccessKeyId" || err.name === "SignatureDoesNotMatch") {
      throw new StorageError("Storage credentials are invalid", "STORAGE_AUTH_FAILED", 500, e);
    }

    throw new StorageError(
      `Storage operation failed: ${err.message ?? "unknown"}`,
      "STORAGE_FAILED",
      502,
      e,
    );
  }
}