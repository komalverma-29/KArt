import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArtworkService, ArtworkServiceError } from "@/services/artwork/ArtworkService";
import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";
import { CategoryRepository } from "@/repositories/category/CategoryRepository";

vi.mock("@/repositories/artwork/ArtworkRepository");
vi.mock("@/repositories/category/CategoryRepository");

describe("ArtworkService", () => {
  beforeEach(() => vi.resetAllMocks());

  it("creates artwork as Draft by default", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ACTIVE" } as never);
    vi.mocked(ArtworkRepository.slugExists).mockResolvedValue(false);
    vi.mocked(ArtworkRepository.create).mockImplementation(async (data) => ({ id: "art1", ...data }) as never);
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1", status: "DRAFT" } as never);

    const artwork = await ArtworkService.create({ title: "Sunset", categoryId: "cat1" });
    expect(artwork.status).toBe("DRAFT");
  });

  it("rejects an archived category", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ARCHIVED" } as never);
    await expect(ArtworkService.create({ title: "Sunset", categoryId: "cat1" })).rejects.toThrow(
      "Archived categories cannot be assigned to artwork."
    );
  });

  it("requires a price when forSale is true", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ACTIVE" } as never);
    await expect(
      ArtworkService.create({ title: "Sunset", categoryId: "cat1", forSale: true })
    ).rejects.toThrow("Price is required when artwork is marked For Sale.");
  });

  it("rejects a negative price", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ACTIVE" } as never);
    await expect(
      ArtworkService.create({ title: "Sunset", categoryId: "cat1", forSale: true, price: -5 })
    ).rejects.toThrow("Price cannot be negative.");
  });

  it("duplicate creates a new Draft artwork without publication metadata", async () => {
    vi.mocked(ArtworkRepository.findById)
      .mockResolvedValueOnce({
        id: "art1", title: "Sunset", slug: "sunset", categoryId: "cat1",
        availability: "AVAILABLE", forSale: false, price: null,
        collections: [], tags: [], description: null, story: null,
      } as never)
      .mockResolvedValueOnce({ id: "art2", status: "DRAFT", publishedAt: null } as never);
    vi.mocked(ArtworkRepository.slugExists).mockResolvedValue(false);
    vi.mocked(ArtworkRepository.create).mockResolvedValue({ id: "art2" } as never);

    const duplicate = await ArtworkService.duplicate("art1");
    expect(duplicate.id).toBe("art2");
    expect(duplicate.status).toBe("DRAFT");
    expect(duplicate.publishedAt).toBeNull();
  });
});