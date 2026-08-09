import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArtworkService, ArtworkServiceError } from "@/services/artwork/ArtworkService";
import { ArtworkRepository } from "@/repositories/artwork/ArtworkRepository";
import { CategoryRepository } from "@/repositories/category/CategoryRepository";

vi.mock("@/repositories/artwork/ArtworkRepository", () => ({
  ArtworkRepository: {
    findById: vi.fn(), findBySlug: vi.fn(), slugExists: vi.fn(), list: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateStatus: vi.fn(), softDelete: vi.fn(),
    permanentDelete: vi.fn(), setCollections: vi.fn(), setTags: vi.fn(),
  },
}));
vi.mock("@/repositories/category/CategoryRepository", () => ({
  CategoryRepository: {
    findById: vi.fn(), slugExists: vi.fn(), nameExists: vi.fn(), list: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateStatus: vi.fn(), countArtworks: vi.fn(), softDelete: vi.fn(),
  },
}));

describe("ArtworkService.create", () => {
  beforeEach(() => vi.resetAllMocks());

  it("defaults new artwork to DRAFT status", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ACTIVE" } as never);
    vi.mocked(ArtworkRepository.slugExists).mockResolvedValue(false);
    vi.mocked(ArtworkRepository.create).mockImplementation(async (data) => ({ id: "art1", ...data }) as never);
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1", status: "DRAFT" } as never);

    const artwork = await ArtworkService.create({ title: "Sunset over the bay", categoryId: "cat1" });
    expect(artwork.status).toBe("DRAFT");

    const createArgs = vi.mocked(ArtworkRepository.create).mock.calls[0][0];
    expect(createArgs.status).toBe("DRAFT");
  });

  it("rejects an unknown category id", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue(null);
    await expect(
      ArtworkService.create({ title: "Sunset", categoryId: "does-not-exist" })
    ).rejects.toThrow("Selected category does not exist.");
  });

  it("rejects an archived category", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ARCHIVED" } as never);
    await expect(
      ArtworkService.create({ title: "Sunset", categoryId: "cat1" })
    ).rejects.toThrow("Archived categories cannot be assigned to artwork.");
  });

  it("requires a price when forSale is true", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ACTIVE" } as never);
    await expect(
      ArtworkService.create({ title: "Sunset", categoryId: "cat1", forSale: true })
    ).rejects.toThrow("Price is required when artwork is marked For Sale.");
  });

  it("allows forSale = false with no price", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ACTIVE" } as never);
    vi.mocked(ArtworkRepository.slugExists).mockResolvedValue(false);
    vi.mocked(ArtworkRepository.create).mockImplementation(async (data) => ({ id: "art1", ...data }) as never);
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);

    await expect(
      ArtworkService.create({ title: "Sunset", categoryId: "cat1", forSale: false })
    ).resolves.toBeDefined();
  });

  it("rejects a negative price", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ACTIVE" } as never);
    await expect(
      ArtworkService.create({ title: "Sunset", categoryId: "cat1", forSale: true, price: -5 })
    ).rejects.toThrow("Price cannot be negative.");
  });

  it("stores price as null when forSale is false even if a stray price was passed", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ACTIVE" } as never);
    vi.mocked(ArtworkRepository.slugExists).mockResolvedValue(false);
    vi.mocked(ArtworkRepository.create).mockImplementation(async (data) => ({ id: "art1", ...data }) as never);
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);

    await ArtworkService.create({ title: "Sunset", categoryId: "cat1", forSale: false, price: 100 });
    const createArgs = vi.mocked(ArtworkRepository.create).mock.calls[0][0];
    expect(createArgs.price).toBeNull();
  });

  it("assigns collections after creation", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat1", status: "ACTIVE" } as never);
    vi.mocked(ArtworkRepository.slugExists).mockResolvedValue(false);
    vi.mocked(ArtworkRepository.create).mockResolvedValue({ id: "art1" } as never);
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({ id: "art1" } as never);

    await ArtworkService.create({ title: "Sunset", categoryId: "cat1", collectionIds: ["col1", "col2"] });
    expect(ArtworkRepository.setCollections).toHaveBeenCalledWith("art1", ["col1", "col2"]);
  });
});

