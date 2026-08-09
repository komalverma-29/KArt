import { z } from "zod";

export const UpdateStorySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required.").optional(),
  content: z.string().min(1, "Content is required.").optional(),
  featuredImage: z.string().url().optional(),
  relatedArtworkIds: z.array(z.string().uuid()).optional(),
  featured: z.boolean().optional(),
});

export type UpdateStoryInput = z.infer<typeof UpdateStorySchema>;