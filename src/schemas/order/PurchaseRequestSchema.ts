import { z } from "zod";

// VAL-SHOP-001..004
export const PurchaseRequestSchema = z.object({
  artworkId: z.string().uuid("An artwork is required."),
  customerName: z.string().min(1, "Full name is required."),
  customerEmail: z.string().min(1, "Email address is required.").email("Please enter a valid email address."),
  customerPhone: z.string().optional(),
  shippingAddress: z.string().min(1, "Shipping address is required."),
  notes: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
});

export type PurchaseRequestInput = z.infer<typeof PurchaseRequestSchema>;