import { prisma } from "@/lib/prisma";

/**
 * OrderItems are always created as part of Order creation (see
 * OrderRepository.createFromPurchase) and are immutable snapshots
 * (BR-012) — there is no independent create/update path here by design.
 * This repository exists for read access only.
 */
export const OrderItemRepository = {
  async listByOrder(orderId: string) {
    return prisma.orderItem.findMany({ where: { orderId } });
  },

  async findById(id: string) {
    return prisma.orderItem.findUnique({ where: { id } });
  },
};