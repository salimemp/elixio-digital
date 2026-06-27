import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { createHash } from "node:crypto";
import * as totp from "../lib/totp.js";
import { prisma } from "../lib/prisma.js";
import { mapUser } from "../lib/mappers.js";
import { httpError } from "../lib/errors.js";
import { randomToken, sha256Hex, generateBackupCode } from "../lib/tokens.js";
import { encrypt, decrypt, safeDecryptOrNull } from "../lib/crypto.js";
import { env } from "../config/env.js";
import {
  sendEmail,
  verifyEmailTemplate,
  magicLinkTemplate,
  passwordResetTemplate,
} from "./email.js";
import { checkPassword, describeIssue } from "../lib/password-security.js";
import { logRegistration } from "../lib/registration-logger.js";
import type { User as PrismaUser } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { AuthSession, User } from "@elixio/shared";

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL_SECONDS = 900;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const WEBAUTHN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export interface TokenSigner {
  signAccessToken(payload: {
    userId: string;
    email: string;
    isCreator: boolean;
    isAdmin: boolean;
    emailVerified: boolean;
  }): string;
  createRefreshToken(): string;
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

interface IssueSessionOptions {
  rotate?: boolean;
  mfaPending?: boolean;
}

async function issueSession(
  user: PrismaUser,
  signer: TokenSigner,
  opts: IssueSessionOptions = {}
): Promise<AuthSession> {
  const accessToken = signer.signAccessToken({
    userId: user.id,
    email: user.email,
    isCreator: user.isCreator,
    isAdmin: user.role === "admin",
    emailVerified: user.emailVerifiedAt !== null,
  });

  let refreshToken: string | undefined;
  if (!opts.mfaPending) {
    refreshToken = signer.createRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
  }

  return {
    user: mapUser(user),
    tokens: refreshToken
      ? { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS }
      : { accessToken, refreshToken: "", expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    mfaRequired: opts.mfaPending ?? false,
  };
}

async function recordLoginAttempt(
  email: string,
  userId: string | null,
  ip: string | null,
  ua: string | null,
  success: boolean,
  method: string,
  reason?: string
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { email, userId: userId ?? undefined, ipAddress: ip ?? undefined, userAgent: ua ?? undefined, success, method, reason },
  });
  if (!success) {
    const recent = await prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        createdAt: { gt: new Date(Date.now() - LOGIN_LOCKOUT_WINDOW_MS) },
      },
    });
    if (recent >= LOGIN_LOCKOUT_THRESHOLD && userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { lockedUntil: new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MS) },
      });
    }
  }
}

async function isLockedOut(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user?.lockedUntil) return false;
  return user.lockedUntil > new Date();
}

// ─────────── Public auth surface ───────────

