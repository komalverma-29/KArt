"use server";

import { revalidatePath } from "next/cache";
import { requireArtistSession } from "@/lib/authGuard";
import { CreateStorySchema } from "@/schemas/story/CreateStorySchema";
import { StoryService, StoryServiceError } from "@/services/story/StoryService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Story } from "@prisma/client";

export async function createStoryAction(input: unknown): Promise<ActionResult<Story>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = CreateStorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors } };
  }

  try {
    const story = await StoryService.create(parsed.data);
    revalidatePath("/studio/stories");
    return { success: true, data: story };
  } catch (error) {
    if (error instanceof StoryServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to create story." } };
  }
}