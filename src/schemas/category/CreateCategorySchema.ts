import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required."),
  description: z.string().optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;