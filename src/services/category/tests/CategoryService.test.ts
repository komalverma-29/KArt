import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryService, CategoryServiceError } from "@/services/category/CategoryService";
import { CategoryRepository } from "@/repositories/category/CategoryRepository";

vi.mock("@/repositories/category/CategoryRepository", () => ({
  CategoryRepository: {
    findById: vi.fn(), slugExists: vi.fn(), nameExists: vi.fn(), list: vi.fn(),
    create: vi.fn(), update: vi.fn(), updateStatus: vi.fn(), countArtworks: vi.fn(), softDelete: vi.fn(),
  },
}));

describe("CategoryService.create", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects a duplicate category name", async () => {
    vi.mocked(CategoryRepository.nameExists).mockResolvedValue(true);
    await expect(CategoryService.create({ name: "Portraits" })).rejects.toThrow(CategoryServiceError);
    await expect(CategoryService.create({ name: "Portraits" })).rejects.toThrow("Category name already exists.");
  });

  it("generates a unique slug, disambiguating on collision", async () => {
    vi.mocked(CategoryRepository.nameExists).mockResolvedValue(false);
    vi.mocked(CategoryRepository.slugExists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(CategoryRepository.create).mockImplementation(async (data) => ({ id: "c1", ...data }) as never);

    await CategoryService.create({ name: "Portraits" });
    const createArgs = vi.mocked(CategoryRepository.create).mock.calls[0][0];
    expect(createArgs.slug).toBe("portraits-2");
  });
});

describe("CategoryService.update", () => {
  beforeEach(() => vi.resetAllMocks());

  it("allows renaming to the same name (no self-collision false positive)", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "c1", name: "Portraits" } as never);
    vi.mocked(CategoryRepository.update).mockResolvedValue({ id: "c1", name: "Portraits" } as never);

    await CategoryService.update("c1", { name: "Portraits" });
    expect(CategoryRepository.nameExists).not.toHaveBeenCalled();
  });

  it("rejects renaming to a name used by a different category", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "c1", name: "Portraits" } as never);
    vi.mocked(CategoryRepository.nameExists).mockResolvedValue(true);

    await expect(CategoryService.update("c1", { name: "Landscapes" })).rejects.toThrow(
      "Category name already exists."
    );
  });
});

describe("CategoryService lifecycle", () => {
  beforeEach(() => vi.resetAllMocks());

  it("archive() transitions status to ARCHIVED", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "c1" } as never);
    vi.mocked(CategoryRepository.updateStatus).mockResolvedValue({ id: "c1", status: "ARCHIVED" } as never);
    const result = await CategoryService.archive("c1");
    expect(result.status).toBe("ARCHIVED");
    expect(CategoryRepository.updateStatus).toHaveBeenCalledWith("c1", "ARCHIVED");
  });

  it("restore() transitions status back to ACTIVE", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "c1" } as never);
    vi.mocked(CategoryRepository.updateStatus).mockResolvedValue({ id: "c1", status: "ACTIVE" } as never);
    const result = await CategoryService.restore("c1");
    expect(result.status).toBe("ACTIVE");
  });

  it("rejects lifecycle operations on an unknown category id", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue(null);
    await expect(CategoryService.archive("does-not-exist")).rejects.toThrow("Category not found.");
    await expect(CategoryService.restore("does-not-exist")).rejects.toThrow("Category not found.");
  });
});

describe("CategoryService.delete", () => {
  beforeEach(() => vi.resetAllMocks());

  it("deletes a category with no assigned artwork", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "c1" } as never);
    vi.mocked(CategoryRepository.countArtworks).mockResolvedValue(0);
    vi.mocked(CategoryRepository.softDelete).mockResolvedValue(undefined);

    await CategoryService.delete("c1");
    expect(CategoryRepository.softDelete).toHaveBeenCalledWith("c1");
  });

  it("blocks deletion when artwork is assigned to the category", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "c1" } as never);
    vi.mocked(CategoryRepository.countArtworks).mockResolvedValue(3);

    await expect(CategoryService.delete("c1")).rejects.toThrow(
      "Category cannot be deleted because artwork is assigned to it."
    );
    expect(CategoryRepository.softDelete).not.toHaveBeenCalled();
  });
});