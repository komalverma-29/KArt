import { prisma } from "@/lib/prisma";
import type { ContentStatus } from "@prisma/client";

export const CollectionRepository = {
  async findById(id: string) {
    return prisma.collection.findFirst({
      where: { id, deletedAt: null },
      include: {
        artworks: { include: { artwork: { include: { images: true } } }, orderBy: { displayOrder: "asc" } },
      },
    });
  },

  async slugExists(slug: string) {
    return (await prisma.collection.findUnique({ where: { slug } })) !== null;
  },

  async list(filters: { status?: ContentStatus; featured?: boolean } = {}) {
    return prisma.collection.findMany({
      where: {
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.featured !== undefined ? { featured: filters.featured } : {}),
      },
      include: { _count: { select: { artworks: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: { name: string; slug: string; description?: string | null; coverImageUrl?: string | null; featured?: boolean }) {
    return prisma.collection.create({ data });
  },

  async update(id: string, data: Partial<{ name: string; description: string | null; coverImageUrl: string | null; featured: boolean }>) {
    return prisma.collection.update({ where: { id }, data });
  },

  async updateStatus(id: string, status: ContentStatus, publishedAt?: Date | null) {
    return prisma.collection.update({ where: { id }, data: { status, publishedAt } });
  },

  async softDelete(id: string) {
    await prisma.collection.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async assignArtwork(collectionId: string, artworkId: string) {
    const existing = await prisma.artworkCollection.findUnique({
      where: { artworkId_collectionId: { artworkId, collectionId } },
    });
    if (existing) return existing; // VAL-COL-003 — duplicate assignments are silently ignored, not errored.

    const maxOrder = await prisma.artworkCollection.aggregate({
      where: { collectionId },
      _max: { displayOrder: true },
    });

    return prisma.artworkCollection.create({
      data: { collectionId, artworkId, displayOrder: (maxOrder._max.displayOrder ?? -1) + 1 },
    });
  },

  async removeArtwork(collectionId: string, artworkId: string) {
    await prisma.artworkCollection.deleteMany({ where: { collectionId, artworkId } });
  },

  async reorderArtworks(collectionId: string, orderedArtworkIds: string[]) {
    await prisma.$transaction(
      orderedArtworkIds.map((artworkId, index) =>
        prisma.artworkCollection.update({
          where: { artworkId_collectionId: { artworkId, collectionId } },
          data: { displayOrder: index },
        })
      )
    );
  },

  async findFirstPublishedArtworkPrimaryImage(collectionId: string) {
    const link = await prisma.artworkCollection.findFirst({
      where: { collectionId, artwork: { status: "PUBLISHED", deletedAt: null } },
      include: { artwork: { include: { images: { where: { isPrimary: true } } } } },
      orderBy: { displayOrder: "asc" },
    });
    return link?.artwork.images[0]?.url ?? null;
  },
};