"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireArtistSession } from "@/lib/authGuard";
import { ArtworkImageService, ArtworkImageServiceError } from "@/services/artwork/ArtworkImageService";
import type { ActionResult } from "@/types/ApiResponse";
import type { ArtworkImage } from "@prisma/client";

// uploadArtworkImageAction is intentionally NOT here — file upload
// requires multipart/form-data, which Server Actions handle awkwardly
// compared to a Route Handler. It's implemented as
// src/app/api/uploads/artwork/route.ts instead, per Task 3.2.9 /
// design.md §7.2, and calls the same ArtworkImageService underneath.

const ReorderSchema = z.object({ orderedImageIds: z.array(z.string().uuid()).min(1) });
const SetPrimarySchema = z.object({ artworkId: z.string().uuid(), imageId: z.string().uuid() });
const RemoveSchema = z.object({ imageId: z.string().uuid() });

export async function reorderArtworkImagesAction(input: unknown): Promise<ActionResult<null>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = ReorderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "Invalid image order." } };

  try {
    await ArtworkImageService.reorderImages(parsed.data.orderedImageIds);
    revalidatePath("/studio/artworks");
    return { success: true, data: null };
  } catch {
    return { success: false, error: { message: "Unable to reorder images." } };
  }
}

export async function setPrimaryArtworkImageAction(input: unknown): Promise<ActionResult<null>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = SetPrimarySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "An artwork id and image id are required." } };

  try {
    await ArtworkImageService.setPrimaryImage(parsed.data.artworkId, parsed.data.imageId);
    revalidatePath(`/studio/artworks/${parsed.data.artworkId}`);
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof ArtworkImageServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to set primary image." } };
  }
}

export async function removeArtworkImageAction(input: unknown): Promise<ActionResult<null>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = RemoveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "An image id is required." } };

  try {
    await ArtworkImageService.removeImage(parsed.data.imageId);
    revalidatePath("/studio/artworks");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof ArtworkImageServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to remove image." } };
  }
}