describe("ArtworkService.update", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects updating a nonexistent artwork", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue(null);
    await expect(ArtworkService.update("nope", { title: "x" })).rejects.toThrow("Artwork not found.");
  });

  it("re-validates the category when changed", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      id: "art1", forSale: false, price: null, categoryId: "cat1",
    } as never);
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "cat2", status: "ARCHIVED" } as never);

    await expect(ArtworkService.update("art1", { categoryId: "cat2" })).rejects.toThrow(
      "Archived categories cannot be assigned to artwork."
    );
  });

  it("when price is omitted from the update, falls back to the existing stored price", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      id: "art1", forSale: true, price: 100, categoryId: "cat1",
    } as never);
    vi.mocked(ArtworkRepository.update).mockResolvedValue({ id: "art1" } as never);

    // No `price` key at all — should inherit the existing price (100) and succeed.
    await expect(ArtworkService.update("art1", { featured: true })).resolves.toBeDefined();
  });

  it("explicitly clearing price to null while forSale stays true is rejected", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue({
      id: "art1", forSale: true, price: 100, categoryId: "cat1",
    } as never);

    await expect(ArtworkService.update("art1", { price: null as unknown as number })).rejects.toThrow(
      "Price is required when artwork is marked For Sale."
    );
  });
});

describe("ArtworkService.duplicate", () => {
  beforeEach(() => vi.resetAllMocks());

  it("creates a new artwork with a different id, as Draft, without publication metadata", async () => {
    vi.mocked(ArtworkRepository.findById)
      .mockResolvedValueOnce({
        id: "art1", title: "Sunset", slug: "sunset", categoryId: "cat1",
        availability: "AVAILABLE", forSale: false, price: null,
        collections: [{ collectionId: "col1" }], tags: [{ tag: { name: "warm" } }],
        description: null, story: null,
      } as never)
      .mockResolvedValueOnce({ id: "art2", status: "DRAFT", publishedAt: null, archivedAt: null } as never);
    vi.mocked(ArtworkRepository.slugExists).mockResolvedValue(false);
    vi.mocked(ArtworkRepository.create).mockResolvedValue({ id: "art2" } as never);

    const duplicate = await ArtworkService.duplicate("art1");

    expect(duplicate.id).toBe("art2");
    expect(duplicate.id).not.toBe("art1");
    expect(duplicate.status).toBe("DRAFT");
    expect(duplicate.publishedAt).toBeNull();
    expect(duplicate.archivedAt).toBeNull();

    const createArgs = vi.mocked(ArtworkRepository.create).mock.calls[0][0];
    expect(createArgs.status).toBe("DRAFT");
    expect(createArgs).not.toHaveProperty("publishedAt");

    expect(ArtworkRepository.setCollections).toHaveBeenCalledWith("art2", ["col1"]);
    expect(ArtworkRepository.setTags).toHaveBeenCalledWith("art2", ["warm"]);
  });

  it("does not modify the original artwork", async () => {
    vi.mocked(ArtworkRepository.findById)
      .mockResolvedValueOnce({
        id: "art1", title: "Sunset", slug: "sunset", categoryId: "cat1",
        availability: "AVAILABLE", forSale: false, price: null,
        collections: [], tags: [], description: null, story: null,
      } as never)
      .mockResolvedValueOnce({ id: "art2", status: "DRAFT" } as never);
    vi.mocked(ArtworkRepository.slugExists).mockResolvedValue(false);
    vi.mocked(ArtworkRepository.create).mockResolvedValue({ id: "art2" } as never);

    await ArtworkService.duplicate("art1");
    // The original id is never passed to update() or any mutating call.
    expect(ArtworkRepository.update).not.toHaveBeenCalled();
    expect(ArtworkRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects duplicating a nonexistent artwork", async () => {
    vi.mocked(ArtworkRepository.findById).mockResolvedValue(null);
    await expect(ArtworkService.duplicate("nope")).rejects.toThrow("Artwork not found.");
  });
});