"use server";

import { revalidatePath } from "next/cache";
import { requireArtistSession } from "@/lib/authGuard";
import { CreateArtworkSchema } from "@/schemas/artwork/CreateArtworkSchema";
import { ArtworkService, ArtworkServiceError } from "@/services/artwork/ArtworkService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Artwork } from "@prisma/client";

export async function createArtworkAction(input: unknown): Promise<ActionResult<Artwork>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = CreateArtworkSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors } };
  }

  try {
    const artwork = await ArtworkService.create(parsed.data);
    revalidatePath("/studio/artworks");
    return { success: true, data: artwork };
  } catch (error) {
    if (error instanceof ArtworkServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to create artwork." } };
  }
}