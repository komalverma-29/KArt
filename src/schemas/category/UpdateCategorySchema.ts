import { z } from "zod";

export const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Category name is required.").optional(),
  description: z.string().optional(),
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;