import { z } from "zod";

export const UpdateArtworkSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(3, "Artwork title must contain at least three characters.").optional(),
    description: z.string().optional(),
    story: z.string().optional(),
    categoryId: z.string().uuid("Please select a category.").optional(),
    collectionIds: z.array(z.string().uuid()).optional(),
    tags: z.array(z.string().min(1)).optional(),
    availability: z
      .enum(["AVAILABLE", "RESERVED", "SOLD", "NOT_FOR_SALE", "COMMISSION_AVAILABLE"])
      .optional(),
    forSale: z.boolean().optional(),
    price: z.number().min(0, "Price cannot be negative.").optional(),
    featured: z.boolean().optional(),
  })
  .refine((data) => data.forSale !== true || data.price !== undefined, {
    message: "Price is required when artwork is marked for sale.",
    path: ["price"],
  });

export type UpdateArtworkInput = z.infer<typeof UpdateArtworkSchema>;