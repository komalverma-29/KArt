import { prisma } from "@/lib/prisma";
import type { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

export interface PaymentListFilters {
  status?: PaymentStatus;
  method?: PaymentMethod;
  search?: string; // matches paymentReference, order's customerName/customerEmail, or orderId
}

export const PaymentRepository = {
  async findById(id: string) {
    return prisma.payment.findUnique({ where: { id }, include: { order: true } });
  },

  async findByOrderId(orderId: string) {
    return prisma.payment.findUnique({ where: { orderId }, include: { order: true } });
  },

  async list(filters: PaymentListFilters = {}) {
    const where: Prisma.PaymentWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.search
        ? {
            OR: [
              { paymentReference: { contains: filters.search, mode: "insensitive" } },
              { orderId: { contains: filters.search, mode: "insensitive" } },
              { order: { is: { customerName: { contains: filters.search, mode: "insensitive" } } } },
              { order: { is: { customerEmail: { contains: filters.search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };
    return prisma.payment.findMany({ where, include: { order: true }, orderBy: { createdAt: "desc" } });
  },

  async updateStatus(id: string, status: PaymentStatus) {
    return prisma.payment.update({ where: { id }, data: { status } });
  },

  async updateDetails(
    id: string,
    data: Partial<{
      method: PaymentMethod | null;
      paymentReference: string | null;
      paymentDate: Date | null;
      amount: number;
      notes: string | null;
    }>
  ) {
    return prisma.payment.update({ where: { id }, data });
  },
};