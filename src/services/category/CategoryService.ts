import { CategoryRepository } from "@/repositories/category/CategoryRepository";
import { generateUniqueSlug } from "@/lib/uniqueSlug";
import type { CategoryStatus } from "@prisma/client";

export class CategoryServiceError extends Error {}

export const CategoryService = {
  async list(status?: CategoryStatus) {
    return CategoryRepository.list({ status });
  },

  async getById(id: string) {
    return CategoryRepository.findById(id);
  },

  async create(
    input: { name: string; description?: string }
  ) {
    if (await CategoryRepository.nameExists(input.name)) {
      throw new CategoryServiceError("Category name already exists.");
    }

    const slug = await generateUniqueSlug(
      input.name,
      (c) => CategoryRepository.slugExists(c)
    );

    return CategoryRepository.create({
      name: input.name,
      slug,
      description: input.description ?? null,
    });
  },

  async update(
    id: string,
    input: { name?: string; description?: string }
  ) {
    const category = await CategoryRepository.findById(id);

    if (!category) {
      throw new CategoryServiceError("Category not found.");
    }

    if (input.name && input.name !== category.name) {
      if (await CategoryRepository.nameExists(input.name, id)) {
        throw new CategoryServiceError("Category name already exists.");
      }
    }

    return CategoryRepository.update(id, {
      name: input.name,
      description: input.description,
    });
  },

  async archive(id: string) {
    if (!(await CategoryRepository.findById(id))) {
      throw new CategoryServiceError("Category not found.");
    }

    return CategoryRepository.updateStatus(id, "ARCHIVED");
  },

  async restore(id: string) {
    if (!(await CategoryRepository.findById(id))) {
      throw new CategoryServiceError("Category not found.");
    }

    return CategoryRepository.updateStatus(id, "ACTIVE");
  },

  async delete(id: string) {
    if (!(await CategoryRepository.findById(id))) {
      throw new CategoryServiceError("Category not found.");
    }

    const artworkCount = await CategoryRepository.countArtworks(id);

    if (artworkCount > 0) {
      throw new CategoryServiceError(
        "Category cannot be deleted because artwork is assigned to it."
      );
    }

    await CategoryRepository.softDelete(id);
  },
};
