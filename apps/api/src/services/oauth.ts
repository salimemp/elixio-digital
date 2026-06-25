import { Google, GitHub, generateState, generateCodeVerifier } from "arctic";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { httpError } from "../lib/errors.js";
import { encrypt } from "../lib/crypto.js";
import type { OAuthProvider } from "@prisma/client";

const STATE_TTL_MS = 10 * 60 * 1000;

function googleClient(): Google {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw httpError("Google OAuth not configured", 501, "NOT_IMPLEMENTED");
  }
  return new Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.ELIXIO_API_URL}/v1/auth/oauth/google/callback`
  );
}

function githubClient(): GitHub {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw httpError("GitHub OAuth not configured", 501, "NOT_IMPLEMENTED");
  }
  return new GitHub(
    env.GITHUB_CLIENT_ID,
    env.GITHUB_CLIENT_SECRET,
    `${env.ELIXIO_API_URL}/v1/auth/oauth/github/callback`
  );
}

interface BeginResult {
  authorizationUrl: string;
  state: string;
}

export async function beginOAuth(
  provider: OAuthProvider,
  appRedirectUri: string
): Promise<BeginResult> {
  const state = generateState();
  let authUrl: URL;
  if (provider === "google") {
    const c = googleClient();
    const codeVerifier = generateCodeVerifier();
    authUrl = c.createAuthorizationURL(state, codeVerifier, [
      "openid",
      "email",
      "profile",
    ]);
    // Persist both state and codeVerifier so the callback can verify.
    await prisma.webAuthnChallenge.create({
      data: {
        challenge: state,
        type: `oauth_state:${provider}:${appRedirectUri}:${codeVerifier}`,
        expiresAt: new Date(Date.now() + STATE_TTL_MS),
      },
    });
  } else if (provider === "github") {
    const c = githubClient();
    authUrl = c.createAuthorizationURL(state, ["read:user", "user:email"]);
    await prisma.webAuthnChallenge.create({
      data: {
        challenge: state,
        type: `oauth_state:${provider}:${appRedirectUri}`,
        expiresAt: new Date(Date.now() + STATE_TTL_MS),
      },
    });
  } else {
    throw httpError("Unsupported provider", 400, "BAD_REQUEST");
  }
  return { authorizationUrl: authUrl.toString(), state };
}

interface OAuthProfile {
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
}

async function completeGoogle(code: string, codeVerifier: string): Promise<OAuthProfile> {
  const c = googleClient();
  const tokens = await c.validateAuthorizationCode(code, codeVerifier);
  const accessToken = tokens.accessToken();
  const refreshToken = tokens.refreshToken() ?? null;
  const expiresAt = tokens.accessTokenExpiresAt();

  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw httpError("Google userinfo failed", 502, "UPSTREAM");
  const profile = (await res.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  return {
    providerAccountId: profile.sub,
    email: profile.email ?? null,
    displayName: profile.name ?? null,
    avatarUrl: profile.picture ?? null,
    accessToken,
    refreshToken,
    expiresAt,
    scope: "openid email profile",
  };
}

async function completeGithub(code: string): Promise<OAuthProfile> {
  const c = githubClient();
  const tokens = await c.validateAuthorizationCode(code);
  const accessToken = tokens.accessToken();
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "ElixioDigital" },
  });
  if (!res.ok) throw httpError("GitHub userinfo failed", 502, "UPSTREAM");
  const profile = (await res.json()) as {
    id: number;
    login: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
  let email = profile.email ?? null;
  if (!email) {
    const emailRes = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "ElixioDigital" },
    });
    if (emailRes.ok) {
      const emails = (await emailRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary?.email ?? emails[0]?.email ?? null;
    }
  }
  return {
    providerAccountId: String(profile.id),
    email,
    displayName: profile.name ?? profile.login,
    avatarUrl: profile.avatar_url ?? null,
    accessToken,
    refreshToken: null,
    expiresAt: null,
    scope: "read:user user:email",
  };
}

export async function completeOAuth(
  provider: OAuthProvider,
  code: string,
  state: string
): Promise<{ redirectUri: string; userId: string }> {
  const challenge = await prisma.webAuthnChallenge.findUnique({ where: { challenge: state } });
  if (!challenge || !challenge.type.startsWith(`oauth_state:${provider}:`)) {
    throw httpError("Invalid OAuth state", 400, "BAD_REQUEST");
  }
  if (challenge.expiresAt < new Date()) {
    throw httpError("OAuth state expired", 400, "BAD_REQUEST");
  }
  const rest = challenge.type.slice(`oauth_state:${provider}:`.length);
  const parts = rest.split(":");
  const appRedirectUri = parts[0];
  const codeVerifier = parts[1];
  await prisma.webAuthnChallenge.delete({ where: { id: challenge.id } });

  const profile =
    provider === "google"
      ? await completeGoogle(code, codeVerifier ?? "")
      : await completeGithub(code);
  if (!profile.email) {
    throw httpError("OAuth provider did not return an email", 400, "BAD_REQUEST");
  }

  const email = profile.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const { randomToken } = await import("../lib/tokens.js");
    const bcrypt = await import("bcryptjs");
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(randomToken(32), 12),
        displayName: profile.displayName ?? email.split("@")[0],
        avatarUrl: profile.avatarUrl ?? undefined,
        role: "buyer",
        isBuyer: true,
        isCreator: false,
        emailVerifiedAt: new Date(),
        isVerified: true,
      },
    });
  }

  await prisma.oAuthAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    create: {
      userId: user.id,
      provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      accessTokenEnc: encrypt(profile.accessToken),
      refreshTokenEnc: profile.refreshToken ? encrypt(profile.refreshToken) : undefined,
      expiresAt: profile.expiresAt ?? undefined,
      scope: profile.scope ?? undefined,
    },
    update: {
      accessTokenEnc: encrypt(profile.accessToken),
      refreshTokenEnc: profile.refreshToken ? encrypt(profile.refreshToken) : undefined,
      expiresAt: profile.expiresAt ?? undefined,
      scope: profile.scope ?? undefined,
      email: profile.email,
    },
  });

  return { redirectUri: appRedirectUri, userId: user.id };
}
