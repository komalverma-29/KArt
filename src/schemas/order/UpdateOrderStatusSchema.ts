import { z } from "zod";

export const UpdateOrderStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "PENDING", "CONFIRMED", "AWAITING_PAYMENT", "PAID",
    "PREPARING_SHIPMENT", "SHIPPED", "DELIVERED", "CANCELLED",
  ]),
  note: z.string().optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

export const AddOrderNoteSchema = z.object({
  id: z.string().uuid(),
  internalNotes: z.string().min(1, "Note cannot be empty."),
});

export type AddOrderNoteInput = z.infer<typeof AddOrderNoteSchema>;