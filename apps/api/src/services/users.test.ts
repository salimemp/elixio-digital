/**
 * Soft-delete + export tests — verify GDPR Art. 17 / CCPA Right to Delete.
 *
 * Approach: mock prisma and bcrypt, exercise the service layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock bcrypt BEFORE importing the service
const compareMock = vi.fn();
vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: unknown[]) => compareMock(...args),
  },
}));

// Mock prisma with chained methods
const userFindUniqueMock = vi.fn();
const userUpdateMock = vi.fn();
const refreshTokenUpdateManyMock = vi.fn();
const oAuthDeleteManyMock = vi.fn();
const mfaFactorUpdateManyMock = vi.fn();
const mfaBackupCodeDeleteManyMock = vi.fn();
const passkeyDeleteManyMock = vi.fn();
const magicLinkUpdateManyMock = vi.fn();
const passwordResetUpdateManyMock = vi.fn();
const orderFindManyMock = vi.fn();
const downloadGrantFindManyMock = vi.fn();
const aIGenerationFindManyMock = vi.fn();
const oAuthAccountFindManyMock = vi.fn();
const loginAttemptFindManyMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
      update: (...args: unknown[]) => userUpdateMock(...args),
    },
    refreshToken: {
      updateMany: (...args: unknown[]) => refreshTokenUpdateManyMock(...args),
    },
    oAuthAccount: {
      deleteMany: (...args: unknown[]) => oAuthDeleteManyMock(...args),
      findMany: (...args: unknown[]) => oAuthAccountFindManyMock(...args),
    },
    mfaFactor: {
      updateMany: (...args: unknown[]) => mfaFactorUpdateManyMock(...args),
    },
    mfaBackupCode: {
      deleteMany: (...args: unknown[]) => mfaBackupCodeDeleteManyMock(...args),
    },
    passkey: {
      deleteMany: (...args: unknown[]) => passkeyDeleteManyMock(...args),
    },
    magicLinkToken: {
      updateMany: (...args: unknown[]) => magicLinkUpdateManyMock(...args),
    },
    passwordResetToken: {
      updateMany: (...args: unknown[]) => passwordResetUpdateManyMock(...args),
    },
    order: {
      findMany: (...args: unknown[]) => orderFindManyMock(...args),
    },
    downloadGrant: {
      findMany: (...args: unknown[]) => downloadGrantFindManyMock(...args),
    },
    aIGeneration: {
      findMany: (...args: unknown[]) => aIGenerationFindManyMock(...args),
    },
    loginAttempt: {
      findMany: (...args: unknown[]) => loginAttemptFindManyMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

// Import after mocks
const { softDeleteAccount, exportUserData } = await import("../services/users.js");

describe("softDeleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
  });

  it("throws 404 when user not found", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);
    await expect(softDeleteAccount("ghost-id", "pw", undefined)).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });

  it("throws 410 when user already deleted", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      deletedAt: new Date(),
      passwordHash: "hash",
    });
    await expect(softDeleteAccount("u1", "pw", undefined)).rejects.toMatchObject({
      statusCode: 410,
      code: "ALREADY_DELETED",
    });
  });

  it("throws 400 when user has no password (OAuth-only)", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      deletedAt: null,
      passwordHash: null,
    });
    await expect(softDeleteAccount("u1", "anything", undefined)).rejects.toMatchObject({
      statusCode: 400,
      code: "PASSWORD_REQUIRED",
    });
  });

  it("throws 401 on bad password", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      deletedAt: null,
      passwordHash: "$2a$10$...",
    });
    compareMock.mockResolvedValueOnce(false);
    await expect(softDeleteAccount("u1", "wrong-pw", undefined)).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_PASSWORD",
    });
  });

  it("anonymizes email + display name + clears sensitive fields on success", async () => {
    const originalUser = {
      id: "user-abc",
      email: "real@example.com",
      deletedAt: null,
      passwordHash: "$2a$10$validhash",
    };
    userFindUniqueMock.mockResolvedValueOnce(originalUser);
    compareMock.mockResolvedValueOnce(true);

    const result = await softDeleteAccount("user-abc", "correct-pw", "moving on");

    // Returns a deletion receipt
    expect(result.deletedAt).toBeInstanceOf(Date);
    expect(result.scheduledHardDeleteAt).toBeInstanceOf(Date);
    expect(result.scheduledHardDeleteAt.getTime() - result.deletedAt.getTime()).toBe(
      30 * 24 * 60 * 60 * 1000, // 30 days
    );

    // The user.update call must anonymize
    const updateCall = userUpdateMock.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "user-abc" });
    expect(updateCall.data.email).toMatch(/^deleted\+[a-f0-9]{16}@deleted\.local$/);
    expect(updateCall.data.displayName).toBe("Deleted user");
    expect(updateCall.data.passwordHash).toBeNull();
    expect(updateCall.data.mfaEnabled).toBe(false);
    expect(updateCall.data.isCreator).toBe(false);
    expect(updateCall.data.deletedAt).toEqual(result.deletedAt);
  });

  it("uses idempotent email hash (same user → same anonymized email)", async () => {
    const u1 = { id: "user-x", email: "x@y.com", deletedAt: null, passwordHash: "h" };
    const u2 = { id: "user-x", email: "x@y.com", deletedAt: null, passwordHash: "h" };
    userFindUniqueMock.mockResolvedValueOnce(u1);
    compareMock.mockResolvedValueOnce(true);
    const r1 = await softDeleteAccount("user-x", "pw", undefined);
    const email1 = userUpdateMock.mock.calls[0][0].data.email;

    userFindUniqueMock.mockResolvedValueOnce(u2);
    compareMock.mockResolvedValueOnce(true);
    const r2 = await softDeleteAccount("user-x", "pw", undefined);
    const email2 = userUpdateMock.mock.calls[1][0].data.email;

    // Same input → same anonymized email hash
    expect(email1).toBe(email2);
    // Both calls succeed and return valid timestamps
    expect(r1.scheduledHardDeleteAt.getTime()).toBeGreaterThan(r1.deletedAt.getTime());
    expect(r2.scheduledHardDeleteAt.getTime()).toBeGreaterThan(r2.deletedAt.getTime());
  });

  it("truncates and sanitizes the reason (log injection defense)", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      deletedAt: null,
      passwordHash: "h",
    });
    compareMock.mockResolvedValueOnce(true);

    const evil = "x".repeat(600) + "\x07\x1b[31mhacked\x1b[0m";
    await softDeleteAccount("u1", "pw", evil);

    const logLine = consoleSpy.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("[account-delete]"),
    );
    expect(logLine).toBeDefined();
    const logged = String(logLine![0]);
    // Truncated to 500 chars + escape codes stripped
    expect(logged.length).toBeLessThanOrEqual(`[account-delete] user=u1 reason=`.length + 500);
    expect(logged).not.toContain("\x1b");
    expect(logged).not.toContain("\x07");

    consoleSpy.mockRestore();
  });

  it("revokes all refresh tokens + OAuth + MFA + passkeys in one transaction", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      deletedAt: null,
      passwordHash: "h",
    });
    compareMock.mockResolvedValueOnce(true);

    await softDeleteAccount("u1", "pw", undefined);

    // 1 user.update + 7 cascade ops = 8 calls in one transaction
    expect(transactionMock).toHaveBeenCalledTimes(1);
    const txOps = transactionMock.mock.calls[0][0];
    expect(txOps).toHaveLength(8);

    // Confirm the cascade ops hit the right tables
    expect(refreshTokenUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(oAuthDeleteManyMock).toHaveBeenCalledTimes(1);
    expect(mfaFactorUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(mfaBackupCodeDeleteManyMock).toHaveBeenCalledTimes(1);
    expect(passkeyDeleteManyMock).toHaveBeenCalledTimes(1);
    expect(magicLinkUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(passwordResetUpdateManyMock).toHaveBeenCalledTimes(1);
  });
});

describe("exportUserData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderFindManyMock.mockResolvedValue([]);
    downloadGrantFindManyMock.mockResolvedValue([]);
    aIGenerationFindManyMock.mockResolvedValue([]);
    oAuthAccountFindManyMock.mockResolvedValue([]);
    loginAttemptFindManyMock.mockResolvedValue([]);
  });

  it("returns a JSON snapshot with all expected sections", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "x@y.com",
      displayName: "X",
      isCreator: false,
      isBuyer: true,
      isAdmin: false,
      isVerified: false,
      emailVerifiedAt: null,
      mfaEnabled: false,
      createdAt: new Date(),
      avatarUrl: null,
      bio: null,
    });

    const result = await exportUserData("u1");

    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.requestId).toMatch(/^[a-f0-9]{16}$/);
    expect(result.profile).not.toBeNull();
    expect(result.orders).toEqual([]);
    expect(result.downloads).toEqual([]);
    expect(result.aiGenerations).toEqual([]);
    expect(result.activityLog).toEqual([]);
    expect(result.oauthAccounts).toEqual([]);
    expect(result.consent.cookieConsent).toBeNull();
  });

  it("throws 404 when user not found", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);
    await expect(exportUserData("ghost")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("queries all related tables in parallel", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "u1", email: "x", displayName: "X",
      isCreator: false, isBuyer: true, isAdmin: false,
      isVerified: false, emailVerifiedAt: null, mfaEnabled: false,
      createdAt: new Date(), avatarUrl: null, bio: null,
    });
    await exportUserData("u1");
    expect(orderFindManyMock).toHaveBeenCalled();
    expect(downloadGrantFindManyMock).toHaveBeenCalled();
    expect(aIGenerationFindManyMock).toHaveBeenCalled();
    expect(oAuthAccountFindManyMock).toHaveBeenCalled();
    expect(loginAttemptFindManyMock).toHaveBeenCalled();
    // All queries scoped to the user
    expect(orderFindManyMock.mock.calls[0][0].where).toEqual({ buyerId: "u1" });
    expect(aIGenerationFindManyMock.mock.calls[0][0].where).toEqual({ creatorId: "u1" });
    expect(loginAttemptFindManyMock.mock.calls[0][0].take).toBe(500);
  });
});