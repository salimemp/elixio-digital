import prismaPkg from "@prisma/client";
import type { PrismaClient as PrismaClientType } from "@prisma/client";

// Prisma client is CJS — default import + destructure works across
// ESM/CJS interop boundaries in Node 22+.
const { PrismaClient } = prismaPkg;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
