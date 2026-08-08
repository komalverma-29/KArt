"use server";

import { RequestPasswordResetSchema } from "@/schemas/auth/ResetPasswordSchema";
import { AuthService } from "@/services/auth/AuthService";
import type { ActionResult } from "@/types/ApiResponse";

/**
 * Public action — no auth guard, since a visitor who forgot their
 * password is by definition unauthenticated.
 *
 * Always returns the same generic success response, whether or not
 * the email belongs to an account (non-enumeration, FR-AUTH-007).
 */
export async function requestPasswordResetAction(
  input: unknown
): Promise<ActionResult<null>> {
  const parsed = RequestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        message: "Please enter a valid email address.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  await AuthService.requestPasswordReset(parsed.data.email);

  return { success: true, data: null };
}