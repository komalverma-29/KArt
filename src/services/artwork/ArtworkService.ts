import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";
import { CategoryRepository } from "@/repositories/category/CategoryRepository";
import { generateUniqueSlug } from "@/lib/uniqueSlug";
import type { Artwork, Availability } from "@prisma/client";

export class ArtworkServiceError extends Error {}

export interface ArtworkInput {
  title: string;
  description?: string;
  story?: string;
  categoryId: string;
  collectionIds?: string[];
  tags?: string[];
  availability?: Availability;
  forSale?: boolean;
  price?: number | null;
  featured?: boolean;
}

async function assertActiveCategory(categoryId: string) {
  const category = await CategoryRepository.findById(categoryId);
  if (!category) throw new ArtworkServiceError("Selected category does not exist.");
  if (category.status !== "ACTIVE") throw new ArtworkServiceError("Archived categories cannot be assigned to artwork.");
}

function assertPricing(forSale: boolean, price: number | null | undefined) {
  if (forSale && (price === null || price === undefined)) {
    throw new ArtworkServiceError("Price is required when artwork is marked For Sale.");
  }
  if (price !== null && price !== undefined && price < 0) {
    throw new ArtworkServiceError("Price cannot be negative.");
  }
}

export const ArtworkService = {
  async getById(id: string) {
    return ArtworkRepository.findById(id);
  },

  async list(filters: Parameters<typeof ArtworkRepository.list>[0] = {}) {
    return ArtworkRepository.list(filters);
  },

  async create(input: ArtworkInput): Promise<Artwork> {
    await assertActiveCategory(input.categoryId);
    const forSale = input.forSale ?? false;
    assertPricing(forSale, input.price ?? null);

    const slug = await generateUniqueSlug(input.title, (c) => ArtworkRepository.slugExists(c));

    const artwork = await ArtworkRepository.create({
      title: input.title,
      slug,
      description: input.description,
      story: input.story,
      categoryId: input.categoryId,
      availability: input.availability ?? "AVAILABLE",
      forSale,
      price: forSale ? input.price : null,
      featured: input.featured ?? false,
      status: "DRAFT",
    });

    if (input.collectionIds?.length) await ArtworkRepository.setCollections(artwork.id, input.collectionIds);
    if (input.tags?.length) await ArtworkRepository.setTags(artwork.id, input.tags);

    return (await ArtworkRepository.findById(artwork.id))!;
  },

  async update(id: string, input: Partial<ArtworkInput>): Promise<Artwork> {
    const existing = await ArtworkRepository.findById(id);
    if (!existing) throw new ArtworkServiceError("Artwork not found.");

    if (input.categoryId) await assertActiveCategory(input.categoryId);

    const forSale = input.forSale ?? existing.forSale;
    const price = input.price !== undefined ? input.price : existing.price ? Number(existing.price) : null;
    assertPricing(forSale, price);

    await ArtworkRepository.update(id, {
      title: input.title,
      description: input.description,
      story: input.story,
      categoryId: input.categoryId,
      availability: input.availability,
      forSale,
      price: forSale ? price : null,
      featured: input.featured,
    });

    if (input.collectionIds) await ArtworkRepository.setCollections(id, input.collectionIds);
    if (input.tags) await ArtworkRepository.setTags(id, input.tags);

    return (await ArtworkRepository.findById(id))!;
  },

  async duplicate(id: string): Promise<Artwork> {
    const original = await ArtworkRepository.findById(id);
    if (!original) throw new ArtworkServiceError("Artwork not found.");

    const slug = await generateUniqueSlug(`${original.title}-copy`, (c) => ArtworkRepository.slugExists(c));

    const duplicate = await ArtworkRepository.create({
      title: `${original.title} (Copy)`,
      slug,
      description: original.description,
      story: original.story,
      categoryId: original.categoryId,
      availability: original.availability,
      forSale: original.forSale,
      price: original.price,
      featured: false,
      status: "DRAFT",
      // publishedAt / archivedAt intentionally omitted (FR-ART-024).
    });

    const collectionIds = original.collections.map((c) => c.collectionId);
    if (collectionIds.length) await ArtworkRepository.setCollections(duplicate.id, collectionIds);

    const tagNames = original.tags.map((t) => t.tag.name);
    if (tagNames.length) await ArtworkRepository.setTags(duplicate.id, tagNames);

    // Images are NOT copied — duplicating file storage is out of scope,
    // and the artist reviews/re-uploads before publishing the copy.

    return (await ArtworkRepository.findById(duplicate.id))!;
  },
};