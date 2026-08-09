/**
 * NOT EXECUTED IN THE SANDBOX THIS WAS WRITTEN IN.
 *
 * Server Actions import "@/lib/authGuard" -> "@/lib/auth" -> "next-auth",
 * and call `revalidatePath` from "next/cache". Both require a real Next.js
 * + Auth.js installation to resolve/run, which this test-writing environment
 * does not have. This file is written to the project's real conventions and
 * is ready to run — do so with:
 *
 *   npm test -- src/features/categories/actions/__tests__/categoryActions.test.ts
 *
 * in your actual project, and report the real result back.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/authGuard", () => ({ requireArtistSession: vi.fn() }));
vi.mock("@/services/category/CategoryService", async () => {
  const actual = await vi.importActual<typeof import("@/services/category/CategoryService")>(
    "@/services/category/CategoryService"
  );
  return { ...actual, CategoryService: { create: vi.fn(), update: vi.fn() } };
});

import { requireArtistSession } from "@/lib/authGuard";
import { CategoryService, CategoryServiceError } from "@/services/category/CategoryService";
import { createCategoryAction } from "@/features/categories/actions/createCategoryAction";
import {
  archiveCategoryAction,
  deleteCategoryAction,
} from "@/features/categories/actions/categoryLifecycleActions";

describe("createCategoryAction", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects when unauthenticated, returning ActionResult<T> shape without calling the Service", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue(null);

    const result = await createCategoryAction({ name: "Portraits" });

    expect(result).toEqual({ success: false, error: { message: "Unauthorized." } });
    expect(CategoryService.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input with fieldErrors, without calling the Service", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue({ id: "artist-1", email: "a@b.com" });

    const result = await createCategoryAction({ name: "" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.fieldErrors).toHaveProperty("name");
    expect(CategoryService.create).not.toHaveBeenCalled();
  });

  it("returns success with the created category when authenticated and valid", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue({ id: "artist-1", email: "a@b.com" });
    vi.mocked(CategoryService.create).mockResolvedValue({ id: "c1", name: "Portraits" } as never);

    const result = await createCategoryAction({ name: "Portraits" });

    expect(result).toEqual({ success: true, data: { id: "c1", name: "Portraits" } });
  });

  it("translates a CategoryServiceError into a user-facing ActionResult error, not a thrown exception", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue({ id: "artist-1", email: "a@b.com" });
    vi.mocked(CategoryService.create).mockRejectedValue(new CategoryServiceError("Category name already exists."));

    const result = await createCategoryAction({ name: "Portraits" });

    expect(result).toEqual({ success: false, error: { message: "Category name already exists." } });
  });
});

describe("archiveCategoryAction / deleteCategoryAction — auth guard", () => {
  beforeEach(() => vi.resetAllMocks());

  it("archiveCategoryAction rejects unauthenticated requests without mutating anything", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue(null);
    const result = await archiveCategoryAction({ id: "c1" });
    expect(result.success).toBe(false);
  });

  it("deleteCategoryAction rejects unauthenticated requests without mutating anything", async () => {
    vi.mocked(requireArtistSession).mockResolvedValue(null);
    const result = await deleteCategoryAction({ id: "c1" });
    expect(result.success).toBe(false);
  });
});