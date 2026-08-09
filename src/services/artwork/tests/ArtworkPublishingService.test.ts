import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArtworkPublishingService, ArtworkPublishingError } from "@/services/artwork/ArtworkPublishingService";
import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";
import { ArtworkImageRepository } from "@/repositories/artwork/ArtworkImageRepository";

vi.mock("@/repositories/artwork/ArtworkRepository", () => ({
  ArtworkRepository: {
    findById: vi.fn(), findBySlug: vi.fn(), slugExists: vi.fn(), list: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateStatus: vi.fn(), softDelete: vi.fn(),
    permanentDelete: vi.fn(), setCollections: vi.fn(), setTags: vi.fn(),
  },
}));
vi.mock("@/repositories/artwork/ArtworkImageRepository", () => ({
  ArtworkImageRepository: {
    listByArtwork: vi.fn(), findById: vi.fn(), create: vi.fn(), delete: vi.fn(),
    updateDisplayOrder: vi.fn(), clearPrimary: vi.fn(), setPrimary: vi.fn(), countByArtwork: vi.fn(),
  },
}));

describe("ArtworkPublishingService.publish", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects publishing an artwork with zero images", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([]);
    await expect(ArtworkPublishingService.publish("art1")).rejects.toThrow(
      "Artwork must have exactly one primary image before publishing."
    );
  });

  it("rejects publishing an artwork with images but none marked primary", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([
      { id: "img1", isPrimary: false, altText: "A bird" } as never,
    ]);
    await expect(ArtworkPublishingService.publish("art1")).rejects.toThrow(
      "Artwork must have exactly one primary image before publishing."
    );
  });

  it("rejects publishing when more than one image is marked primary (invariant violated upstream)", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([
      { id: "img1", isPrimary: true, altText: "A" } as never,
      { id: "img2", isPrimary: true, altText: "B" } as never,
    ]);
    await expect(ArtworkPublishingService.publish("art1")).rejects.toThrow(
      "Artwork must have exactly one primary image before publishing."
    );
  });

  it("rejects publishing when the primary image has empty alt text", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([
      { id: "img1", isPrimary: true, altText: "" } as never,
    ]);
    await expect(ArtworkPublishingService.publish("art1")).rejects.toThrow(
      "Primary image must have alt text before publishing."
    );
  });

  it("rejects publishing when the primary image alt text is whitespace only", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([
      { id: "img1", isPrimary: true, altText: "   " } as never,
    ]);
    await expect(ArtworkPublishingService.publish("art1")).rejects.toThrow(
      "Primary image must have alt text before publishing."
    );
  });

  it("publishes successfully and records publishedAt when valid", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([
      { id: "img1", isPrimary: true, altText: "A red bird on a branch" } as never,
    ]);
    vi.mocked(ArtworkRepository.updateStatus).mockImplementation(
      async (_id, data) => ({ status: data.status, publishedAt: data.publishedAt }) as never
    );

    const result = await ArtworkPublishingService.publish("art1");
    expect(result.status).toBe("PUBLISHED");
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it("rejects publishing a nonexistent artwork", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue(null);
    await expect(ArtworkPublishingService.publish("nope")).rejects.toThrow("Artwork not found.");
  });
});

describe("ArtworkPublishingService.unpublish", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns a published artwork to Draft", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(ArtworkRepository.updateStatus).mockResolvedValue({ status: "DRAFT" } as never);
    const result = await ArtworkPublishingService.unpublish("art1");
    expect(result.status).toBe("DRAFT");
    expect(ArtworkRepository.updateStatus).toHaveBeenCalledWith("art1", { status: "DRAFT" });
  });
});

describe("ArtworkPublishingService.archive / restore", () => {
  beforeEach(() => vi.resetAllMocks());

  it("archive() sets status ARCHIVED and records archivedAt", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(ArtworkRepository.updateStatus).mockImplementation(
      async (_id, data) => ({ status: data.status, archivedAt: data.archivedAt }) as never
    );
    const result = await ArtworkPublishingService.archive("art1");
    expect(result.status).toBe("ARCHIVED");
    expect(result.archivedAt).toBeInstanceOf(Date);
  });

  it("restore() returns to PUBLISHED if the artwork was previously published", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1", publishedAt: new Date() } as never);
    vi.mocked(ArtworkRepository.updateStatus).mockImplementation(async (_id, data) => ({ status: data.status }) as never);
    const result = await ArtworkPublishingService.restore("art1");
    expect(result.status).toBe("PUBLISHED");
  });

  it("restore() returns to DRAFT if the artwork was never published", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1", publishedAt: null } as never);
    vi.mocked(ArtworkRepository.updateStatus).mockImplementation(async (_id, data) => ({ status: data.status }) as never);
    const result = await ArtworkPublishingService.restore("art1");
    expect(result.status).toBe("DRAFT");
  });
});

describe("ArtworkPublishingService deletion", () => {
  beforeEach(() => vi.resetAllMocks());

  it("softDelete() calls the repository soft-delete path", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    await ArtworkPublishingService.softDelete("art1");
    expect(ArtworkRepository.softDelete).toHaveBeenCalledWith("art1");
    expect(ArtworkRepository.permanentDelete).not.toHaveBeenCalled();
  });

  it("permanentDelete() rejects without explicit confirmation", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    await expect(ArtworkPublishingService.permanentDelete("art1", false)).rejects.toThrow(
      "Permanent deletion requires explicit confirmation."
    );
    expect(ArtworkRepository.permanentDelete).not.toHaveBeenCalled();
  });

  it("permanentDelete() proceeds when confirmed is true", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);
    await ArtworkPublishingService.permanentDelete("art1", true);
    expect(ArtworkRepository.permanentDelete).toHaveBeenCalledWith("art1");
  });
});