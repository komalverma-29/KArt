"use server";

import { ResetPasswordSchema } from "@/schemas/auth/ResetPasswordSchema";
import { AuthService } from "@/services/auth/AuthService";
import type { ActionResult } from "@/types/ApiResponse";

// Public action — the token itself is the credential here.
export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = ResetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        message: "Please correct the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const result = await AuthService.resetPassword(parsed.data.token, parsed.data.newPassword);

  if (!result.success) {
    return { success: false, error: { message: result.error } };
  }

  return { success: true, data: null };
}