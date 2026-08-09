"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireArtistSession } from "@/lib/authGuard";
import { CollectionService, CollectionServiceError } from "@/services/collection/CollectionService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Collection } from "@prisma/client";

const IdSchema = z.object({ id: z.string().uuid() });

async function run(input: unknown, fn: (id: string) => Promise<Collection>): Promise<ActionResult<Collection>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "A collection id is required." } };

  try {
    const collection = await fn(parsed.data.id);
    revalidatePath("/studio/collections");
    return { success: true, data: collection };
  } catch (error) {
    if (error instanceof CollectionServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to update collection." } };
  }
}

export async function publishCollectionAction(input: unknown) {
  return run(input, CollectionService.publish);
}
export async function archiveCollectionAction(input: unknown) {
  return run(input, CollectionService.archive);
}
export async function restoreCollectionAction(input: unknown) {
  return run(input, CollectionService.restore);
}

export async function deleteCollectionAction(input: unknown): Promise<ActionResult<null>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "A collection id is required." } };

  try {
    await CollectionService.delete(parsed.data.id);
    revalidatePath("/studio/collections");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof CollectionServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to delete collection." } };
  }
}