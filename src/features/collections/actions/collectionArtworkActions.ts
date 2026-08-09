"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireArtistSession } from "@/lib/authGuard";
import { CollectionService, CollectionServiceError } from "@/services/collection/CollectionService";
import type { ActionResult } from "@/types/ApiResponse";

const LinkSchema = z.object({ collectionId: z.string().uuid(), artworkId: z.string().uuid() });
const ReorderSchema = z.object({ collectionId: z.string().uuid(), orderedArtworkIds: z.array(z.string().uuid()) });

export async function assignArtworkToCollectionAction(input: unknown): Promise<ActionResult<null>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = LinkSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "A collection id and artwork id are required." } };

  try {
    await CollectionService.assignArtwork(parsed.data.collectionId, parsed.data.artworkId);
    revalidatePath(`/studio/collections/${parsed.data.collectionId}`);
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof CollectionServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to assign artwork." } };
  }
}

export async function removeArtworkFromCollectionAction(input: unknown): Promise<ActionResult<null>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = LinkSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "A collection id and artwork id are required." } };

  await CollectionService.removeArtwork(parsed.data.collectionId, parsed.data.artworkId);
  revalidatePath(`/studio/collections/${parsed.data.collectionId}`);
  return { success: true, data: null };
}

export async function reorderArtworksInCollectionAction(input: unknown): Promise<ActionResult<null>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = ReorderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "Invalid reorder request." } };

  await CollectionService.reorderArtworks(parsed.data.collectionId, parsed.data.orderedArtworkIds);
  revalidatePath(`/studio/collections/${parsed.data.collectionId}`);
  return { success: true, data: null };
}