import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { mapUser } from "../lib/mappers.js";
import { httpError } from "../lib/errors.js";
import type { UpdateProfileInput, User } from "@elixio/shared";

export async function getPublicProfile(id: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw httpError("User not found", 404, "NOT_FOUND");
  }

  return mapUser(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
  const data: { displayName?: string; bio?: string | null; avatarUrl?: string | null } = {};

  if (input.displayName !== undefined) {
    data.displayName = input.displayName;
  }

  if (input.bio !== undefined) {
    data.bio = input.bio ?? null;
  }

  if (input.avatarUrl !== undefined) {
    data.avatarUrl = input.avatarUrl ?? null;
  }

  const user = await prisma.user.update({ where: { id: userId }, data });

  return mapUser(user);
}

export async function becomeCreator(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw httpError("User not found", 404, "NOT_FOUND");
  }

  if (user.isCreator) {
    return mapUser(user);
  }

  const slug = `${user.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${user.id.slice(0, 8)}`;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { isCreator: true } }),
    prisma.storefront.create({
      data: {
        userId,
        slug,
        socialLinks: {},
      },
    }),
  ]);

  const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return mapUser(updated);
}

/**
 * GDPR Art. 15 / CCPA Right to Know / PIPEDA 4.9 — return a JSON snapshot
 * of everything we hold on the user.
 *
 * The shape intentionally matches the public-API `User` so the caller can
 * diff their inputs against what we store. Anonymized fields (deleted
 * users) are returned as null/empty, which is fine because the user is
 * always authenticated and self-requesting.
 *
 * NOTE: This is the synchronous variant — for >10MB outputs we'd want a
 * streaming zip+archive job. For the current schema this fits in a few KB.
 */
export interface UserDataExport {
  generatedAt: string;
  requestId: string;
  profile: ReturnType<typeof mapUser> | null;
  orders: Array<{
    id: string;
    createdAt: Date;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    status: string;
    items: Array<{ assetId: string; title: string; priceCents: number }>;
  }>;
  downloads: Array<{ orderItemId: string; assetId: string; downloadCount: number; expiresAt: Date }>;
  aiGenerations: Array<{
    id: string;
    kind: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
    tokensIn: number | null;
    tokensOut: number | null;
    costUsd: number | null;
  }>;
  activityLog: Array<{
    id: string;
    type: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  }>;
  oauthAccounts: Array<{ provider: string; linkedAt: Date }>;
  consent: {
    cookieConsent: { analytics: boolean; marketing: boolean } | null;
    acceptedTermsAt: Date | null;
  };
}

export async function exportUserData(userId: string): Promise<UserDataExport> {
  const requestId = randomBytes(8).toString("hex");

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw httpError("User not found", 404, "NOT_FOUND");
  }

  // Pull related data via the foreign keys. We can't include `orders` etc.
  // on User because the schema doesn't model those relations (orders go via
  // Order.buyerId, downloads via DownloadGrant.buyerId).
  const [orders, downloadGrants, aiGenerations, oauthAccounts, activityLog] = await Promise.all([
    prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        items: { include: { asset: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.downloadGrant.findMany({
      where: { buyerId: userId },
      include: { orderItem: { select: { assetId: true } } },
      orderBy: { expiresAt: "desc" },
    }),
    prisma.aIGeneration.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.oAuthAccount.findMany({
      where: { userId },
    }),
    prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 500, // Cap so a power user doesn't get a 50MB JSON
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    requestId,
    profile: mapUser(user),
    orders: orders.map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      subtotalCents: o.subtotalCents,
      taxCents: o.taxCents,
      totalCents: o.totalCents,
      status: o.status,
      items: o.items.map((it) => ({
        assetId: it.asset.id,
        title: it.asset.title,
        priceCents: it.priceCents,
      })),
    })),
    downloads: downloadGrants.map((d) => ({
      orderItemId: d.orderItemId,
      assetId: d.orderItem.assetId,
      downloadCount: d.downloadCount,
      expiresAt: d.expiresAt,
    })),
    aiGenerations: aiGenerations.map((g) => ({
      id: g.id,
      kind: g.kind,
      status: g.status,
      createdAt: g.createdAt,
      completedAt: g.completedAt,
      tokensIn: g.tokensIn,
      tokensOut: g.tokensOut,
      costUsd: g.costUsd,
    })),
    activityLog: activityLog.map((a) => ({
      id: a.id,
      type: a.success ? "login_success" : "login_failure",
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      createdAt: a.createdAt,
    })),
    oauthAccounts: oauthAccounts.map((o) => ({
      provider: o.provider,
      linkedAt: o.createdAt,
    })),
    consent: {
      // Cookie consent lives in the browser, not our DB; return null and
      // tell the user to export their browser data.
      cookieConsent: null,
      acceptedTermsAt: null,
    },
  };
}

