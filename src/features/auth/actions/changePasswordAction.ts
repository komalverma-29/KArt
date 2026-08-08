"use server";

import { requireArtistSession } from "@/lib/authGuard";
import { ChangePasswordSchema } from "@/schemas/auth/ChangePasswordSchema";
import { AuthService } from "@/services/auth/AuthService";
import type { ActionResult } from "@/types/ApiResponse";

export async function changePasswordAction(input: unknown): Promise<ActionResult<null>> {
  // 1. authenticate
  const artist = await requireArtistSession();
  if (!artist) {
    return { success: false, error: { message: "Unauthorized." } };
  }

  // 2. validate
  const parsed = ChangePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        message: "Please correct the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  // 3. call Service
  const result = await AuthService.changePassword(
    artist.id,
    parsed.data.currentPassword,
    parsed.data.newPassword
  );

  if (!result.success) {
    return { success: false, error: { message: result.error } };
  }

  // 4. return safe result
  return { success: true, data: null };
}