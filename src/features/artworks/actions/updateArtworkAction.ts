"use server";

import { revalidatePath } from "next/cache";
import { requireArtistSession } from "@/lib/authGuard";
import { UpdateArtworkSchema } from "@/schemas/artwork/UpdateArtworkSchema";
import { ArtworkService, ArtworkServiceError } from "@/services/artwork/ArtworkService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Artwork } from "@prisma/client";

export async function updateArtworkAction(input: unknown): Promise<ActionResult<Artwork>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = UpdateArtworkSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors } };
  }

  try {
    const { id, ...data } = parsed.data;
    const artwork = await ArtworkService.update(id, data);
    revalidatePath("/studio/artworks");
    revalidatePath(`/studio/artworks/${id}`);
    return { success: true, data: artwork };
  } catch (error) {
    if (error instanceof ArtworkServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to update artwork." } };
  }
}