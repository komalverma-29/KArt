import { prisma } from "@/lib/prisma";
import type { ContentStatus } from "@prisma/client";

export const StoryRepository = {
  async findById(id: string) {
    return prisma.story.findFirst({ where: { id, deletedAt: null }, include: { relatedArtworks: { include: { artwork: true } } } });
  },

  async slugExists(slug: string) {
    return (await prisma.story.findUnique({ where: { slug } })) !== null;
  },

  async list(filters: { status?: ContentStatus; featured?: boolean } = {}) {
    return prisma.story.findMany({
      where: {
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.featured !== undefined ? { featured: filters.featured } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: { title: string; slug: string; content: string; featuredImage?: string | null; featured?: boolean }) {
    return prisma.story.create({ data });
  },

  async update(id: string, data: Partial<{ title: string; content: string; featuredImage: string | null; featured: boolean }>) {
    return prisma.story.update({ where: { id }, data });
  },

  async updateStatus(id: string, status: ContentStatus, publishedAt?: Date | null) {
    return prisma.story.update({ where: { id }, data: { status, publishedAt } });
  },

  async softDelete(id: string) {
    await prisma.story.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async setRelatedArtworks(storyId: string, artworkIds: string[]) {
    await prisma.$transaction(async (tx) => {
      await tx.storyArtwork.deleteMany({ where: { storyId } });
      if (artworkIds.length > 0) {
        await tx.storyArtwork.createMany({ data: artworkIds.map((artworkId) => ({ storyId, artworkId })) });
      }
    });
  },
};