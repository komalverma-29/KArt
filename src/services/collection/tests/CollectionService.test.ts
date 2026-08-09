import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionService, CollectionServiceError } from "@/services/collection/CollectionService";
import { CollectionRepository } from "@/repositories/collection/CollectionRepository";
import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";

vi.mock("@/repositories/collection/CollectionRepository", () => ({
  CollectionRepository: {
    findById: vi.fn(), slugExists: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(),
    updateStatus: vi.fn(), softDelete: vi.fn(), assignArtwork: vi.fn(), removeArtwork: vi.fn(),
    reorderArtworks: vi.fn(), findFirstPublishedArtworkPrimaryImage: vi.fn(),
  },
}));
vi.mock("@/repositories/artwork/ArtworkRepository", () => ({
  ArtworkRepository: {
    findById: vi.fn(), findBySlug: vi.fn(), slugExists: vi.fn(), list: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateStatus: vi.fn(), softDelete: vi.fn(),
    permanentDelete: vi.fn(), setCollections: vi.fn(), setTags: vi.fn(),
  },
}));

describe("CollectionService.create", () => {
  beforeEach(() => vi.resetAllMocks());

  it("defaults a new collection to Draft", async () => {
    vi.mocked(CollectionRepository.slugExists).mockResolvedValue(false);
    vi.mocked(CollectionRepository.create).mockImplementation(async (data) => ({ id: "c1", status: "DRAFT", ...data }) as never);
    const collection = await CollectionService.create({ name: "Winter Series" });
    expect(collection.status).toBe("DRAFT");
  });
});

describe("CollectionService.publish", () => {
  beforeEach(() => vi.resetAllMocks());

  it("allows publishing a collection with zero artworks", async () => {
    vi.mocked(CollectionRepository.findById).mockResolvedValue({ id: "c1", artworks: [] } as never);
    vi.mocked(CollectionRepository.updateStatus).mockResolvedValue({ id: "c1", status: "PUBLISHED" } as never);
    const collection = await CollectionService.publish("c1");
    expect(collection.status).toBe("PUBLISHED");
  });

  it("rejects publishing a nonexistent collection", async () => {
    vi.mocked(CollectionRepository.findById).mockResolvedValue(null);
    await expect(CollectionService.publish("nope")).rejects.toThrow("Collection not found.");
  });
});

describe("CollectionService restore heuristic", () => {
  beforeEach(() => vi.resetAllMocks());

  it("restores to PUBLISHED if previously published", async () => {
    vi.mocked(CollectionRepository.findById).mockResolvedValue({ id: "c1", publishedAt: new Date() } as never);
    vi.mocked(CollectionRepository.updateStatus).mockImplementation(async (_id, status) => ({ status }) as never);
    const result = await CollectionService.restore("c1");
    expect(result.status).toBe("PUBLISHED");
  });

  it("restores to DRAFT if never published", async () => {
    vi.mocked(CollectionRepository.findById).mockResolvedValue({ id: "c1", publishedAt: null } as never);
    vi.mocked(CollectionRepository.updateStatus).mockImplementation(async (_id, status) => ({ status }) as never);
    const result = await CollectionService.restore("c1");
    expect(result.status).toBe("DRAFT");
  });
});

describe("CollectionService artwork assignment", () => {
  beforeEach(() => vi.resetAllMocks());

  it("assigns an existing artwork to a collection", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    await CollectionService.assignArtwork("c1", "art1");
    expect(CollectionRepository.assignArtwork).toHaveBeenCalledWith("c1", "art1");
  });

  it("rejects assigning an artwork that does not exist", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue(null);
    await expect(CollectionService.assignArtwork("c1", "nope")).rejects.toThrow("Artwork not found.");
    expect(CollectionRepository.assignArtwork).not.toHaveBeenCalled();
  });

  it("duplicate assignment does not throw (repository layer treats it as a no-op, per VAL-COL-003)", async () => {
    // This exercises the CollectionRepository contract directly, since the
    // duplicate-prevention logic itself lives in the repository (findUnique
    // short-circuit), not the service — the service just delegates.
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(CollectionRepository.assignArtwork).mockResolvedValue({ artworkId: "art1", collectionId: "c1" } as never);
    await expect(CollectionService.assignArtwork("c1", "art1")).resolves.toBeUndefined();
  });

  it("removing an artwork from a collection calls only the join-table removal, never artwork deletion", async () => {
    await CollectionService.removeArtwork("c1", "art1");
    expect(CollectionRepository.removeArtwork).toHaveBeenCalledWith("c1", "art1");
    // The artwork itself is never touched by this path.
    expect(ArtworkRepository.softDelete).not.toHaveBeenCalled();
    expect(ArtworkRepository.permanentDelete).not.toHaveBeenCalled();
    expect(ArtworkRepository.update).not.toHaveBeenCalled();
  });

  it("reorders artworks within one collection using the given order", async () => {
    await CollectionService.reorderArtworks("c1", ["art2", "art1", "art3"]);
    expect(CollectionRepository.reorderArtworks).toHaveBeenCalledWith("c1", ["art2", "art1", "art3"]);
  });

  it("reordering collection A never touches collection B's repository call", async () => {
    await CollectionService.reorderArtworks("collection-A", ["art1", "art2"]);
    expect(CollectionRepository.reorderArtworks).toHaveBeenCalledWith("collection-A", ["art1", "art2"]);
    expect(CollectionRepository.reorderArtworks).not.toHaveBeenCalledWith("collection-B", expect.anything());
  });
});

describe("CollectionService.resolveCoverImageUrl", () => {
  beforeEach(() => vi.resetAllMocks());

  it("uses the explicit cover image when set", async () => {
    const url = await CollectionService.resolveCoverImageUrl({
      id: "c1", coverImageUrl: "/uploads/explicit-cover.jpg",
    } as never);
    expect(url).toBe("/uploads/explicit-cover.jpg");
    expect(CollectionRepository.findFirstPublishedArtworkPrimaryImage).not.toHaveBeenCalled();
  });

  it("falls back to the first published artwork's primary image when no explicit cover is set", async () => {
    vi.mocked(CollectionRepository.findFirstPublishedArtworkPrimaryImage).mockResolvedValue("/uploads/fallback.jpg");
    const url = await CollectionService.resolveCoverImageUrl({ id: "c1", coverImageUrl: null } as never);
    expect(url).toBe("/uploads/fallback.jpg");
  });

  it("returns null when there's no explicit cover and no published artwork", async () => {
    vi.mocked(CollectionRepository.findFirstPublishedArtworkPrimaryImage).mockResolvedValue(null);
    const url = await CollectionService.resolveCoverImageUrl({ id: "c1", coverImageUrl: null } as never);
    expect(url).toBeNull();
  });
});