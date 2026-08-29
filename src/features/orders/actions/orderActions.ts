"use server";

import { revalidatePath } from "next/cache";
import { requireArtistSession } from "@/lib/authGuard";
import { UpdateOrderStatusSchema, AddOrderNoteSchema } from "@/schemas/order/UpdateOrderStatusSchema";
import { OrderService, OrderServiceError } from "@/services/order/OrderService";
import type { ActionResult } from "@/types/ApiResponse";
import type { Order } from "@prisma/client";
import { z } from "zod";

const IdSchema = z.object({ id: z.string().uuid(), note: z.string().optional() });

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult<Order>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = UpdateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors } };
  }

  try {
    const order = await OrderService.updateStatus(parsed.data.id, parsed.data.status, parsed.data.note);
    revalidatePath("/studio/orders");
    revalidatePath(`/studio/orders/${parsed.data.id}`);
    return { success: true, data: order };
  } catch (error) {
    if (error instanceof OrderServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to update order status." } };
  }
}

export async function cancelOrderAction(input: unknown): Promise<ActionResult<Order>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = IdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: "An order id is required." } };

  try {
    const order = await OrderService.cancel(parsed.data.id, parsed.data.note);
    revalidatePath("/studio/orders");
    revalidatePath(`/studio/orders/${parsed.data.id}`);
    return { success: true, data: order };
  } catch (error) {
    if (error instanceof OrderServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to cancel order." } };
  }
}

export async function addOrderNoteAction(input: unknown): Promise<ActionResult<Order>> {
  const artist = await requireArtistSession();
  if (!artist) return { success: false, error: { message: "Unauthorized." } };

  const parsed = AddOrderNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { message: "Please correct the errors below.", fieldErrors: parsed.error.flatten().fieldErrors } };
  }

  try {
    // Studio-only mutation; internalNotes is never selected by any
    // public-facing query (see ArtworkRepository/CollectionRepository
    // pattern of never exposing internal fields at the query level).
    const order = await OrderService.addInternalNote(parsed.data.id, parsed.data.internalNotes);
    revalidatePath(`/studio/orders/${parsed.data.id}`);
    return { success: true, data: order };
  } catch (error) {
    if (error instanceof OrderServiceError) return { success: false, error: { message: error.message } };
    return { success: false, error: { message: "Unable to add note." } };
  }
}