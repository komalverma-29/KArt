import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryService, CategoryServiceError } from "@/services/category/CategoryService";
import { CategoryRepository } from "@/repositories/category/CategoryRepository";

vi.mock("@/repositories/category/CategoryRepository");

describe("CategoryService", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects duplicate category names", async () => {
    vi.mocked(CategoryRepository.nameExists).mockResolvedValue(true);
    await expect(CategoryService.create({ name: "Portraits" })).rejects.toThrow(CategoryServiceError);
  });

  it("blocks deletion when artwork is assigned", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "1" } as never);
    vi.mocked(CategoryRepository.countArtworks).mockResolvedValue(3);
    await expect(CategoryService.delete("1")).rejects.toThrow(
      "Category cannot be deleted because artwork is assigned to it."
    );
  });

  it("archives and restores a category", async () => {
    vi.mocked(CategoryRepository.findById).mockResolvedValue({ id: "1" } as never);
    vi.mocked(CategoryRepository.updateStatus).mockResolvedValue({ id: "1", status: "ARCHIVED" } as never);
    const archived = await CategoryService.archive("1");
    expect(archived.status).toBe("ARCHIVED");
  });
});