import { z } from "zod";

export const UpdateCollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Collection name is required.").optional(),
  description: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  featured: z.boolean().optional(),
});

export type UpdateCollectionInput = z.infer<typeof UpdateCollectionSchema>;