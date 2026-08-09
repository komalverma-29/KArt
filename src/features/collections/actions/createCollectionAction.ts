"use server";

import { revalidatePath } from "next/cache";
import { requireArtistSession } from "@/lib/authGuard";
import { CreateCollectionSchema } from "@/schemas/collection/CreateCollectionSchema";
import { CollectionService, CollectionServiceError } from "@/services/collection/CollectionService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Collection } from "@prisma/client";

export async function createCollectionAction(input: unknown): Promise<ActionResult<Collection>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = CreateCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors } };
  }

  try {
    const collection = await CollectionService.create(parsed.data);
    revalidatePath("/studio/collections");
    return { success: true, data: collection };
  } catch (error) {
    if (error instanceof CollectionServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to create collection." } };
  }
}