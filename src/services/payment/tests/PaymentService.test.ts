import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService, PaymentServiceError } from "@/services/payment/PaymentService";
import { PaymentRepository } from "@/repositories/payment/PaymentRepository";
import { OrderService } from "@/services/order/OrderService";

vi.mock("@/repositories/payment/PaymentRepository", () => ({
  PaymentRepository: {
    findById: vi.fn(), findByOrderId: vi.fn(), list: vi.fn(),
    updateStatus: vi.fn(), updateDetails: vi.fn(),
  },
}));
vi.mock("@/services/order/OrderService", () => ({
  OrderService: { syncStatusFromPaymentConfirmed: vi.fn() },
}));

describe("PaymentService.updateStatus — state machine", () => {
  beforeEach(() => vi.resetAllMocks());

  it("allows PENDING -> PAID", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1", status: "PENDING" } as never);
    vi.mocked(PaymentRepository.updateStatus).mockResolvedValue({ id: "p1", orderId: "o1", status: "PAID" } as never);
    const result = await PaymentService.updateStatus("p1", "PAID");
    expect(result.status).toBe("PAID");
  });

  it("allows PAID -> REFUNDED", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1", status: "PAID" } as never);
    vi.mocked(PaymentRepository.updateStatus).mockResolvedValue({ id: "p1", orderId: "o1", status: "REFUNDED" } as never);
    const result = await PaymentService.updateStatus("p1", "REFUNDED");
    expect(result.status).toBe("REFUNDED");
  });

  it("rejects PENDING -> REFUNDED (must go through PAID first)", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1", status: "PENDING" } as never);
    await expect(PaymentService.updateStatus("p1", "REFUNDED")).rejects.toThrow(
      "Cannot change payment status from PENDING to REFUNDED."
    );
    expect(PaymentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects any transition out of REFUNDED (terminal)", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1", status: "REFUNDED" } as never);
    await expect(PaymentService.updateStatus("p1", "PAID")).rejects.toThrow(PaymentServiceError);
  });

  it("never introduces AWAITING_PAYMENT as a valid Payment status transition target", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1", status: "PENDING" } as never);
    const invalidTarget = "AWAITING_PAYMENT" as unknown as "PAID";
    await expect(PaymentService.updateStatus("p1", invalidTarget)).rejects.toThrow();
  });

  it("rejects updating a nonexistent payment", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue(null);
    await expect(PaymentService.updateStatus("nope", "PAID")).rejects.toThrow("Payment not found.");
  });

  it("syncs the order to PAID when payment is confirmed", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1", status: "PENDING" } as never);
    vi.mocked(PaymentRepository.updateStatus).mockResolvedValue({ id: "p1", orderId: "o1", status: "PAID" } as never);

    await PaymentService.updateStatus("p1", "PAID");
    expect(OrderService.syncStatusFromPaymentConfirmed).toHaveBeenCalledWith("o1");
  });

  it("does NOT sync the order when payment moves to REFUNDED (no such rule specified)", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1", status: "PAID" } as never);
    vi.mocked(PaymentRepository.updateStatus).mockResolvedValue({ id: "p1", orderId: "o1", status: "REFUNDED" } as never);

    await PaymentService.updateStatus("p1", "REFUNDED");
    expect(OrderService.syncStatusFromPaymentConfirmed).not.toHaveBeenCalled();
  });
});

describe("PaymentService.updateDetails", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects a negative amount", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1" } as never);
    await expect(PaymentService.updateDetails("p1", { amount: -10 })).rejects.toThrow("Amount cannot be negative.");
    expect(PaymentRepository.updateDetails).not.toHaveBeenCalled();
  });

  it("accepts a zero amount", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1" } as never);
    vi.mocked(PaymentRepository.updateDetails).mockResolvedValue({ id: "p1" } as never);
    await expect(PaymentService.updateDetails("p1", { amount: 0 })).resolves.toBeDefined();
  });

  it("rejects a future payment date", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1" } as never);
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await expect(PaymentService.updateDetails("p1", { paymentDate: future })).rejects.toThrow(
      "Payment date cannot be in the future."
    );
    expect(PaymentRepository.updateDetails).not.toHaveBeenCalled();
  });

  it("accepts a past payment date", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1" } as never);
    vi.mocked(PaymentRepository.updateDetails).mockResolvedValue({ id: "p1" } as never);
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    await expect(PaymentService.updateDetails("p1", { paymentDate: past })).resolves.toBeDefined();
  });

  it("payment reference is optional — omitting it does not throw", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1" } as never);
    vi.mocked(PaymentRepository.updateDetails).mockResolvedValue({ id: "p1" } as never);
    await expect(PaymentService.updateDetails("p1", { method: "UPI" })).resolves.toBeDefined();
  });

  it("saves private notes through to the repository", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue({ id: "p1", orderId: "o1" } as never);
    vi.mocked(PaymentRepository.updateDetails).mockResolvedValue({ id: "p1", notes: "Paid via bank transfer, confirmed by phone." } as never);
    await PaymentService.updateDetails("p1", { notes: "Paid via bank transfer, confirmed by phone." });
    expect(PaymentRepository.updateDetails).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ notes: "Paid via bank transfer, confirmed by phone." })
    );
  });

  it("rejects updating details for a nonexistent payment", async () => {
    vi.mocked(PaymentRepository.findById).mockResolvedValue(null);
    await expect(PaymentService.updateDetails("nope", { notes: "x" })).rejects.toThrow("Payment not found.");
  });
});