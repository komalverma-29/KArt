import { prisma } from "@/lib/prisma";

export const ArtworkImageRepository = {
  async listByArtwork(artworkId: string) {
    return prisma.artworkImage.findMany({ where: { artworkId }, orderBy: { displayOrder: "asc" } });
  },

  async findById(id: string) {
    return prisma.artworkImage.findUnique({ where: { id } });
  },

  async create(data: { artworkId: string; url: string; altText?: string | null; displayOrder: number; isPrimary: boolean }) {
    return prisma.artworkImage.create({ data });
  },

  async delete(id: string) {
    await prisma.artworkImage.delete({ where: { id } });
  },

  async updateDisplayOrder(id: string, displayOrder: number) {
    await prisma.artworkImage.update({ where: { id }, data: { displayOrder } });
  },

  async clearPrimary(artworkId: string) {
    await prisma.artworkImage.updateMany({ where: { artworkId, isPrimary: true }, data: { isPrimary: false } });
  },

  async setPrimary(id: string) {
    await prisma.artworkImage.update({ where: { id }, data: { isPrimary: true } });
  },

  async countByArtwork(artworkId: string) {
    return prisma.artworkImage.count({ where: { artworkId } });
  },
};