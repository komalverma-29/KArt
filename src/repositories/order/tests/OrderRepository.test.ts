import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks the raw Prisma client (not a repository) — this is the one place
// where testing the actual $transaction wiring matters, since ShopService
// tests mock OrderRepository entirely and cannot verify transaction wiring.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { OrderRepository } from "@/repositories/order/OrderRepository";

describe("OrderRepository.createFromPurchase — atomicity", () => {
  beforeEach(() => vi.resetAllMocks());

  const input = {
    orderNumber: "ORD-20260101-ABC123",
    customerName: "Jane Buyer",
    customerEmail: "jane@example.com",
    shippingAddress: "123 Main St",
    totalAmount: 250,
    item: {
      artworkId: "art1",
      artworkTitle: "Sunset",
      unitPrice: 250,
      quantity: 1,
    },
  };

  it("performs the entire Order + OrderItem + Payment + history write inside a single $transaction call", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const txOrderCreate = vi.fn().mockResolvedValue({
        id: "order1",
        orderNumber: input.orderNumber,
      });

      return callback({
        order: {
          create: txOrderCreate,
        },
      } as unknown as Parameters<typeof callback>[0]);
    });

    await OrderRepository.createFromPurchase(input);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("nests OrderItem, Payment (PENDING), and initial status history as part of ONE order.create call inside the transaction", async () => {
    let capturedCreateArgs: unknown = null;

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const txOrderCreate = vi.fn().mockImplementation((args: unknown) => {
        capturedCreateArgs = args;

        return Promise.resolve({
          id: "order1",
        });
      });

      return callback({
        order: {
          create: txOrderCreate,
        },
      } as unknown as Parameters<typeof callback>[0]);
    });

    await OrderRepository.createFromPurchase(input);

    const args = capturedCreateArgs as {
      data: {
        items: {
          create: unknown;
        };
        payment: {
          create: {
            status: string;
          };
        };
      };
    };

    expect(args.data.items.create).toBeDefined();
    expect(args.data.payment.create.status).toBe("PENDING");
  });

  it("propagates a transaction failure without partial data (caller sees the error, no partial return value)", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Error("simulated DB failure mid-transaction")
    );

    await expect(
      OrderRepository.createFromPurchase(input)
    ).rejects.toThrow("simulated DB failure mid-transaction");
  });
});

describe("OrderRepository.list — filters and sort (FR-ORDER-009/010/011)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("filters by payment status via the related Payment record", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    await OrderRepository.list({ paymentStatus: "PAID" });

    const call = vi.mocked(prisma.order.findMany).mock.calls[0][0] as {
      where: { payment: { is: { status: string } } };
    };
    expect(call.where.payment).toEqual({ is: { status: "PAID" } });
  });

  it("filters by an order date range", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const dateFrom = new Date("2026-01-01");
    const dateTo = new Date("2026-01-31");
    await OrderRepository.list({ dateFrom, dateTo });

    const call = vi.mocked(prisma.order.findMany).mock.calls[0][0] as {
      where: { createdAt: { gte: Date; lte: Date } };
    };
    expect(call.where.createdAt).toEqual({ gte: dateFrom, lte: dateTo });
  });

  it("defaults to sorting by newest", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    await OrderRepository.list({});

    const call = vi.mocked(prisma.order.findMany).mock.calls[0][0] as {
      orderBy: Record<string, string>;
    };
    expect(call.orderBy).toEqual({ createdAt: "desc" });
  });

  it("sorts by customer name when requested", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    await OrderRepository.list({ sort: "customerName" });

    const call = vi.mocked(prisma.order.findMany).mock.calls[0][0] as {
      orderBy: Record<string, string>;
    };
    expect(call.orderBy).toEqual({ customerName: "asc" });
  });

  it("sorts by total amount when requested", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    await OrderRepository.list({ sort: "totalAmount" });

    const call = vi.mocked(prisma.order.findMany).mock.calls[0][0] as {
      orderBy: Record<string, string>;
    };
    expect(call.orderBy).toEqual({ totalAmount: "desc" });
  });
});