export async function register(
  input: {
    email: string;
    password: string;
    displayName: string;
    signupType: "buyer" | "creator";
  },
  ip: string | null,
  ua: string | null,
  signer: TokenSigner
): Promise<AuthSession> {
  const email = input.email.toLowerCase();
  const role = input.signupType; // 'buyer' or 'creator'

  // 1. Strong-password + HIBP breach check (server-side enforced).
  //    Even though Zod validates strength, we re-validate here so the
  //    breach count is in the same error path.
  const pwCheck = await checkPassword(input.password);
  if (!pwCheck.ok) {
    // Log the failed attempt — useful for spotting brute-force on
    // accounts that don't yet exist.
    const issueMsgs = pwCheck.issues.map((i) => describeIssue(i, pwCheck.pwnedCount));
    logRegistration({
      ts: new Date().toISOString(),
      event: "register_failed",
      role,
      userId: null,
      email,
      displayName: input.displayName,
      ip,
      userAgent: ua,
      outcome: pwCheck.issues.includes("pwned") ? "pwned_password" : "weak_password",
      pwnedCount: pwCheck.pwnedCount,
      reason: issueMsgs.join(" "),
    });
    throw httpError(
      issueMsgs.length > 0 ? issueMsgs[0] : "Password does not meet security requirements",
      422,
      "WEAK_PASSWORD",
    );
  }

  // 2. Uniqueness check.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logRegistration({
      ts: new Date().toISOString(),
      event: "register_failed",
      role,
      userId: existing.id,
      email,
      displayName: input.displayName,
      ip,
      userAgent: ua,
      outcome: "duplicate",
    });
    throw httpError("Email already registered", 409, "CONFLICT");
  }

  // 3. Hash the password and create the user with the chosen role.
  //    Email verification is required — we set emailVerified=null and
  //    send a verification email below.
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: input.displayName,
      role,
      isBuyer: role === "buyer",
      isCreator: role === "creator",
      emailVerifiedAt: null, // MUST verify email before accessing protected features
    },
  });

  // 4. Always send the verification email. This is mandatory — the
  //    email-verified gate is enforced on /auth/me and most protected
  //    routes, so users who skip this step can't actually use the app.
  //
  //    We make the email send non-fatal: if the SMTP/Resend call fails
  //    (placeholder API key, network blip, etc.) we still create the
  //    user and let them re-send the verification from the UI. A user
  //    without a working email is better than no user at all.
  try {
    await sendVerificationEmail(user);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `[register] verification email failed for ${email}:`,
      err instanceof Error ? err.message : err,
    );
    // continue — the user is created, they can re-send verification
  }

  // 5. Audit-log the successful registration.
  logRegistration({
    ts: new Date().toISOString(),
    event: "register",
    role,
    userId: user.id,
    email,
    displayName: input.displayName,
    ip,
    userAgent: ua,
    outcome: "ok",
    passwordScore: pwCheck.score,
  });

  // 6. Track in login attempts (legacy, used for lockout state).
  await recordLoginAttempt(email, user.id, ip, ua, true, "register");
  return issueSession(user, signer);
}

export async function login(
  input: { email: string; password: string },
  ip: string | null,
  ua: string | null,
  signer: TokenSigner
): Promise<AuthSession> {
  const email = input.email.toLowerCase();
  if (await isLockedOut(email)) {
    await recordLoginAttempt(email, null, ip, ua, false, "password", "locked_out");
    throw httpError("Account temporarily locked. Try again later.", 429, "TOO_MANY_REQUESTS");
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await recordLoginAttempt(email, null, ip, ua, false, "password", "user_not_found");
    throw httpError("Invalid credentials", 401, "UNAUTHORIZED");
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    await recordLoginAttempt(email, user.id, ip, ua, false, "password", "invalid_password");
    throw httpError("Invalid credentials", 401, "UNAUTHORIZED");
  }
  await recordLoginAttempt(email, user.id, ip, ua, true, "password");
  return issueSession(user, signer, { mfaPending: user.mfaEnabled });
}

export async function refresh(
  token: string,
  rotate: boolean,
  signer: TokenSigner
): Promise<AuthSession> {
  const tokenHash = hashRefreshToken(token);
  const record = await prisma.refreshToken.findFirst({
    where: { tokenHash, revoked: false, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!record) throw httpError("Invalid refresh token", 401, "UNAUTHORIZED");

  if (rotate) {
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  }
  return issueSession(record.user, signer);
}

export async function logout(token: string): Promise<void> {
  const tokenHash = hashRefreshToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revoked: false },
    data: { revoked: true },
  });
}

export async function issueSessionPublic(
  user: PrismaUser,
  signer: TokenSigner
): Promise<AuthSession> {
  return issueSession(user, signer);
}

export async function me(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw httpError("User not found", 404, "NOT_FOUND");
  return mapUser(user);
}

export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string }
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw httpError("User not found", 404, "NOT_FOUND");
  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw httpError("Invalid credentials", 401, "UNAUTHORIZED");
  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

// ─────────── Email verification ───────────

export async function sendVerificationEmail(user: PrismaUser): Promise<void> {
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
    },
  });
  const url = `${env.ELIXIO_WEB_URL}/auth/verify-email?token=${token}`;
  const tpl = verifyEmailTemplate({ verifyUrl: url });
  await sendEmail({ ...tpl, to: user.email });
}

