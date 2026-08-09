import { prisma } from "@/lib/prisma";
import type { Availability, ContentStatus, Prisma } from "@prisma/client";

export interface ArtworkListFilters {
  status?: ContentStatus;
  categoryId?: string;
  collectionId?: string;
  availability?: Availability;
  search?: string;
}

const artworkInclude = {
  category: true,
  images: { orderBy: { displayOrder: "asc" as const } },
  collections: { include: { collection: true } },
  tags: { include: { tag: true } },
};

export const ArtworkRepository = {
  async findById(id: string) {
    return prisma.artwork.findFirst({ where: { id, deletedAt: null }, include: artworkInclude });
  },

  async findBySlug(slug: string) {
    return prisma.artwork.findFirst({ where: { slug, deletedAt: null }, include: artworkInclude });
  },

  async slugExists(slug: string) {
    return (await prisma.artwork.findUnique({ where: { slug } })) !== null;
  },

  async list(filters: ArtworkListFilters = {}) {
    const where: Prisma.ArtworkWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.availability ? { availability: filters.availability } : {}),
      ...(filters.collectionId ? { collections: { some: { collectionId: filters.collectionId } } } : {}),
      ...(filters.search ? { title: { contains: filters.search, mode: "insensitive" } } : {}),
    };

    return prisma.artwork.findMany({ where, include: artworkInclude, orderBy: { createdAt: "desc" } });
  },

  async create(data: Prisma.ArtworkUncheckedCreateInput) {
    return prisma.artwork.create({ data, include: artworkInclude });
  },

  async update(id: string, data: Prisma.ArtworkUncheckedUpdateInput) {
    return prisma.artwork.update({ where: { id }, data, include: artworkInclude });
  },

  async updateStatus(
    id: string,
    data: { status: ContentStatus; publishedAt?: Date | null; archivedAt?: Date | null }
  ) {
    return prisma.artwork.update({ where: { id }, data, include: artworkInclude });
  },

  async softDelete(id: string) {
    await prisma.artwork.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async permanentDelete(id: string) {
    await prisma.artwork.delete({ where: { id } });
  },

  async setCollections(artworkId: string, collectionIds: string[]) {
    await prisma.$transaction(async (tx) => {
      await tx.artworkCollection.deleteMany({ where: { artworkId } });
      if (collectionIds.length > 0) {
        await tx.artworkCollection.createMany({
          data: collectionIds.map((collectionId, index) => ({ artworkId, collectionId, displayOrder: index })),
        });
      }
    });
  },

  async setTags(artworkId: string, tagNames: string[]) {
    await prisma.$transaction(async (tx) => {
      await tx.artworkTag.deleteMany({ where: { artworkId } });
      for (const name of tagNames) {
        const tag = await tx.tag.upsert({ where: { name }, update: {}, create: { name } });
        await tx.artworkTag.create({ data: { artworkId, tagId: tag.id } });
      }
    });
  },
};