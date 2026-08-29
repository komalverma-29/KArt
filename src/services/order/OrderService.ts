import { OrderRepository } from "@/repositories/order/OrderRepository";
import type { Order, OrderStatus } from "@prisma/client";

export class OrderServiceError extends Error {}

/**
 * Order status state machine (design.md §4.4):
 *
 *   Pending → Confirmed → Awaiting Payment → Paid → Preparing Shipment → Shipped → Delivered
 *   Any non-terminal state → Cancelled (terminal; can never become Delivered afterward)
 *
 * Delivered and Cancelled are both terminal — no transitions out of either.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PREPARING_SHIPMENT", "CANCELLED"],
  PREPARING_SHIPMENT: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const OrderService = {
  async getById(id: string) {
    return OrderRepository.findById(id);
  },

  async list(filters: Parameters<typeof OrderRepository.list>[0] = {}) {
    return OrderRepository.list(filters);
  },

  async updateStatus(id: string, nextStatus: OrderStatus, note?: string): Promise<Order> {
    const order = await OrderRepository.findById(id);
    if (!order) throw new OrderServiceError("Order not found.");

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(nextStatus)) {
      throw new OrderServiceError(
        `Cannot change order status from ${order.status} to ${nextStatus}.`
      );
    }

    return OrderRepository.updateStatus(id, nextStatus, note);
  },

  async cancel(id: string, note?: string): Promise<Order> {
    const order = await OrderRepository.findById(id);
    if (!order) throw new OrderServiceError("Order not found.");

    if (order.status === "DELIVERED") {
      throw new OrderServiceError("A delivered order cannot be cancelled.");
    }
    if (order.status === "CANCELLED") {
      throw new OrderServiceError("This order is already cancelled.");
    }

    return OrderRepository.updateStatus(id, "CANCELLED", note ?? "Order cancelled.");
  },

  /** Studio-only — never exposed through any public action/route. */
  async addInternalNote(id: string, note: string): Promise<Order> {
    const order = await OrderRepository.findById(id);
    if (!order) throw new OrderServiceError("Order not found.");
    return OrderRepository.updateInternalNotes(id, note);
  },

  /**
   * Called by PaymentService when a payment is confirmed PAID, to keep
   * the Order status in sync (design.md §6 — "Reflect payment status
   * changes onto the associated order where applicable"). Only advances
   * the order forward, and only from a pre-payment state; never
   * regresses an order that has already moved past PAID (e.g. already
   * PREPARING_SHIPMENT), and never touches a CANCELLED/DELIVERED order.
   */
  async syncStatusFromPaymentConfirmed(id: string): Promise<Order | null> {
    const order = await OrderRepository.findById(id);
    if (!order) throw new OrderServiceError("Order not found.");

    const prePaymentStatuses: OrderStatus[] = ["PENDING", "CONFIRMED", "AWAITING_PAYMENT"];
    if (!prePaymentStatuses.includes(order.status)) return null;

    return OrderRepository.updateStatus(id, "PAID", "Payment confirmed — order marked Paid.");
  },
};