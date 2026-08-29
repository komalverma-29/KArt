import { prisma } from "@/lib/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";

export interface OrderListFilters {
  status?: OrderStatus;
  search?: string; // matches orderNumber, customerName, or customerEmail
}

const orderInclude = {
  items: true,
  payment: true,
  statusHistory: { orderBy: { changedAt: "asc" as const } },
};

export const OrderRepository = {
  async findById(id: string) {
    return prisma.order.findFirst({ where: { id, deletedAt: null }, include: orderInclude });
  },

  async findByOrderNumber(orderNumber: string) {
    return prisma.order.findFirst({ where: { orderNumber, deletedAt: null }, include: orderInclude });
  },

  async list(filters: OrderListFilters = {}) {
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { orderNumber: { contains: filters.search, mode: "insensitive" } },
              { customerName: { contains: filters.search, mode: "insensitive" } },
              { customerEmail: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" } });
  },

  /**
   * Atomically creates the Order + its single OrderItem snapshot + its
   * Payment (PENDING) in one Prisma transaction. This is the ONLY way
   * an Order/Payment pair for a purchase should ever be created — a
   * successful purchase request must yield exactly one Order, one
   * OrderItem, and one Payment, or none of them (FR-SHOP-006, FR-PAY-001,
   * BR-011). Callers must not create these records individually.
   */
  async createFromPurchase(input: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string | null;
    shippingAddress: string;
    customerNotes?: string | null;
    totalAmount: number;
    item: { artworkId: string; artworkTitle: string; unitPrice: number; quantity: number };
  }) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: input.orderNumber,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone ?? null,
          shippingAddress: input.shippingAddress,
          customerNotes: input.customerNotes ?? null,
          status: "PENDING",
          totalAmount: input.totalAmount,
          items: {
            create: {
              artworkId: input.item.artworkId,
              artworkTitle: input.item.artworkTitle,
              unitPrice: input.item.unitPrice,
              quantity: input.item.quantity,
            },
          },
          payment: {
            create: { status: "PENDING", amount: input.totalAmount },
          },
          statusHistory: {
            create: { status: "PENDING", note: "Order created from purchase request." },
          },
        },
        include: orderInclude,
      });
      return order;
    });
  },

  async updateStatus(id: string, status: OrderStatus, note?: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.update({ where: { id }, data: { status }, include: orderInclude });
      await tx.orderStatusHistory.create({ data: { orderId: id, status, note: note ?? null } });
      return order;
    });
  },

  async updateInternalNotes(id: string, internalNotes: string) {
    return prisma.order.update({ where: { id }, data: { internalNotes }, include: orderInclude });
  },

  async orderNumberExists(orderNumber: string) {
    return (await prisma.order.findUnique({ where: { orderNumber } })) !== null;
  },
};
