/**
 * prisma/seed.ts
 *
 * Feature 1.7 — Minimal development seed.
 *
 * Per tasks.md Task 1.7.2, this script creates ONLY the single
 * Artist account required to unblock local development (BR-001:
 * KArt supports exactly one artist account).
 *
 * It intentionally does NOT create:
 *   - artworks
 *   - collections
 *   - categories
 *   - stories
 *   - orders
 *   - commissions
 *   - contact messages
 *   - any other fabricated content
 *
 * Credentials are read from environment variables so no secret is
 * ever hardcoded or committed. See .env.example for the expected keys.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ARTIST_EMAIL;
  const password = process.env.SEED_ARTIST_PASSWORD;
  const fullName = process.env.SEED_ARTIST_FULL_NAME ?? "Artist";

  if (!email || !password) {
    throw new Error(
      "SEED_ARTIST_EMAIL and SEED_ARTIST_PASSWORD must be set (see .env.example) before seeding."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.artist.findUnique({ where: { email } });

  if (existing) {
    console.log(`Artist account already exists for ${email}. Skipping creation.`);
    return;
  }

  const artist = await prisma.artist.create({
    data: {
      email,
      passwordHash,
      fullName,
    },
  });

  console.log(`Created Artist account: ${artist.email} (${artist.id})`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });