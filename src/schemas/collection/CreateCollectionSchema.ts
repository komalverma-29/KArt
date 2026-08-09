import { z } from "zod";

export const CreateCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required."),
  description: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  featured: z.boolean().optional(),
});

export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;