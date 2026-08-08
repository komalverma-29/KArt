import { z } from "zod";

/**
 * Password policy (VAL-AUTH-004).
 *
 * The SRS specifies that a policy must be enforced but does not state
 * its exact rules. This is a reasonable, minimal default — flagged
 * explicitly here as a decision for the project owner to confirm or
 * override, per development_rules.md ("do not assume missing business
 * requirements" — this is the narrowest assumption needed to make
 * VAL-AUTH-004 concretely testable).
 */
export const passwordPolicy = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordPolicy,
    confirmNewPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Password confirmation must match the new password.",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;