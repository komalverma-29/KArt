"use server";

import { revalidatePath } from "next/cache";
import { requireArtistSession } from "@/lib/authGuard";
import { UpdateStorySchema } from "@/schemas/story/UpdateStorySchema";
import { StoryService, StoryServiceError } from "@/services/story/StoryService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Story } from "@prisma/client";

export async function updateStoryAction(input: unknown): Promise<ActionResult<Story>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = UpdateStorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors } };
  }

  try {
    const { id, ...data } = parsed.data;
    const story = await StoryService.update(id, data);
    revalidatePath("/studio/stories");
    revalidatePath(`/studio/stories/${id}`);
    return { success: true, data: story };
  } catch (error) {
    if (error instanceof StoryServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to update story." } };
  }
}