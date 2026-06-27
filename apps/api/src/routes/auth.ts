import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import {
  register as svcRegister,
  login as svcLogin,
  refresh as svcRefresh,
  logout as svcLogout,
  me as svcMe,
  changePassword as svcChangePassword,
  sendVerificationEmail,
  verifyEmail as svcVerifyEmail,
  requestPasswordReset as svcRequestReset,
  confirmPasswordReset as svcConfirmReset,
  requestMagicLink as svcRequestMagicLink,
  consumeMagicLink as svcConsumeMagicLink,
  beginTotpSetup,
  confirmTotpSetup,
  verifyMfa,
  disableMfa as svcDisableMfa,
  regenerateBackupCodes as svcRegenBackupCodes,
  type TokenSigner,
} from "../services/auth.js";
import {
  beginOAuth,
  completeOAuth,
} from "../services/oauth.js";
import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  beginPasskeyLogin,
  finishPasskeyLogin,
  listPasskeys,
  deletePasskey,
} from "../services/webauthn.js";
import { httpError } from "../lib/errors.js";
import {
  limitLogin,
  limitRegister,
  limitPasswordReset,
  limitMagicLink,
  limitMfa,
} from "../lib/rate-limit.js";

// Reuse the strong-password schema from the shared package so client
// and server validate the same way. The shared schema also enforces
// the 1 letter + 1 number + 1 special character rule.
import { registerSchema as sharedRegisterSchema } from "@elixio/shared";
const registerSchema = sharedRegisterSchema;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
  rotate: z.boolean().default(true),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

const emailSchema = z.object({ email: z.string().email() });

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

const magicLinkRequestSchema = z.object({ email: z.string().email() });
const magicLinkConsumeSchema = z.object({ token: z.string().min(1) });

const mfaCodeSchema = z.object({ code: z.string().min(4).max(20) });
const mfaDisableSchema = z.object({ password: z.string().min(1) });
const backupRegenSchema = z.object({ password: z.string().min(1) });

const oauthBeginSchema = z.object({
  provider: z.enum(["google", "github"]),
  redirectUri: z.string().url(),
});

const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

function makeSigner(app: FastifyInstance): TokenSigner {
  return {
    signAccessToken: (payload) => app.jwt.sign(payload),
    createRefreshToken: () => randomBytes(64).toString("hex"),
  };
}

function clientIp(request: FastifyRequest): string | null {
  return (request.ip as string) ?? null;
}

