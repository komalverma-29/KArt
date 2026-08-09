"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireArtistSession } from "@/lib/authGuard";
import { StoryService, StoryServiceError } from "@/services/story/StoryService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Story } from "@prisma/client";

const IdSchema = z.object({ id: z.string().uuid() });

async function run(input: unknown, fn: (id: string) => Promise<Story>): Promise<ActionResult<Story>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "A story id is required." } };

  try {
    const story = await fn(parsed.data.id);
    revalidatePath("/studio/stories");
    return { success: true, data: story };
  } catch (error) {
    if (error instanceof StoryServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to update story." } };
  }
}

export async function publishStoryAction(input: unknown) {
  return run(input, StoryService.publish);
}
export async function unpublishStoryAction(input: unknown) {
  return run(input, StoryService.unpublish);
}
export async function archiveStoryAction(input: unknown) {
  return run(input, StoryService.archive);
}
export async function restoreStoryAction(input: unknown) {
  return run(input, StoryService.restore);
}

export async function deleteStoryAction(input: unknown): Promise<ActionResult<null>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "A story id is required." } };

  try {
    await StoryService.delete(parsed.data.id);
    revalidatePath("/studio/stories");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof StoryServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to delete story." } };
  }
}