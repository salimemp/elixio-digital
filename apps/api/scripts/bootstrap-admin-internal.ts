/**
 * In-container admin bootstrap.
 *
 * Idempotent: creates the admin if missing, otherwise updates the
 * password and ensures isAdmin/emailVerified/role are set. Designed to
 * be called from entrypoint.sh with ADMIN_BOOTSTRAP_EMAIL and
 * ADMIN_BOOTSTRAP_PASSWORD env vars set.
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

  if (!email || !password) {
    console.error("ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are required");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      isAdmin: true,
      role: "admin",
      emailVerified: true,
    },
    create: {
      email,
      passwordHash,
      displayName: "Admin",
      isAdmin: true,
      role: "admin",
      emailVerified: true,
    },
  });

  console.log(`[bootstrap-admin] admin ready: ${user.email} (id=${user.id}, isAdmin=${user.isAdmin})`);
}

main()
  .catch((err) => {
    console.error("[bootstrap-admin] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });