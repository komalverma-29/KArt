import { CollectionRepository } from "@/repositories/collection/CollectionRepository";
import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";
import { generateUniqueSlug } from "@/lib/uniqueSlug";
import type { Collection, ContentStatus } from "@prisma/client";

export class CollectionServiceError extends Error {}

export interface CollectionInput {
  name: string;
  description?: string;
  coverImageUrl?: string;
  featured?: boolean;
}

export const CollectionService = {
  async list(filters: { status?: ContentStatus; featured?: boolean } = {}) {
    return CollectionRepository.list(filters);
  },

  async getById(id: string) {
    return CollectionRepository.findById(id);
  },

  async create(input: CollectionInput): Promise<Collection> {
    const slug = await generateUniqueSlug(input.name, (c) => CollectionRepository.slugExists(c));
    return CollectionRepository.create({
      name: input.name,
      slug,
      description: input.description ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      featured: input.featured ?? false,
    });
  },

  async update(id: string, input: Partial<CollectionInput>): Promise<Collection> {
    if (!(await CollectionRepository.findById(id))) throw new CollectionServiceError("Collection not found.");
    return CollectionRepository.update(id, {
      name: input.name,
      description: input.description,
      coverImageUrl: input.coverImageUrl,
      featured: input.featured,
    });
  },

  async publish(id: string): Promise<Collection> {
    if (!(await CollectionRepository.findById(id))) throw new CollectionServiceError("Collection not found.");
    // A collection may be published with zero artworks (VAL-COL-004).
    return CollectionRepository.updateStatus(id, "PUBLISHED", new Date());
  },

  async archive(id: string): Promise<Collection> {
    if (!(await CollectionRepository.findById(id))) throw new CollectionServiceError("Collection not found.");
    return CollectionRepository.updateStatus(id, "ARCHIVED");
  },

  async restore(id: string): Promise<Collection> {
    const existing = await CollectionRepository.findById(id);
    if (!existing) throw new CollectionServiceError("Collection not found.");
    const restoredStatus: ContentStatus = existing.publishedAt ? "PUBLISHED" : "DRAFT";
    return CollectionRepository.updateStatus(id, restoredStatus);
  },

  async delete(id: string): Promise<void> {
    if (!(await CollectionRepository.findById(id))) throw new CollectionServiceError("Collection not found.");
    await CollectionRepository.softDelete(id);
  },

  async assignArtwork(collectionId: string, artworkId: string): Promise<void> {
    if (!(await ArtworkRepository.findById(artworkId))) throw new CollectionServiceError("Artwork not found.");
    await CollectionRepository.assignArtwork(collectionId, artworkId);
  },

  async removeArtwork(collectionId: string, artworkId: string): Promise<void> {
    await CollectionRepository.removeArtwork(collectionId, artworkId);
  },

  async reorderArtworks(collectionId: string, orderedArtworkIds: string[]): Promise<void> {
    await CollectionRepository.reorderArtworks(collectionId, orderedArtworkIds);
  },

  async resolveCoverImageUrl(collection: Collection): Promise<string | null> {
    if (collection.coverImageUrl) return collection.coverImageUrl;
    return CollectionRepository.findFirstPublishedArtworkPrimaryImage(collection.id);
  },
};