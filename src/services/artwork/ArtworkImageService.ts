import { ArtworkImageRepository } from "@/repositories/artwork/ArtworkImageRepository";
import { StorageService, StorageValidationError } from "@/services/storage/StorageService";
import type { ArtworkImage } from "@prisma/client";

export class ArtworkImageServiceError extends Error {}

export const ArtworkImageService = {
  async addImage(
    artworkId: string,
    file: { buffer: Buffer; originalFilename: string; mimeType: string },
    altText?: string
  ): Promise<ArtworkImage> {
    let stored;
    try {
      stored = await StorageService.saveImage(file);
    } catch (error) {
      if (error instanceof StorageValidationError) throw new ArtworkImageServiceError(error.message);
      throw error;
    }

    const existingCount = await ArtworkImageRepository.countByArtwork(artworkId);

    return ArtworkImageRepository.create({
      artworkId,
      url: stored.url,
      altText: altText ?? null,
      displayOrder: existingCount,
      // First image uploaded becomes primary automatically, so the
      // exactly-one-primary invariant holds the moment images exist.
      isPrimary: existingCount === 0,
    });
  },

  async removeImage(imageId: string): Promise<void> {
    const image = await ArtworkImageRepository.findById(imageId);
    if (!image) throw new ArtworkImageServiceError("Image not found.");

    await ArtworkImageRepository.delete(imageId);
    await StorageService.delete(image.url.split("/").pop() ?? "");

    if (image.isPrimary) {
      const remaining = await ArtworkImageRepository.listByArtwork(image.artworkId);
      if (remaining.length > 0) await ArtworkImageRepository.setPrimary(remaining[0].id);
    }
  },

  async reorderImages(orderedImageIds: string[]): Promise<void> {
    await Promise.all(orderedImageIds.map((id, index) => ArtworkImageRepository.updateDisplayOrder(id, index)));
  },

  async setPrimaryImage(artworkId: string, imageId: string): Promise<void> {
    const image = await ArtworkImageRepository.findById(imageId);
    if (!image || image.artworkId !== artworkId) {
      throw new ArtworkImageServiceError("Image not found for this artwork.");
    }
    await ArtworkImageRepository.clearPrimary(artworkId);
    await ArtworkImageRepository.setPrimary(imageId);
  },
};