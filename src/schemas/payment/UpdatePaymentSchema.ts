import { z } from "zod";

// VAL-PAY-001..004
export const UpdatePaymentSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["PENDING", "PAID", "REFUNDED"]).optional(),
  method: z.enum(["BANK_TRANSFER", "UPI", "CASH", "OTHER"]).optional(),
  paymentReference: z.string().optional(), // VAL-PAY-004 — optional
  paymentDate: z
    .coerce.date()
    .refine((d) => d.getTime() <= Date.now(), "Payment date cannot be in the future.")
    .optional(),
  amount: z.number().min(0, "Amount cannot be negative.").optional(),
  notes: z.string().optional(),
});

export type UpdatePaymentInput = z.infer<typeof UpdatePaymentSchema>;