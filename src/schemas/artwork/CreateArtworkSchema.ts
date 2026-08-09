import { z } from "zod";

export const CreateArtworkSchema = z
  .object({
    title: z.string().min(3, "Artwork title must contain at least three characters."),
    description: z.string().optional(),
    story: z.string().optional(),
    categoryId: z.string().uuid("Please select a category."),
    collectionIds: z.array(z.string().uuid()).optional().default([]),
    tags: z.array(z.string().min(1)).optional().default([]),
    availability: z
      .enum(["AVAILABLE", "RESERVED", "SOLD", "NOT_FOR_SALE", "COMMISSION_AVAILABLE"])
      .default("AVAILABLE"),
    forSale: z.boolean().default(false),
    price: z.number().min(0, "Price cannot be negative.").optional(),
    featured: z.boolean().default(false),
  })
  .refine((data) => !data.forSale || data.price !== undefined, {
    message: "Price is required when artwork is marked for sale.",
    path: ["price"],
  });

export type CreateArtworkInput = z.infer<typeof CreateArtworkSchema>;