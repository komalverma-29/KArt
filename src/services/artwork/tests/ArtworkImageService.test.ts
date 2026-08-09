import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArtworkImageService, ArtworkImageServiceError } from "@/services/artwork/ArtworkImageService";
import { ArtworkImageRepository } from "@/repositories/artwork/ArtworkImageRepository";
import { StorageService, StorageValidationError } from "@/services/storage/StorageService";

vi.mock("@/repositories/artwork/ArtworkImageRepository", () => ({
  ArtworkImageRepository: {
    listByArtwork: vi.fn(), findById: vi.fn(), create: vi.fn(), delete: vi.fn(),
    updateDisplayOrder: vi.fn(), clearPrimary: vi.fn(), setPrimary: vi.fn(), countByArtwork: vi.fn(),
  },
}));
vi.mock("@/services/storage/StorageService", () => ({
  StorageService: { saveImage: vi.fn(), delete: vi.fn() },
  StorageValidationError: class StorageValidationError extends Error {},
}));

describe("ArtworkImageService.addImage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("the first image uploaded becomes primary automatically", async () => {
    vi.mocked(StorageService.saveImage).mockResolvedValue({ url: "/uploads/a.jpg", storageKey: "a.jpg" });
    vi.mocked(ArtworkImageRepository.countByArtwork).mockResolvedValue(0);
    vi.mocked(ArtworkImageRepository.create).mockImplementation(async (data) => ({ id: "img1", ...data }) as never);

    const image = await ArtworkImageService.addImage("art1", {
      buffer: Buffer.from("fake"), originalFilename: "a.jpg", mimeType: "image/jpeg",
    });
    expect(image.isPrimary).toBe(true);
  });

  it("subsequent images are NOT automatically primary", async () => {
    vi.mocked(StorageService.saveImage).mockResolvedValue({ url: "/uploads/b.jpg", storageKey: "b.jpg" });
    vi.mocked(ArtworkImageRepository.countByArtwork).mockResolvedValue(2);
    vi.mocked(ArtworkImageRepository.create).mockImplementation(async (data) => ({ id: "img3", ...data }) as never);

    const image = await ArtworkImageService.addImage("art1", {
      buffer: Buffer.from("fake"), originalFilename: "b.jpg", mimeType: "image/jpeg",
    });
    expect(image.isPrimary).toBe(false);
    expect(image.displayOrder).toBe(2);
  });

  it("wraps storage validation errors as ArtworkImageServiceError", async () => {
    vi.mocked(StorageService.saveImage).mockRejectedValue(new StorageValidationError("Unsupported file type."));
    await expect(
      ArtworkImageService.addImage("art1", { buffer: Buffer.from("x"), originalFilename: "a.gif", mimeType: "image/gif" })
    ).rejects.toThrow(ArtworkImageServiceError);
  });
});

describe("ArtworkImageService.reorderImages", () => {
  beforeEach(() => vi.resetAllMocks());

  it("assigns sequential displayOrder matching the given order", async () => {
    await ArtworkImageService.reorderImages(["img3", "img1", "img2"]);
    expect(ArtworkImageRepository.updateDisplayOrder).toHaveBeenCalledWith("img3", 0);
    expect(ArtworkImageRepository.updateDisplayOrder).toHaveBeenCalledWith("img1", 1);
    expect(ArtworkImageRepository.updateDisplayOrder).toHaveBeenCalledWith("img2", 2);
  });
});

describe("ArtworkImageService.setPrimaryImage — exactly-one-primary invariant", () => {
  beforeEach(() => vi.resetAllMocks());

  it("clears the existing primary before setting a new one", async () => {
    vi.mocked(ArtworkImageRepository.findById).mockResolvedValue({ id: "img2", artworkId: "art1" } as never);

    await ArtworkImageService.setPrimaryImage("art1", "img2");

    expect(ArtworkImageRepository.clearPrimary).toHaveBeenCalledWith("art1");
    expect(ArtworkImageRepository.setPrimary).toHaveBeenCalledWith("img2");
    // clearPrimary must happen before setPrimary — otherwise the new primary gets cleared too.
    const clearOrder = vi.mocked(ArtworkImageRepository.clearPrimary).mock.invocationCallOrder[0];
    const setOrder = vi.mocked(ArtworkImageRepository.setPrimary).mock.invocationCallOrder[0];
    expect(clearOrder).toBeLessThan(setOrder);
  });

  it("rejects setting a primary image that belongs to a different artwork", async () => {
    vi.mocked(ArtworkImageRepository.findById).mockResolvedValue({ id: "img2", artworkId: "OTHER_ARTWORK" } as never);
    await expect(ArtworkImageService.setPrimaryImage("art1", "img2")).rejects.toThrow(
      "Image not found for this artwork."
    );
    expect(ArtworkImageRepository.clearPrimary).not.toHaveBeenCalled();
  });
});

describe("ArtworkImageService.removeImage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("removes a non-primary image without reassigning primary", async () => {
    vi.mocked(ArtworkImageRepository.findById).mockResolvedValue({
      id: "img2", artworkId: "art1", isPrimary: false, url: "/uploads/b.jpg",
    } as never);

    await ArtworkImageService.removeImage("img2");

    expect(ArtworkImageRepository.delete).toHaveBeenCalledWith("img2");
    expect(ArtworkImageRepository.setPrimary).not.toHaveBeenCalled();
  });

  it("reassigns primary to the next remaining image when the primary is removed", async () => {
    vi.mocked(ArtworkImageRepository.findById).mockResolvedValue({
      id: "img1", artworkId: "art1", isPrimary: true, url: "/uploads/a.jpg",
    } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([
      { id: "img2" } as never,
      { id: "img3" } as never,
    ]);

    await ArtworkImageService.removeImage("img1");
    expect(ArtworkImageRepository.setPrimary).toHaveBeenCalledWith("img2");
  });

  it("leaves zero images with no primary when the last image is removed (no crash)", async () => {
    vi.mocked(ArtworkImageRepository.findById).mockResolvedValue({
      id: "img1", artworkId: "art1", isPrimary: true, url: "/uploads/a.jpg",
    } as never);
    vi.mocked(ArtworkImageRepository.listByArtwork).mockResolvedValue([]);

    await expect(ArtworkImageService.removeImage("img1")).resolves.toBeUndefined();
    expect(ArtworkImageRepository.setPrimary).not.toHaveBeenCalled();
  });
});