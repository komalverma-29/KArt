import { prisma } from "@/lib/prisma";
import type { Artist } from "@prisma/client";

/**
 * Shared by the Auth and Settings domains (design.md §6).
 * Pure data access only — no authentication business logic here.
 */
export const ArtistRepository = {
  async findByEmail(email: string): Promise<Artist | null> {
    return prisma.artist.findUnique({ where: { email } });
  },

  async findById(id: string): Promise<Artist | null> {
    return prisma.artist.findUnique({ where: { id } });
  },

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await prisma.artist.update({
      where: { id },
      data: { passwordHash },
    });
  },
};