export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = sha256Hex(token);
  const record = await prisma.emailVerification.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw httpError("Invalid or expired verification link", 400, "BAD_REQUEST");
  }
  await prisma.$transaction([
    prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date(), isVerified: true },
    }),
  ]);
}

// ─────────── Password reset ───────────

export async function requestPasswordReset(emailRaw: string): Promise<void> {
  const email = emailRaw.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silent — don't leak which emails exist
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
  });
  const url = `${env.ELIXIO_WEB_URL}/auth/reset-password?token=${token}`;
  const tpl = passwordResetTemplate({ url });
  await sendEmail({ ...tpl, to: user.email });
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string
): Promise<void> {
  const tokenHash = sha256Hex(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw httpError("Invalid or expired reset link", 400, "BAD_REQUEST");
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
  ]);
}

// ─────────── Magic link ───────────

export async function requestMagicLink(
  emailRaw: string,
  ip: string | null,
  ua: string | null
): Promise<{ sent: boolean }> {
  const email = emailRaw.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await recordLoginAttempt(email, null, ip, ua, false, "magic_link", "user_not_found");
    return { sent: true };
  }
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  await prisma.magicLinkToken.create({
    data: {
      email,
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
      ipAddress: ip ?? undefined,
      userAgent: ua ?? undefined,
    },
  });
  const url = `${env.ELIXIO_WEB_URL}/auth/magic-link?token=${token}`;
  const tpl = magicLinkTemplate({ url });
  await sendEmail({ ...tpl, to: user.email });
  await recordLoginAttempt(email, user.id, ip, ua, true, "magic_link_request");
  return { sent: true };
}

export async function consumeMagicLink(
  token: string,
  ip: string | null,
  ua: string | null,
  signer: TokenSigner
): Promise<AuthSession> {
  const tokenHash = sha256Hex(token);
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw httpError("Invalid or expired magic link", 400, "BAD_REQUEST");
  }
  if (!record.userId) {
    throw httpError("User not found", 404, "NOT_FOUND");
  }
  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) throw httpError("User not found", 404, "NOT_FOUND");

  await prisma.magicLinkToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  await recordLoginAttempt(user.email, user.id, ip, ua, true, "magic_link");
  return issueSession(user, signer, { mfaPending: user.mfaEnabled });
}

// ─────────── MFA: TOTP + backup codes ───────────

export interface TotpSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export async function beginTotpSetup(userId: string): Promise<TotpSetup> {
  const secret = totp.generateSecret();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw httpError("User not found", 404, "NOT_FOUND");
  const otpauthUrl = totp.keyUri(user.email, "Elixio Digital", secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  // Stash the unencrypted secret on the user record in `mfaEnrolledAt = null`
  // by writing a pending factor. We use a separate "pending" state by
  // checking that the user is not yet mfaEnabled — we store the secret
  // in a scratch column? Simpler: write it to a new MfaFactor with
  // totpSecretEnc but no lastUsedAt and no revokedAt — treat factors
  // with `lastUsedAt == null && revokedAt == null` as pending until
  // confirmed.
  await prisma.mfaFactor.create({
    data: {
      userId,
      type: "totp",
      totpSecretEnc: encrypt(secret),
    },
  });
  return { secret, otpauthUrl, qrCodeDataUrl };
}

export async function confirmTotpSetup(
  userId: string,
  code: string
): Promise<{ backupCodes: string[] }> {
  const pending = await prisma.mfaFactor.findFirst({
    where: { userId, type: "totp", revokedAt: null, lastUsedAt: null },
    orderBy: { enrolledAt: "desc" },
  });
  if (!pending || !pending.totpSecretEnc) throw httpError("No pending TOTP setup", 400, "BAD_REQUEST");
  const secret = decrypt(pending.totpSecretEnc);
  if (!totp.check(code, secret)) {
    throw httpError("Invalid code", 400, "BAD_REQUEST");
  }
  // Promote: set lastUsedAt = now, enable user.mfaEnabled, generate backup codes
  const backupCodes = Array.from({ length: 10 }, () => generateBackupCode());
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.mfaFactor.update({
      where: { id: pending.id },
      data: { lastUsedAt: new Date() },
    });
    await tx.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaEnrolledAt: new Date(), lastMfaVerifiedAt: new Date() },
    });
    for (const code of backupCodes) {
      await tx.mfaBackupCode.create({
        data: { userId, codeHash: await bcrypt.hash(code.toLowerCase().replace(/-/g, ""), SALT_ROUNDS) },
      });
    }
  });
  return { backupCodes };
}

