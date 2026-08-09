import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArtworkPublishingService, ArtworkPublishingError } from "@/services/artwork/ArtworkPublishingService";
import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";
import { ArtworkImageRepository } from "@/repositories/artwork/ArtworkImageRepository";

vi.mock("@/repositories/artwork/ArtworkRepository");
vi.mock("@/repositories/artwork/ArtworkImageRepository");

describe("ArtworkPublishingService", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects publishing without a primary image", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "1" } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([]);
    await expect(ArtworkPublishingService.publish("1")).rejects.toThrow(
      "Artwork must have exactly one primary image before publishing."
    );
  });

  it("rejects publishing when the primary image has no alt text", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "1" } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([
      { id: "img1", isPrimary: true, altText: "" } as never,
    ]);
    await expect(ArtworkPublishingService.publish("1")).rejects.toThrow(
      "Primary image must have alt text before publishing."
    );
  });

  it("publishes and records publishedAt when valid", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "1" } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([
      { id: "img1", isPrimary: true, altText: "A red bird" } as never,
    ]);
    vi.mocked(ArtworkRepository.updateStatus).mockImplementation(async (_id, data) => ({ status: data.status, publishedAt: data.publishedAt }) as never);

    const result = await ArtworkPublishingService.publish("1");
    expect(result.status).toBe("PUBLISHED");
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it("requires explicit confirmation for permanent deletion", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "1" } as never);
    await expect(ArtworkPublishingService.permanentDelete("1", false)).rejects.toThrow(
      "Permanent deletion requires explicit confirmation."
    );
  });

  it("unpublish returns artwork to Draft", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "1" } as never);
    vi.mocked(ArtworkRepository.updateStatus).mockResolvedValue({ status: "DRAFT" } as never);
    const result = await ArtworkPublishingService.unpublish("1");
    expect(result.status).toBe("DRAFT");
  });
});
