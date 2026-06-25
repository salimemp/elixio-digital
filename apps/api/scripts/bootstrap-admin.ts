/**
 * Bootstrap admin script.
 *
 * One-time operation that:
 *   1. Creates the first admin user (idempotent — re-runs update password)
 *   2. Marks the user as email-verified
 *   3. Mints a long-lived refresh token (14 days, non-rotating)
 *   4. Prints the token so the operator can save it as
 *      ELIXIO_DIGITAL_ADMIN_TOKEN in GitHub Secrets
 *
 * Usage:
 *   pnpm tsx scripts/bootstrap-admin.ts <email> <password> [--print-only]
 *
 * `--print-only` re-prints an existing admin's existing tokens without
 * minting a new one. Use this if you lost the token.
 *
 * Requirements:
 *   DATABASE_URL must be set in env or apps/api/.env
 */

import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const SALT_ROUNDS = 12;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  const args = process.argv.slice(2);
  const printOnly = args.includes("--print-only");
  const positional = args.filter((a) => !a.startsWith("--"));
  const [emailArg, passwordArg] = positional;

  if (!printOnly && (!emailArg || !passwordArg)) {
    console.error("Usage: pnpm tsx scripts/bootstrap-admin.ts <email> <password> [--print-only]");
    process.exit(2);
  }

  if (printOnly) {
    if (!emailArg) {
      console.error("--print-only requires an email to look up.");
      process.exit(2);
    }
    const user = await prisma.user.findUnique({ where: { email: emailArg.toLowerCase() } });
    if (!user || user.role !== "admin") {
      console.error(`No admin user with email ${emailArg}.`);
      process.exit(1);
    }
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: user.id, revoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (tokens.length === 0) {
      console.error("No active refresh tokens for this admin. Re-run without --print-only to mint a new one.");
      process.exit(1);
    }
    // We can't recover the original token — only the hash. So we mint a fresh one
    // and revoke all existing ones, then print the new one.
    const token = randomBytes(64).toString("hex");
    const tokenHash = hashToken(token);
    await prisma.$transaction([
      prisma.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } }),
      prisma.refreshToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
      }),
    ]);
    console.log("✓ Fresh admin refresh token minted (all previous ones revoked):");
    console.log(`  ELIXIO_DIGITAL_ADMIN_TOKEN=${token}`);
    console.log("");
    console.log(`  Expires: ${new Date(Date.now() + REFRESH_TTL_MS).toISOString()}`);
    console.log(`  Admin email: ${user.email}`);
    return;
  }

  const email = emailArg.toLowerCase();
  const password = passwordArg;

  // Validate password strength — this is the master admin.
  if (password.length < 12) {
    console.error("Admin password must be at least 12 characters.");
    process.exit(2);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      displayName: email.split("@")[0],
      role: "admin",
      isBuyer: false,
      isCreator: false,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
    update: {
      // Re-runs rotate the password and keep the admin flag.
      passwordHash,
      role: "admin",
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
  });

  // Revoke any existing admin tokens, then mint a fresh one.
  const token = randomBytes(64).toString("hex");
  const tokenHash = hashToken(token);
  await prisma.$transaction([
    prisma.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } }),
    prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
    }),
  ]);

  console.log("");
  console.log("════════════════════════════════════════════════════════════════");
  console.log("  ✓ Elixio Digital admin bootstrapped");
  console.log("════════════════════════════════════════════════════════════════");
  console.log(`  User:    ${user.email}`);
  console.log(`  User ID: ${user.id}`);
  console.log(`  Role:    admin`);
  console.log(`  Email verified: ${user.emailVerifiedAt ? "yes" : "yes (just set)"}`);
  console.log("");
  console.log("  Save the token below as ELIXIO_DIGITAL_ADMIN_TOKEN in:");
  console.log("    GitHub → salimemp/elixio-digital → Settings → Secrets");
  console.log("");
  console.log(`  ELIXIO_DIGITAL_ADMIN_TOKEN=${token}`);
  console.log("");
  console.log(`  Expires: ${new Date(Date.now() + REFRESH_TTL_MS).toISOString()} (14 days)`);
  console.log("");
  console.log("  Re-run with --print-only <email> to mint a fresh token later.");
  console.log("════════════════════════════════════════════════════════════════");
}

main()
  .catch((err) => {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