export async function verifyMfa(
  userId: string,
  code: string,
  ip: string | null,
  ua: string | null
): Promise<{ verified: boolean }> {
  const factors = await prisma.mfaFactor.findMany({
    where: { userId, revokedAt: null, lastUsedAt: { not: null } },
  });
  for (const f of factors) {
    if (f.type === "totp" && f.totpSecretEnc) {
      const secret = safeDecryptOrNull(f.totpSecretEnc);
      if (secret && totp.check(code, secret)) {
        await prisma.mfaFactor.update({ where: { id: f.id }, data: { lastUsedAt: new Date() } });
        await prisma.user.update({ where: { id: userId }, data: { lastMfaVerifiedAt: new Date() } });
        await recordLoginAttempt((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).email, userId, ip, ua, true, "totp");
        return { verified: true };
      }
    }
  }
  // Try backup codes
  const cleanCode = code.toLowerCase().replace(/-/g, "");
  const backupCodes = await prisma.mfaBackupCode.findMany({ where: { userId, usedAt: null } });
  for (const bc of backupCodes) {
    if (await bcrypt.compare(cleanCode, bc.codeHash)) {
      await prisma.mfaBackupCode.update({ where: { id: bc.id }, data: { usedAt: new Date() } });
      await prisma.user.update({ where: { id: userId }, data: { lastMfaVerifiedAt: new Date() } });
      return { verified: true };
    }
  }
  await recordLoginAttempt((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).email, userId, ip, ua, false, "mfa", "invalid_code");
  throw httpError("Invalid MFA code", 401, "UNAUTHORIZED");
}

export async function disableMfa(
  userId: string,
  password: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw httpError("User not found", 404, "NOT_FOUND");
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw httpError("Invalid credentials", 401, "UNAUTHORIZED");
  }
  await prisma.$transaction([
    prisma.mfaFactor.updateMany({ where: { userId }, data: { revokedAt: new Date() } }),
    prisma.mfaBackupCode.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaEnrolledAt: null } }),
  ]);
}

export async function regenerateBackupCodes(
  userId: string,
  password: string
): Promise<{ backupCodes: string[] }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw httpError("User not found", 404, "NOT_FOUND");
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw httpError("Invalid credentials", 401, "UNAUTHORIZED");
  }
  const backupCodes = Array.from({ length: 10 }, () => generateBackupCode());
  const hashedCodes = await Promise.all(
    backupCodes.map((code) =>
      bcrypt.hash(code.toLowerCase().replace(/-/g, ""), SALT_ROUNDS)
    )
  );
  await prisma.$transaction([
    prisma.mfaBackupCode.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
    ...hashedCodes.map((codeHash) =>
      prisma.mfaBackupCode.create({ data: { userId, codeHash } })
    ),
  ]);
  return { backupCodes };
}

// ─────────── WebAuthn (passkeys) ───────────

export async function storeWebAuthnChallenge(
  userId: string | null,
  challenge: string,
  type: "registration" | "authentication"
): Promise<void> {
  await prisma.webAuthnChallenge.create({
    data: {
      userId: userId ?? undefined,
      challenge,
      type,
      expiresAt: new Date(Date.now() + WEBAUTHN_CHALLENGE_TTL_MS),
    },
  });
}

export async function consumeWebAuthnChallenge(
  challenge: string
): Promise<{ userId: string | null; type: string } | null> {
  const record = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  await prisma.webAuthnChallenge.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { userId: record.userId, type: record.type };
}
