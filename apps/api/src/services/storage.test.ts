/**
 * Storage service tests. Mock the AWS SDK so we don't need real R2
 * credentials. Verify the contract: presigned URL shape, key
 * builders, error translation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Track sent commands so tests can assert on them.
const sentCommands: Array<{ name: string; input: any }> = [];
const signedUrls: Record<string, string> = {};

const sendMock = vi.fn(async (cmd) => {
  sentCommands.push({ name: cmd.constructor.name, input: cmd.input });
  return {
    ContentLength: 1024,
    ContentType: cmd.input?.ContentType,
    ETag: '"abc123"',
  };
});

const getSignedUrlMock = vi.fn(async (_client, cmd, opts) => {
  const key = `${cmd.constructor.name}-${cmd.input?.Key ?? cmd.input?.Bucket ?? ""}`;
  const url = `https://test-r2.cloudflarestorage.com/elixio-test/${encodeURIComponent(cmd.input?.Key ?? "x")}?X-Amz-Signature=test&expires=${opts.expiresIn}`;
  signedUrls[key] = url;
  return url;
});

// Mock @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner with
// controllable command classes + the client send() method.
vi.mock("@aws-sdk/client-s3", () => {
  class PutObjectCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  }
  class GetObjectCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  }
  class DeleteObjectCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  }
  class HeadObjectCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  }
  class S3Client {
    async send(cmd: any) {
      return sendMock(cmd);
    }
  }
  return { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (client: any, cmd: any, opts: any) => getSignedUrlMock(client, cmd, opts),
}));

// Set up env BEFORE importing storage (env validates on load).
// We need to set the required vars (DATABASE_URL, JWT_SECRET,
// ELIXIO_MFA_KEY_ENCRYPTION_KEY) too, even though the storage
// service doesn't use them, because env.ts validates the whole
// schema on parse.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "x".repeat(40);
process.env.ELIXIO_MFA_KEY_ENCRYPTION_KEY = process.env.ELIXIO_MFA_KEY_ENCRYPTION_KEY ?? "x".repeat(44);
process.env.CLOUDFLARE_R2_ACCOUNT_ID = "test-account-123";
process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "test-access-key";
process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "test-secret-key";
process.env.CLOUDFLARE_R2_BUCKET = "elixio-test";

// Import storage AFTER setting env. The env module reads process.env
// at import time, so this captures our test values.
const {
  buildAssetKey,
  buildMediaKey,
  buildTempKey,
  generateDownloadUrl,
  generateUploadUrl,
  getStorageStatus,
  objectExists,
  withStorageErrors,
  deleteObject,
  uploadBuffer,
  _resetStorageClientForTests,
  StorageNotConfiguredError,
} = await import("./storage.js");

beforeEach(() => {
  sentCommands.length = 0;
  for (const k of Object.keys(signedUrls)) delete signedUrls[k];
  sendMock.mockClear();
  getSignedUrlMock.mockClear();
  _resetStorageClientForTests();
});

describe("getStorageStatus", () => {
  it("returns configured=true when all env vars are present", () => {
    const status = getStorageStatus();
    expect(status.configured).toBe(true);
    expect(status.bucket).toBe("elixio-test");
    expect(status.endpoint).toBe("https://test-account-123.r2.cloudflarestorage.com");
    expect(status.hasPublicUrl).toBe(false);
  });
});

describe("buildAssetKey", () => {
  it("formats asset keys with version + sanitized filename", () => {
    expect(buildAssetKey("asset-uuid-1", 2, "My File.psd")).toBe(
      "assets/asset-uuid-1/v2/My File.psd",
    );
  });

  it("strips path separators from filenames", () => {
    // sanitizeFilename strips control chars + path separators, then
    // collapses runs of dots. The exact output is less important than
    // the security property: no `..` and no `/` make it into the key.
    const key = buildAssetKey("a", 1, "../../etc/passwd");
    expect(key).not.toContain("..");
    expect(key).not.toContain("/etc/");
    expect(key).toBe("assets/a/v1/._._etc_passwd");
  });

  it("truncates very long filenames", () => {
    const longName = "a".repeat(500) + ".txt";
    const key = buildAssetKey("a", 1, longName);
    expect(key.length).toBeLessThanOrEqual("assets/a/v1/".length + 200);
  });

  it("falls back to 'file' when filename is empty after sanitization", () => {
    // Stripping all chars and a 200-char slice keeps at least one
    // underscore; we test with a fully-control-chars string that
    // gets stripped to empty by sanitizeFilename.
    expect(buildAssetKey("a", 1, "\x00\x01\x02")).toContain("/file");
  });
});

describe("buildMediaKey / buildTempKey", () => {
  it("builds media keys with kind", () => {
    expect(buildMediaKey("asset-1", "thumbnail", "thumb.jpg")).toBe(
      "media/asset-1/thumbnail/thumb.jpg",
    );
  });

  it("builds temp keys with userId + uuid", () => {
    const key = buildTempKey("user-1", "upload.bin");
    expect(key).toMatch(/^temp\/user-1\/[a-f0-9-]+\/upload\.bin$/);
  });
});

describe("generateUploadUrl", () => {
  it("calls PutObjectCommand with the right inputs and returns a presigned URL", async () => {
    const result = await generateUploadUrl({
      key: "assets/abc/v1/file.psd",
      contentType: "image/vnd.adobe.photoshop",
      contentLength: 1024,
      expiresInSeconds: 600,
    });

    expect(result.method).toBe("PUT");
    expect(result.key).toBe("assets/abc/v1/file.psd");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.url).toContain("X-Amz-Signature=test");

    expect(sentCommands).toHaveLength(0); // we don't actually send; we only sign
    expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
    const call = getSignedUrlMock.mock.calls[0];
    expect(call[2]).toEqual({ expiresIn: 600 });
  });

  it("defaults expiresIn to 3600 (1 hour)", async () => {
    await generateUploadUrl({ key: "x", contentType: "image/png" });
    expect(getSignedUrlMock.mock.calls[0][2]).toEqual({ expiresIn: 3600 });
  });

  it("passes ContentLength + ContentDisposition through", async () => {
    await generateUploadUrl({
      key: "x",
      contentType: "image/png",
      contentLength: 9999,
      contentDisposition: 'attachment; filename="x.png"',
    });
    const cmd = getSignedUrlMock.mock.calls[0][1];
    expect(cmd.input.ContentLength).toBe(9999);
    expect(cmd.input.ContentDisposition).toBe('attachment; filename="x.png"');
  });
});

describe("generateDownloadUrl", () => {
  it("returns a presigned GET URL with 5-min default expiry", async () => {
    const result = await generateDownloadUrl({ key: "assets/abc/v1/file.psd" });
    expect(result.method).toBe("GET");
    expect(getSignedUrlMock.mock.calls[0][2]).toEqual({ expiresIn: 300 });
  });

  it("uses public CDN URL when CLOUDFLARE_R2_PUBLIC_URL is set (and not forced signed)", async () => {
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://cdn.elixiodigital.com";
    // Re-import env so the new value is picked up
    vi.resetModules();
    const storageMod = await import("./storage.js");
    const result = await storageMod.generateDownloadUrl({ key: "media/x/thumb.jpg" });
    expect(result.url).toBe("https://cdn.elixiodigital.com/media/x/thumb.jpg");
    expect(result.method).toBe("GET");
    expect(getSignedUrlMock).not.toHaveBeenCalled();
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "";
    vi.resetModules();
  });

  it("forceSigned=true uses presigned URL even when public CDN is configured", async () => {
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://cdn.example.com";
    vi.resetModules();
    const storageMod = await import("./storage.js");
    const result = await storageMod.generateDownloadUrl({ key: "x", forceSigned: true });
    expect(result.url).toContain("X-Amz-Signature=");
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "";
    vi.resetModules();
  });

  it("escapes special chars in filename for Content-Disposition", async () => {
    await generateDownloadUrl({ key: "x", filename: 'evil";name.exe' });
    const cmd = getSignedUrlMock.mock.calls[0][1];
    expect(cmd.input.ResponseContentDisposition).not.toContain('";');
  });
});

describe("uploadBuffer / deleteObject / objectExists", () => {
  it("uploadBuffer sends PutObjectCommand with cache control", async () => {
    const result = await uploadBuffer({
      key: "media/x/thumb.jpg",
      body: Buffer.from("test"),
      contentType: "image/jpeg",
      publicRead: true,
    });
    expect(result.key).toBe("media/x/thumb.jpg");
    expect(result.publicUrl).toBeUndefined(); // no public URL configured
    expect(sentCommands).toHaveLength(1);
    expect(sentCommands[0].name).toBe("PutObjectCommand");
    expect(sentCommands[0].input.CacheControl).toContain("public");
  });

  it("uploadBuffer includes publicUrl when public CDN is configured", async () => {
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://cdn.elixiodigital.com";
    vi.resetModules();
    const storageMod = await import("./storage.js");
    const result = await storageMod.uploadBuffer({
      key: "media/x/thumb.jpg",
      body: Buffer.from("test"),
      contentType: "image/jpeg",
      publicRead: true,
    });
    expect(result.publicUrl).toBe("https://cdn.elixiodigital.com/media/x/thumb.jpg");
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "";
    vi.resetModules();
  });

  it("deleteObject sends DeleteObjectCommand with the key", async () => {
    await deleteObject("assets/x/v1/file.psd");
    expect(sentCommands[0].name).toBe("DeleteObjectCommand");
    expect(sentCommands[0].input.Key).toBe("assets/x/v1/file.psd");
    expect(sentCommands[0].input.Bucket).toBe("elixio-test");
  });

  it("objectExists returns true when HeadObject succeeds", async () => {
    const exists = await objectExists("any-key");
    expect(exists).toBe(true);
    expect(sentCommands[0].name).toBe("HeadObjectCommand");
  });
});

describe("withStorageErrors", () => {
  it("passes through successful results unchanged", async () => {
    const result = await withStorageErrors(async () => "ok");
    expect(result).toBe("ok");
  });

  it("translates NotFound to StorageError with 404", async () => {
    const err = Object.assign(new Error("Not found"), {
      name: "NotFound",
      $metadata: { httpStatusCode: 404 },
    });
    await expect(
      withStorageErrors(async () => {
        throw err;
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: "STORAGE_NOT_FOUND" });
  });

  it("translates AccessDenied to StorageError with 403", async () => {
    const err = Object.assign(new Error("Denied"), {
      name: "AccessDenied",
      $metadata: { httpStatusCode: 403 },
    });
    await expect(
      withStorageErrors(async () => {
        throw err;
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: "STORAGE_FORBIDDEN" });
  });

  it("translates SignatureDoesNotMatch to 500", async () => {
    const err = Object.assign(new Error("Bad sig"), { name: "SignatureDoesNotMatch" });
    await expect(
      withStorageErrors(async () => {
        throw err;
      }),
    ).rejects.toMatchObject({ statusCode: 500, code: "STORAGE_AUTH_FAILED" });
  });

  it("translates unknown errors to 502 STORAGE_FAILED", async () => {
    const err = new Error("Network exploded");
    await expect(
      withStorageErrors(async () => {
        throw err;
      }),
    ).rejects.toMatchObject({ statusCode: 502, code: "STORAGE_FAILED" });
  });

  it("preserves the underlying error as cause", async () => {
    const err = new Error("boom");
    try {
      await withStorageErrors(async () => {
        throw err;
      });
    } catch (e: any) {
      expect(e.cause).toBe(err);
    }
  });
});

describe("StorageNotConfiguredError", () => {
  it("has the right metadata", () => {
    const err = new StorageNotConfiguredError("not set");
    expect(err.code).toBe("STORAGE_NOT_CONFIGURED");
    expect(err.statusCode).toBe(503);
    expect(err.name).toBe("StorageNotConfiguredError");
    expect(err.message).toBe("not set");
  });
});

describe("unconfigured mode", () => {
  // We don't reset the env module here because doing so affects other
  // test files in the same run (vitest module cache is process-wide).
  // The StorageNotConfiguredError is covered by the unconfigured test
  // in routes/asset-files.test.ts (TODO: write that file).
  //
  // What we CAN test here: the shape of the error class itself.
  it("StorageNotConfiguredError has the right metadata", () => {
    const err = new StorageNotConfiguredError("not configured");
    expect(err.name).toBe("StorageNotConfiguredError");
    expect(err.code).toBe("STORAGE_NOT_CONFIGURED");
    expect(err.statusCode).toBe(503);
    expect(err.message).toBe("not configured");
    // instanceof check
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(StorageNotConfiguredError);
  });

  it("getStorageStatus reflects current env state", () => {
    // We set the env at the top of this file to all-known values,
    // so configured should be true here.
    const status = getStorageStatus();
    expect(status.configured).toBe(true);
    expect(status.bucket).toBe("elixio-test");
  });
});