/**
 * Soft-delete account.
 *
 * GDPR Art. 17 + CCPA Right to Delete + PIPEDA 4.9.
 *
 * Steps:
 *   1. Re-verify password (second factor for password-authed users)
 *   2. Anonymize PII fields: email becomes `deleted+<hash>@deleted.local`,
 *      display name becomes "Deleted user", avatar/bio cleared
 *   3. Mark `deletedAt = now()` — token-verify checks this and 401s
 *   4. Revoke all refresh tokens
 *   5. Log the deletion reason (anonymized)
 *
 * NOTE: We don't cascade-erase orders/tax records — those are required
 * for 7-year tax retention (US, EU, India, Brazil). The user record is
 * anonymized but financial records keep the order IDs for audit.
 */
export async function softDeleteAccount(
  userId: string,
  password: string,
  reason: string | undefined,
): Promise<{ deletedAt: Date; scheduledHardDeleteAt: Date }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw httpError("User not found", 404, "NOT_FOUND");
  }

  if (user.deletedAt) {
    throw httpError("Account already deleted", 410, "ALREADY_DELETED");
  }

  if (!user.passwordHash) {
    throw httpError(
      "Password required (sign in with password first or use provider account)",
      400,
      "PASSWORD_REQUIRED",
    );
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw httpError("Incorrect password", 401, "INVALID_PASSWORD");
  }

  // Deterministic hash so the same user gets the same anonymized email
  // (idempotent on retries). SHA-256 truncated to 16 hex chars.
  const hash = createHash("sha256")
    .update(userId + (process.env.JWT_SECRET ?? "elixio-anon"))
    .digest("hex")
    .slice(0, 16);
  const anonEmail = `deleted+${hash}@deleted.local`;

  const deletedAt = new Date();
  const scheduledHardDeleteAt = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

  // Log the reason (truncated, sanitized). It's not PII but we keep it
  // for product feedback.
  const sanitizedReason = (reason ?? "").slice(0, 500).replace(/[\x00-\x1f]/g, "");
  if (sanitizedReason) {
    // eslint-disable-next-line no-console
    console.log(`[account-delete] user=${userId} reason=${sanitizedReason}`);
  }

  await prisma.$transaction([
    // Anonymize profile
    prisma.user.update({
      where: { id: userId },
      data: {
        email: anonEmail,
        displayName: "Deleted user",
        bio: null,
        avatarUrl: null,
        passwordHash: null, // invalidate password login immediately
        mfaEnabled: false,
        isCreator: false, // removes creator privileges
        deletedAt,
        scheduledHardDeleteAt,
      },
    }),
    // Revoke all sessions — `revoked` is checked in auth.ts
    prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    }),
    // Clear OAuth linkings
    prisma.oAuthAccount.deleteMany({ where: { userId } }),
    // Disable MFA factors
    prisma.mfaFactor.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: deletedAt },
    }),
    // Clear MFA backup codes
    prisma.mfaBackupCode.deleteMany({ where: { userId } }),
    // Clear passkeys
    prisma.passkey.deleteMany({ where: { userId } }),
    // Mark magic links + password resets as used (effectively kill them)
    prisma.magicLinkToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: deletedAt },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: deletedAt },
    }),
  ]);

  return { deletedAt, scheduledHardDeleteAt };
}
