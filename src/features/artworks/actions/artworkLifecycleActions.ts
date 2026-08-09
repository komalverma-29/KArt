"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireArtistSession } from "@/lib/authGuard";
import { ArtworkPublishingService, ArtworkPublishingError } from "@/services/artwork/ArtworkPublishingService";
import { ArtworkService, ArtworkServiceError } from "@/services/artwork/ArtworkService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Artwork } from "@prisma/client";

const IdSchema = z.object({ id: z.string().uuid() });
const ConfirmedIdSchema = z.object({ id: z.string().uuid(), confirmed: z.literal(true) });

async function guard(): Promise<{ id: string; email: string } | null> {
  return requireArtistSession();
}

function unauthorized<T>(): ActionResult<T> {
  return { success: false, error: { message: "Unauthorized." } };
}

export async function publishArtworkAction(input: unknown): Promise<ActionResult<Artwork>> {
  if (!(await guard())) return unauthorized();
  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "An artwork id is required." } };
  try {
    const artwork = await ArtworkPublishingService.publish(parsed.data.id);
    revalidatePath("/studio/artworks");
    revalidatePath(`/studio/artworks/${parsed.data.id}`);
    return { success: true, data: artwork };
  } catch (error) {
    if (error instanceof ArtworkPublishingError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to publish artwork." } };
  }
}

export async function unpublishArtworkAction(input: unknown): Promise<ActionResult<Artwork>> {
  if (!(await guard())) return unauthorized();
  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "An artwork id is required." } };
  try {
    const artwork = await ArtworkPublishingService.unpublish(parsed.data.id);
    revalidatePath("/studio/artworks");
    return { success: true, data: artwork };
  } catch (error) {
    if (error instanceof ArtworkPublishingError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to unpublish artwork." } };
  }
}

export async function archiveArtworkAction(input: unknown): Promise<ActionResult<Artwork>> {
  if (!(await guard())) return unauthorized();
  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "An artwork id is required." } };
  try {
    const artwork = await ArtworkPublishingService.archive(parsed.data.id);
    revalidatePath("/studio/artworks");
    return { success: true, data: artwork };
  } catch (error) {
    if (error instanceof ArtworkPublishingError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to archive artwork." } };
  }
}

export async function restoreArtworkAction(input: unknown): Promise<ActionResult<Artwork>> {
  if (!(await guard())) return unauthorized();
  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "An artwork id is required." } };
  try {
    const artwork = await ArtworkPublishingService.restore(parsed.data.id);
    revalidatePath("/studio/artworks");
    return { success: true, data: artwork };
  } catch (error) {
    if (error instanceof ArtworkPublishingError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to restore artwork." } };
  }
}

export async function softDeleteArtworkAction(input: unknown): Promise<ActionResult<null>> {
  if (!(await guard())) return unauthorized();
  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "An artwork id is required." } };
  try {
    await ArtworkPublishingService.softDelete(parsed.data.id);
    revalidatePath("/studio/artworks");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof ArtworkPublishingError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to delete artwork." } };
  }
}

export async function permanentDeleteArtworkAction(input: unknown): Promise<ActionResult<null>> {
  if (!(await guard())) return unauthorized();
  const parsed = ConfirmedIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: "Permanent deletion requires explicit confirmation." } };
  }
  try {
    await ArtworkPublishingService.permanentDelete(parsed.data.id, parsed.data.confirmed);
    revalidatePath("/studio/artworks");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof ArtworkPublishingError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to permanently delete artwork." } };
  }
}

export async function duplicateArtworkAction(input: unknown): Promise<ActionResult<Artwork>> {
  if (!(await guard())) return unauthorized();
  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "An artwork id is required." } };
  try {
    const artwork = await ArtworkService.duplicate(parsed.data.id);
    revalidatePath("/studio/artworks");
    return { success: true, data: artwork };
  } catch (error) {
    if (error instanceof ArtworkServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to duplicate artwork." } };
  }
}