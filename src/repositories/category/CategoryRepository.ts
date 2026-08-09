import { prisma } from "@/lib/prisma";
import type { CategoryStatus } from "@prisma/client";

export const CategoryRepository = {
  async findById(id: string) {
    return prisma.category.findFirst({ where: { id, deletedAt: null } });
  },

  async slugExists(slug: string) {
    return (await prisma.category.findUnique({ where: { slug } })) !== null;
  },

  async nameExists(name: string, excludeId?: string) {
    const found = await prisma.category.findFirst({
      where: { name, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    return found !== null;
  },

  async list(filters: { status?: CategoryStatus } = {}) {
    return prisma.category.findMany({
      where: { deletedAt: null, ...(filters.status ? { status: filters.status } : {}) },
      include: { _count: { select: { artworks: true } } },
      orderBy: { name: "asc" },
    });
  },

  async create(data: { name: string; slug: string; description?: string | null }) {
    return prisma.category.create({ data });
  },

  async update(id: string, data: Partial<{ name: string; description: string | null }>) {
    return prisma.category.update({ where: { id }, data });
  },

  async updateStatus(id: string, status: CategoryStatus) {
    return prisma.category.update({ where: { id }, data: { status } });
  },

  async countArtworks(id: string) {
    return prisma.artwork.count({ where: { categoryId: id, deletedAt: null } });
  },

  async softDelete(id: string) {
    await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};