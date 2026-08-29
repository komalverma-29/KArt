"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireArtistSession } from "@/lib/authGuard";
import { UpdatePaymentSchema } from "@/schemas/payment/UpdatePaymentSchema";
import { PaymentService, PaymentServiceError } from "@/services/payment/PaymentService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Payment } from "@prisma/client";

const StatusOnlySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["PENDING", "PAID", "REFUNDED"]),
});

export async function updatePaymentStatusAction(input: unknown): Promise<ActionResult<Payment>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = StatusOnlySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "A payment id and status are required." } };

  try {
    const payment = await PaymentService.updateStatus(parsed.data.id, parsed.data.status);
    revalidatePath("/studio/orders");
    revalidatePath(`/studio/orders/${payment.orderId}`);
    return { success: true, data: payment };
  } catch (error) {
    if (error instanceof PaymentServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to update payment status." } };
  }
}

export async function recordPaymentDetailsAction(input: unknown): Promise<ActionResult<Payment>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = UpdatePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors } };
  }

  try {
    const { id, status, ...details } = parsed.data;
    let payment = await PaymentService.updateDetails(id, details);
    if (status) {
      payment = await PaymentService.updateStatus(id, status);
    }
    revalidatePath("/studio/orders");
    revalidatePath(`/studio/orders/${payment.orderId}`);
    return { success: true, data: payment };
  } catch (error) {
    if (error instanceof PaymentServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to update payment." } };
  }
}