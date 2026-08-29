import { describe, it, expect } from "vitest";
import { UpdateOrderStatusSchema, AddOrderNoteSchema } from "@/schemas/order/UpdateOrderStatusSchema";

const ID = "11111111-1111-4111-8111-111111111111";

describe("UpdateOrderStatusSchema", () => {
  it("accepts a valid status value", () => {
    expect(UpdateOrderStatusSchema.safeParse({ id: ID, status: "CONFIRMED" }).success).toBe(true);
  });

  it("rejects an invalid/unknown status value", () => {
    expect(UpdateOrderStatusSchema.safeParse({ id: ID, status: "NOT_A_REAL_STATUS" }).success).toBe(false);
  });

  it("rejects a non-uuid id", () => {
    expect(UpdateOrderStatusSchema.safeParse({ id: "nope", status: "CONFIRMED" }).success).toBe(false);
  });
});

describe("AddOrderNoteSchema", () => {
  it("accepts a non-empty note", () => {
    expect(AddOrderNoteSchema.safeParse({ id: ID, internalNotes: "Called customer to confirm address." }).success).toBe(true);
  });

  it("rejects an empty note", () => {
    expect(AddOrderNoteSchema.safeParse({ id: ID, internalNotes: "" }).success).toBe(false);
  });
});