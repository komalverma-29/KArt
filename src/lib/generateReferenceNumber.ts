import crypto from "crypto";

/**
 * Shared by Order.orderNumber (Epic 4) and, later, Commission.requestNumber
 * (Epic 5) — both need a short, human-shareable, collision-checked
 * reference code with the same shape, so this is genuinely shared logic
 * rather than premature abstraction.
 */
export async function generateReferenceNumber(
  prefix: string,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    const candidate = `${prefix}-${datePart}-${randomPart}`;
    if (!(await exists(candidate))) return candidate;
  }

  throw new Error(`Unable to generate a unique ${prefix} reference number.`);
}