"use server";

import { revalidatePath } from "next/cache";
import { requireArtistSession } from "@/lib/authGuard";
import { CreateCategorySchema } from "@/schemas/category/CreateCategorySchema";
import { CategoryService, CategoryServiceError } from "@/services/category/CategoryService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Category } from "@prisma/client";

export async function createCategoryAction(input: unknown): Promise<ActionResult<Category>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = CreateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors },
    };
  }

  try {
    const category = await CategoryService.create(parsed.data);
    revalidatePath("/studio/categories");
    return { success: true, data: category };
  } catch (error) {
    if (error instanceof CategoryServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to create category." } };
  }
}