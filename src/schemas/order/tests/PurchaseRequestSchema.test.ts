import { describe, it, expect } from "vitest";
import { PurchaseRequestSchema } from "@/schemas/order/PurchaseRequestSchema";

const VALID = {
  artworkId: "11111111-1111-4111-8111-111111111111",
  customerName: "Jane Buyer",
  customerEmail: "jane@example.com",
  shippingAddress: "123 Main St",
};

describe("PurchaseRequestSchema", () => {
  it("accepts a valid purchase request", () => {
    expect(PurchaseRequestSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a missing customer name (VAL-SHOP-001)", () => {
    const result = PurchaseRequestSchema.safeParse({ ...VALID, customerName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing/invalid email (VAL-SHOP-002)", () => {
    expect(PurchaseRequestSchema.safeParse({ ...VALID, customerEmail: "" }).success).toBe(false);
    expect(PurchaseRequestSchema.safeParse({ ...VALID, customerEmail: "not-an-email" }).success).toBe(false);
  });

  it("rejects a missing shipping address (VAL-SHOP-003)", () => {
    const result = PurchaseRequestSchema.safeParse({ ...VALID, shippingAddress: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing/invalid artwork id", () => {
    const result = PurchaseRequestSchema.safeParse({ ...VALID, artworkId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("defaults quantity to 1 when omitted", () => {
    const result = PurchaseRequestSchema.parse(VALID);
    expect(result.quantity).toBe(1);
  });

  it("phone and notes are optional", () => {
    expect(PurchaseRequestSchema.safeParse(VALID).success).toBe(true);
  });
});