import { describe, it, expect } from "vitest";
import { UpdatePaymentSchema } from "@/schemas/payment/UpdatePaymentSchema";

const ID = "11111111-1111-4111-8111-111111111111";

describe("UpdatePaymentSchema", () => {
  it("accepts a minimal valid update", () => {
    expect(UpdatePaymentSchema.safeParse({ id: ID }).success).toBe(true);
  });

  it("rejects a negative amount (VAL-PAY-002)", () => {
    expect(UpdatePaymentSchema.safeParse({ id: ID, amount: -5 }).success).toBe(false);
  });

  it("accepts a zero amount", () => {
    expect(UpdatePaymentSchema.safeParse({ id: ID, amount: 0 }).success).toBe(true);
  });

  it("rejects a future payment date (VAL-PAY-003)", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    expect(UpdatePaymentSchema.safeParse({ id: ID, paymentDate: future }).success).toBe(false);
  });

  it("accepts a past payment date", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    expect(UpdatePaymentSchema.safeParse({ id: ID, paymentDate: past }).success).toBe(true);
  });

  it("paymentReference is optional (VAL-PAY-004)", () => {
    expect(UpdatePaymentSchema.safeParse({ id: ID, status: "PAID" }).success).toBe(true);
  });

  it("rejects an invalid payment status enum value", () => {
    expect(UpdatePaymentSchema.safeParse({ id: ID, status: "AWAITING_PAYMENT" }).success).toBe(false);
  });

  it("rejects an invalid payment method enum value", () => {
    expect(UpdatePaymentSchema.safeParse({ id: ID, method: "CREDIT_CARD" }).success).toBe(false);
  });
});