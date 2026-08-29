import { PaymentRepository } from "@/repositories/payment/PaymentRepository";
import { OrderService } from "@/services/order/OrderService";
import type { Payment, PaymentMethod, PaymentStatus } from "@prisma/client";

export class PaymentServiceError extends Error {}

// design.md §4.6 — PENDING → PAID → REFUNDED. No AWAITING_PAYMENT here;
// that stage belongs to OrderStatus.
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID"],
  PAID: ["REFUNDED"],
  REFUNDED: [],
};

export const PaymentService = {
  async getById(id: string) {
    return PaymentRepository.findById(id);
  },

  async getByOrderId(orderId: string) {
    return PaymentRepository.findByOrderId(orderId);
  },

  async list(filters: Parameters<typeof PaymentRepository.list>[0] = {}) {
    return PaymentRepository.list(filters);
  },

  async updateStatus(id: string, nextStatus: PaymentStatus): Promise<Payment> {
    const payment = await PaymentRepository.findById(id);
    if (!payment) throw new PaymentServiceError("Payment not found.");

    const allowed = ALLOWED_TRANSITIONS[payment.status];
    if (!allowed.includes(nextStatus)) {
      throw new PaymentServiceError(`Cannot change payment status from ${payment.status} to ${nextStatus}.`);
    }

    const updated = await PaymentRepository.updateStatus(id, nextStatus);

    // Order synchronization (design.md §6): confirming a payment advances
    // the order forward if it hasn't already progressed further.
    if (nextStatus === "PAID") {
      await OrderService.syncStatusFromPaymentConfirmed(payment.orderId);
    }

    return updated;
  },

  async updateDetails(
    id: string,
    data: {
      method?: PaymentMethod;
      paymentReference?: string;
      paymentDate?: Date;
      amount?: number;
      notes?: string;
    }
  ): Promise<Payment> {
    const payment = await PaymentRepository.findById(id);
    if (!payment) throw new PaymentServiceError("Payment not found.");

    if (data.amount !== undefined && data.amount < 0) {
      throw new PaymentServiceError("Amount cannot be negative.");
    }
    if (data.paymentDate !== undefined && data.paymentDate.getTime() > Date.now()) {
      throw new PaymentServiceError("Payment date cannot be in the future.");
    }

    return PaymentRepository.updateDetails(id, {
      method: data.method,
      paymentReference: data.paymentReference,
      paymentDate: data.paymentDate,
      amount: data.amount,
      notes: data.notes,
    });
  },
};