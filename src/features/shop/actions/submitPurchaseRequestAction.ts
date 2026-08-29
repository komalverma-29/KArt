"use server";

import { revalidatePath } from "next/cache";
import { PurchaseRequestSchema } from "@/schemas/order/PurchaseRequestSchema";
import { ShopService, ShopServiceError } from "@/services/shop/ShopService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Order } from "@prisma/client";

/**
 * Public action — no auth guard. Eligibility (Published + For Sale +
 * Available) is re-verified inside ShopService regardless of what the
 * Shop UI already displayed; the client is never trusted (BR-011).
 */
export async function submitPurchaseRequestAction(input: unknown): Promise<ActionResult<Order>> {
  const parsed = PurchaseRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors },
    };
  }

  try {
    const order = await ShopService.createOrderFromRequest(parsed.data);
    revalidatePath("/studio/orders");
    revalidatePath("/shop");
    return { success: true, data: order };
  } catch (error) {
    if (error instanceof ShopServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to submit purchase request. Please try again." } };
  }
}