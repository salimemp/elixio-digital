import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { mapUser } from "../lib/mappers.js";
import { httpError } from "../lib/errors.js";
import type {
  AuthSession,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  User,
} from "@elixio/shared";
import type { User as PrismaUser } from "@prisma/client";

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL_SECONDS = 900;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface TokenSigner {
  signAccessToken(payload: {
    userId: string;
    email: string;
    isCreator: boolean;
    isAdmin: boolean;
  }): string;
  createRefreshToken(): string;
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function createSession(user: PrismaUser, signer: TokenSigner): Promise<AuthSession> {
  const accessToken = signer.signAccessToken({
    userId: user.id,
    email: user.email,
    isCreator: user.isCreator,
    isAdmin: user.role === "admin",
  });
  const refreshToken = signer.createRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return {
    user: mapUser(user),
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    },
  };
}

export async function register(input: RegisterInput, signer: TokenSigner): Promise<AuthSession> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existing) {
    throw httpError("Email already registered", 409, "CONFLICT");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      displayName: input.displayName,
      role: "buyer",
      isBuyer: true,
      isCreator: false,
    },
  });

  return createSession(user, signer);
}

export async function login(input: LoginInput, signer: TokenSigner): Promise<AuthSession> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user) {
    throw httpError("Invalid credentials", 401, "UNAUTHORIZED");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);

  if (!valid) {
    throw httpError("Invalid credentials", 401, "UNAUTHORIZED");
  }

  return createSession(user, signer);
}

export async function refresh(token: string, signer: TokenSigner): Promise<AuthSession> {
  const tokenHash = hashRefreshToken(token);

  const record = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!record) {
    throw httpError("Invalid refresh token", 401, "UNAUTHORIZED");
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revoked: true },
  });

  return createSession(record.user, signer);
}

export async function logout(token: string): Promise<void> {
  const tokenHash = hashRefreshToken(token);

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revoked: false },
    data: { revoked: true },
  });
}

export async function me(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw httpError("User not found", 404, "NOT_FOUND");
  }

  return mapUser(user);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw httpError("User not found", 404, "NOT_FOUND");
  }

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);

  if (!valid) {
    throw httpError("Invalid credentials", 401, "UNAUTHORIZED");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
