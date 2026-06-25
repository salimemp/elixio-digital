/**
 * In-container admin bootstrap.
 *
 * Idempotent: creates the admin if missing, otherwise updates the
 * password and ensures role/emailVerifiedAt are set. Designed to be
 * called from entrypoint.sh with ADMIN_BOOTSTRAP_EMAIL and
 * ADMIN_BOOTSTRAP_PASSWORD env vars set.
 *
 * If ADMIN_BOOTSTRAP_RENAME_FROM is set, the existing user with that
 * email is renamed to ADMIN_BOOTSTRAP_EMAIL first. Use this for
 * domain migrations (e.g. admin@old.example.com → admin@new.example.com).
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const renameFrom = process.env.ADMIN_BOOTSTRAP_RENAME_FROM;

  if (!email || !password) {
    console.error("ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are required");
    process.exit(1);
  }

  // Optional one-time rename for domain migrations.
  if (renameFrom && renameFrom !== email) {
    const existing = await prisma.user.findUnique({ where: { email: renameFrom } });
    if (existing) {
      // Bail if the target email is already taken by another user.
      const target = await prisma.user.findUnique({ where: { email } });
      if (target && target.id !== existing.id) {
        console.error(`[bootstrap-admin] cannot rename ${renameFrom} → ${email}: target already taken by id=${target.id}`);
        process.exit(1);
      }
      const renamed = await prisma.user.update({
        where: { id: existing.id },
        data: { email },
      });
      console.log(`[bootstrap-admin] renamed ${renameFrom} → ${renamed.email} (id=${renamed.id})`);
    } else {
      console.log(`[bootstrap-admin] rename skipped: ${renameFrom} not found`);
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "admin",
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      displayName: "Admin",
      role: "admin",
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`[bootstrap-admin] admin ready: ${user.email} (id=${user.id}, role=${user.role})`);
}

main()
  .catch((err) => {
    console.error("[bootstrap-admin] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });