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
