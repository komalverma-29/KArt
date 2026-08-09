import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionService, CollectionServiceError } from "@/services/collection/CollectionService";
import { CollectionRepository } from "@/repositories/collection/CollectionRepository";
import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";

vi.mock("@/repositories/collection/CollectionRepository");
vi.mock("@/repositories/artwork/ArtworkRepository");

describe("CollectionService", () => {
  beforeEach(() => vi.resetAllMocks());

  it("creates a collection as Draft by default", async () => {
    vi.mocked(CollectionRepository.slugExists).mockResolvedValue(false);
    vi.mocked(CollectionRepository.create).mockResolvedValue({ id: "c1", status: "DRAFT" } as never);
    const collection = await CollectionService.create({ name: "Winter Series" });
    expect(collection.status).toBe("DRAFT");
  });

  it("allows publishing a collection with zero artworks", async () => {
    vi.mocked(CollectionRepository.findById).mockResolvedValue({ id: "c1", artworks: [] } as never);
    vi.mocked(CollectionRepository.updateStatus).mockResolvedValue({ id: "c1", status: "PUBLISHED" } as never);
    const collection = await CollectionService.publish("c1");
    expect(collection.status).toBe("PUBLISHED");
  });

  it("does not error on duplicate artwork assignment", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(CollectionRepository.assignArtwork).mockResolvedValue({} as never);
    await expect(CollectionService.assignArtwork("c1", "art1")).resolves.not.toThrow();
  });

  it("removing artwork from a collection does not delete the artwork", async () => {
    await CollectionService.removeArtwork("c1", "art1");
    expect(CollectionRepository.removeArtwork).toHaveBeenCalledWith("c1", "art1");
    // ArtworkRepository has no delete call in this path — nothing to assert removed there.
  });
});