function userAgent(request: FastifyRequest): string | null {
  return request.headers["user-agent"] ?? null;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── Email + password ────────────────────────────────────────────
  app.post("/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);
    // Per-IP rate limit on registration (anti-spam). 5 per hour.
    await limitRegister(clientIp(request) ?? "unknown");
    const session = await svcRegister(input, clientIp(request), userAgent(request), makeSigner(app));
    reply.status(201).send(session);
  });

  app.post("/login", async (request) => {
    const input = loginSchema.parse(request.body);
    // Per-(user OR IP) rate limit. We use the email first, falling
    // back to IP if the email doesn't match a known user. This way
    // attackers can't bypass by rotating emails, and legitimate
    // users with a typo don't get locked out.
    const key = input.email.toLowerCase();
    await limitLogin(key);
    return svcLogin(input, clientIp(request), userAgent(request), makeSigner(app));
  });

  app.post("/refresh", async (request) => {
    const input = refreshSchema.parse(request.body);
    return svcRefresh(input.refreshToken, input.rotate, makeSigner(app));
  });

  app.post("/logout", async (request, reply) => {
    const input = refreshSchema.parse(request.body);
    await svcLogout(input.refreshToken);
    reply.status(204).send();
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    return svcMe(request.user.userId);
  });

  app.patch("/change-password", { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = changePasswordSchema.parse(request.body);
    await svcChangePassword(request.user.userId, input);
    reply.status(204).send();
  });

  // ── Email verification ──────────────────────────────────────────
  app.post("/verify-email/request", { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await svcMe(request.user.userId);
    const dbUser = await import("../lib/prisma.js").then((m) =>
      m.prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    );
    await sendVerificationEmail(dbUser);
    reply.status(202).send({ sent: true });
  });

  app.post("/verify-email", async (request, reply) => {
    const { token } = z.object({ token: z.string().min(1) }).parse(request.body);
    await svcVerifyEmail(token);
    reply.status(204).send();
  });

  // ── Password reset ──────────────────────────────────────────────
  app.post("/password-reset/request", async (request, reply) => {
    const { email } = emailSchema.parse(request.body);
    await limitPasswordReset(email.toLowerCase());
    await svcRequestReset(email);
    reply.status(202).send({ sent: true });
  });

  app.post("/password-reset/confirm", async (request, reply) => {
    const input = passwordResetConfirmSchema.parse(request.body);
    await svcConfirmReset(input.token, input.newPassword);
    reply.status(204).send();
  });

  // ── Magic link ──────────────────────────────────────────────────
  app.post("/magic-link/request", async (request, reply) => {
    const { email } = magicLinkRequestSchema.parse(request.body);
    await limitMagicLink(email.toLowerCase());
    const result = await svcRequestMagicLink(email, clientIp(request), userAgent(request));
    reply.status(202).send(result);
  });

  app.post("/magic-link/consume", async (request) => {
    const { token } = magicLinkConsumeSchema.parse(request.body);
    return svcConsumeMagicLink(token, clientIp(request), userAgent(request), makeSigner(app));
  });

  // ── MFA: TOTP + backup codes ────────────────────────────────────
  app.post("/mfa/totp/setup", { preHandler: [app.authenticate] }, async (request) => {
    await limitMfa(request.user.userId);
    const me = await svcMe(request.user.userId);
    return beginTotpSetup(me.id);
  });

  app.post("/mfa/totp/confirm", { preHandler: [app.authenticate] }, async (request) => {
    await limitMfa(request.user.userId);
    const { code } = mfaCodeSchema.parse(request.body);
    const me = await svcMe(request.user.userId);
    return confirmTotpSetup(me.id, code);
  });

  app.post("/mfa/verify", async (request) => {
    // Called from the login page after login returned mfaRequired: true.
    // Body includes an mfaToken (short-lived JWT carrying userId).
    const { mfaToken, code } = z.object({
      mfaToken: z.string().min(1),
      code: z.string().min(4).max(20),
    }).parse(request.body);
    let payload: { sub: string; typ: string };
    try {
      payload = app.jwt.verify(mfaToken) as { sub: string; typ: string };
    } catch {
      throw httpError("Invalid MFA token", 401, "UNAUTHORIZED");
    }
    if (payload.typ !== "mfa") throw httpError("Wrong token type", 401, "UNAUTHORIZED");
    await verifyMfa(payload.sub, code, clientIp(request), userAgent(request));
    // Mint a fresh access+refresh pair for the now-fully-verified user.
    const me = await svcMe(payload.sub);
    return { ok: true, user: me };
  });

  app.post("/mfa/disable", { preHandler: [app.authenticate] }, async (request) => {
    const { password } = mfaDisableSchema.parse(request.body);
    await svcDisableMfa(request.user.userId, password);
  });

  app.post("/mfa/backup-codes/regenerate", { preHandler: [app.authenticate] }, async (request) => {
    const { password } = backupRegenSchema.parse(request.body);
    return svcRegenBackupCodes(request.user.userId, password);
  });

  // ── OAuth (Google, GitHub) ──────────────────────────────────────
  app.post("/oauth/begin", async (request) => {
    const { provider, redirectUri } = oauthBeginSchema.parse(request.body);
    return beginOAuth(provider, redirectUri);
  });

  app.get("/oauth/:provider/callback", async (request, reply) => {
    const provider = (request.params as { provider: string }).provider;
    if (provider !== "google" && provider !== "github") {
      throw httpError("Unknown provider", 400, "BAD_REQUEST");
    }
    const { code, state } = oauthCallbackSchema.parse(request.query);
    const result = await completeOAuth(provider, code, state);
    const oneTimeCode = randomBytes(32).toString("base64url");
    const { prisma } = await import("../lib/prisma.js");
    await prisma.webAuthnChallenge.create({
      data: {
        challenge: oneTimeCode,
        type: `oauth_exchange:${result.userId}`,
        expiresAt: new Date(Date.now() + 60_000),
        userId: result.userId,
      },
    });
    const url = new URL(result.redirectUri);
    url.searchParams.set("code", oneTimeCode);
    reply.redirect(url.toString(), 302);
  });

  app.post("/oauth/exchange", async (request) => {
    const { code } = z.object({ code: z.string().min(1) }).parse(request.body);
    const { prisma } = await import("../lib/prisma.js");
    const challenge = await prisma.webAuthnChallenge.findUnique({ where: { challenge: code } });
    if (!challenge || !challenge.type.startsWith("oauth_exchange:") || challenge.expiresAt < new Date()) {
      throw httpError("Invalid or expired OAuth code", 400, "BAD_REQUEST");
    }
    if (!challenge.userId) throw httpError("Missing user", 400, "BAD_REQUEST");
    await prisma.webAuthnChallenge.update({ where: { id: challenge.id }, data: { usedAt: new Date() } });
    // Mint a fresh session for this user
    const user = await prisma.user.findUniqueOrThrow({ where: { id: challenge.userId } });
    const signer = makeSigner(app);
    return (
      await import("../services/auth.js")
    ).issueSessionPublic(user, signer);
  });

  // ── WebAuthn (passkeys) ─────────────────────────────────────────
  app.post("/passkey/register/begin", { preHandler: [app.authenticate] }, async (request) => {
    const me = await svcMe(request.user.userId);
    return beginPasskeyRegistration(me.id, me.email);
  });

  app.post("/passkey/register/finish", { preHandler: [app.authenticate] }, async (request) => {
    const me = await svcMe(request.user.userId);
    return finishPasskeyRegistration(me.id, request.body as never);
  });

  app.post("/passkey/login/begin", async () => beginPasskeyLogin());

  app.post("/passkey/login/finish", async (request) => {
    const { userId } = await finishPasskeyLogin(request.body as never);
    const { prisma } = await import("../lib/prisma.js");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const { issueSessionPublic } = await import("../services/auth.js");
    const session = await issueSessionPublic(user, makeSigner(app));
    return { session, user: session.user };
  });

  app.get("/passkey/list", { preHandler: [app.authenticate] }, async (request) => {
    const me = await svcMe(request.user.userId);
    return listPasskeys(me.id);
  });

  app.delete("/passkey/:id", { preHandler: [app.authenticate] }, async (request) => {
    const me = await svcMe(request.user.userId);
    const id = (request.params as { id: string }).id;
    await deletePasskey(me.id, id);
  });
}
