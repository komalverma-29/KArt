import { z } from "zod";

export const CreateStorySchema = z.object({
  title: z.string().min(1, "Title is required."),
  content: z.string().min(1, "Content is required."),
  featuredImage: z.string().url().optional(),
  relatedArtworkIds: z.array(z.string().uuid()).optional().default([]),
  featured: z.boolean().optional(),
});

export type CreateStoryInput = z.infer<typeof CreateStorySchema>;