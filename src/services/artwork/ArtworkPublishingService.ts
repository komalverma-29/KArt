import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";
import { ArtworkImageRepository } from "@/repositories/artwork/ArtworkImageRepository";
import type { Artwork } from "@prisma/client";

export class ArtworkPublishingError extends Error {}

async function assertExists(id: string) {
  const artwork = await ArtworkRepository.findById(id);
  if (!artwork) throw new ArtworkPublishingError("Artwork not found.");
  return artwork;
}

export const ArtworkPublishingService = {
  async publish(id: string): Promise<Artwork> {
    await assertExists(id);

    const images = await ArtworkImageRepository.listByArtwork(id);
    const primaryImages = images.filter((img) => img.isPrimary);

    if (primaryImages.length !== 1) {
      throw new ArtworkPublishingError("Artwork must have exactly one primary image before publishing.");
    }
    if (!primaryImages[0].altText || primaryImages[0].altText.trim().length === 0) {
      throw new ArtworkPublishingError("Primary image must have alt text before publishing.");
    }

    return ArtworkRepository.updateStatus(id, { status: "PUBLISHED", publishedAt: new Date() });
  },

  async unpublish(id: string): Promise<Artwork> {
    await assertExists(id);
    return ArtworkRepository.updateStatus(id, { status: "DRAFT" });
  },

  async archive(id: string): Promise<Artwork> {
    await assertExists(id);
    return ArtworkRepository.updateStatus(id, { status: "ARCHIVED", archivedAt: new Date() });
  },

  async restore(id: string): Promise<Artwork> {
    const artwork = await assertExists(id);
    // The schema has no separate "status before archive" field, so
    // publishedAt is used as the signal for which state to restore to:
    // if the artwork was ever published, restore to Published;
    // otherwise Draft. Documented as an approximation in the report.
    const restoredStatus = artwork.publishedAt ? "PUBLISHED" : "DRAFT";
    return ArtworkRepository.updateStatus(id, { status: restoredStatus, archivedAt: null });
  },

  async softDelete(id: string): Promise<void> {
    await assertExists(id);
    await ArtworkRepository.softDelete(id);
  },

  async permanentDelete(id: string, confirmed: boolean): Promise<void> {
    if (!confirmed) throw new ArtworkPublishingError("Permanent deletion requires explicit confirmation.");
    await assertExists(id);
    await ArtworkRepository.permanentDelete(id);
  },
};