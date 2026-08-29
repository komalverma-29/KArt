import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService, OrderServiceError } from "@/services/order/OrderService";
import { OrderRepository } from "@/repositories/order/OrderRepository";

vi.mock("@/repositories/order/OrderRepository", () => ({
  OrderRepository: {
    findById: vi.fn(), findByOrderNumber: vi.fn(), list: vi.fn(),
    createFromPurchase: vi.fn(), updateStatus: vi.fn(), updateInternalNotes: vi.fn(),
    orderNumberExists: vi.fn(),
  },
}));

describe("OrderService.updateStatus — state machine", () => {
  beforeEach(() => vi.resetAllMocks());

  it("allows PENDING -> CONFIRMED", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "PENDING" } as never);
    vi.mocked(OrderRepository.updateStatus).mockResolvedValue({ status: "CONFIRMED" } as never);
    const result = await OrderService.updateStatus("o1", "CONFIRMED");
    expect(result.status).toBe("CONFIRMED");
  });

  it("allows the full happy path in sequence", async () => {
    const sequence: [string, string][] = [
      ["PENDING", "CONFIRMED"], ["CONFIRMED", "AWAITING_PAYMENT"], ["AWAITING_PAYMENT", "PAID"],
      ["PAID", "PREPARING_SHIPMENT"], ["PREPARING_SHIPMENT", "SHIPPED"], ["SHIPPED", "DELIVERED"],
    ];
    for (const [from, to] of sequence) {
      vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: from } as never);
      vi.mocked(OrderRepository.updateStatus).mockResolvedValue({ status: to } as never);
      const result = await OrderService.updateStatus("o1", to as never);
      expect(result.status).toBe(to);
    }
  });

  it("rejects skipping a stage (PENDING -> PAID directly)", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "PENDING" } as never);
    await expect(OrderService.updateStatus("o1", "PAID")).rejects.toThrow(
      "Cannot change order status from PENDING to PAID."
    );
    expect(OrderRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects any transition out of DELIVERED (terminal)", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "DELIVERED" } as never);
    await expect(OrderService.updateStatus("o1", "SHIPPED")).rejects.toThrow(OrderServiceError);
    await expect(OrderService.updateStatus("o1", "CANCELLED")).rejects.toThrow(OrderServiceError);
  });

  it("rejects any transition out of CANCELLED (terminal) — in particular, CANCELLED -> DELIVERED", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "CANCELLED" } as never);
    await expect(OrderService.updateStatus("o1", "DELIVERED")).rejects.toThrow(
      "Cannot change order status from CANCELLED to DELIVERED."
    );
  });

  it("records status history via the repository call for every valid transition", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "PENDING" } as never);
    vi.mocked(OrderRepository.updateStatus).mockResolvedValue({ status: "CONFIRMED" } as never);
    await OrderService.updateStatus("o1", "CONFIRMED", "Verified payment details.");
    expect(OrderRepository.updateStatus).toHaveBeenCalledWith("o1", "CONFIRMED", "Verified payment details.");
  });

  it("rejects updating a nonexistent order", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue(null);
    await expect(OrderService.updateStatus("nope", "CONFIRMED")).rejects.toThrow("Order not found.");
  });
});

describe("OrderService.cancel", () => {
  beforeEach(() => vi.resetAllMocks());

  it("cancels a PENDING order", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "PENDING" } as never);
    vi.mocked(OrderRepository.updateStatus).mockResolvedValue({ status: "CANCELLED" } as never);
    const result = await OrderService.cancel("o1");
    expect(result.status).toBe("CANCELLED");
  });

  it("cancels a SHIPPED order (cancellation allowed right up until delivery)", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "SHIPPED" } as never);
    vi.mocked(OrderRepository.updateStatus).mockResolvedValue({ status: "CANCELLED" } as never);
    const result = await OrderService.cancel("o1");
    expect(result.status).toBe("CANCELLED");
  });

  it("a cancelled order can never later become Delivered — cancel() itself rejects a DELIVERED order", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "DELIVERED" } as never);
    await expect(OrderService.cancel("o1")).rejects.toThrow("A delivered order cannot be cancelled.");
  });

  it("rejects cancelling an already-cancelled order", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "CANCELLED" } as never);
    await expect(OrderService.cancel("o1")).rejects.toThrow("This order is already cancelled.");
  });

  it("preserves the order record and its id — cancellation does not delete", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "PENDING" } as never);
    vi.mocked(OrderRepository.updateStatus).mockResolvedValue({ id: "o1", status: "CANCELLED" } as never);
    const result = await OrderService.cancel("o1");
    expect(result.id).toBe("o1");
    // No delete-style repository method exists on OrderRepository's mock
    // surface at all — cancellation is purely a status transition.
  });
});

describe("OrderService.addInternalNote", () => {
  beforeEach(() => vi.resetAllMocks());

  it("updates internalNotes via the repository", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1" } as never);
    vi.mocked(OrderRepository.updateInternalNotes).mockResolvedValue({ id: "o1", internalNotes: "Called customer." } as never);

    const result = await OrderService.addInternalNote("o1", "Called customer.");
    expect(result.internalNotes).toBe("Called customer.");
  });

  it("rejects adding a note to a nonexistent order", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue(null);
    await expect(OrderService.addInternalNote("nope", "x")).rejects.toThrow("Order not found.");
  });
});

describe("OrderService.syncStatusFromPaymentConfirmed", () => {
  beforeEach(() => vi.resetAllMocks());

  it("advances a PENDING order to PAID when payment is confirmed", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "PENDING" } as never);
    vi.mocked(OrderRepository.updateStatus).mockResolvedValue({ status: "PAID" } as never);
    const result = await OrderService.syncStatusFromPaymentConfirmed("o1");
    expect(result?.status).toBe("PAID");
  });

  it("does NOT regress an order that has already progressed past PAID", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "PREPARING_SHIPMENT" } as never);
    const result = await OrderService.syncStatusFromPaymentConfirmed("o1");
    expect(result).toBeNull();
    expect(OrderRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("does not touch a CANCELLED order", async () => {
    vi.mocked(OrderRepository.findById).mockResolvedValue({ id: "o1", status: "CANCELLED" } as never);
    const result = await OrderService.syncStatusFromPaymentConfirmed("o1");
    expect(result).toBeNull();
    expect(OrderRepository.updateStatus).not.toHaveBeenCalled();
  });
});