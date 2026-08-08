import { z } from "zod";
import { passwordPolicy } from "./ChangePasswordSchema";

export const RequestPasswordResetSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
});

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required."),
    newPassword: passwordPolicy,
    confirmNewPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Password confirmation must match the new password.",
    path: ["confirmNewPassword"],
  });

export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;