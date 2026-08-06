import { PrismaClient } from "@prisma/client";

/**
 * Prisma is the only component permitted to communicate with PostgreSQL
 * (tech.md — ORM). This singleton prevents exhausting database connections
 * from Next.js dev-server hot reloads.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
