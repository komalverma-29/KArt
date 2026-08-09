"use server";

import { revalidatePath } from "next/cache";
import { requireArtistSession } from "@/lib/authGuard";
import { UpdateCategorySchema } from "@/schemas/category/UpdateCategorySchema";
import { CategoryService, CategoryServiceError } from "@/services/category/CategoryService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Category } from "@prisma/client";

export async function updateCategoryAction(input: unknown): Promise<ActionResult<Category>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = UpdateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors },
    };
  }

  try {
    const { id, ...data } = parsed.data;
    const category = await CategoryService.update(id, data);
    revalidatePath("/studio/categories");
    return { success: true, data: category };
  } catch (error) {
    if (error instanceof CategoryServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to update category." } };
  }
}