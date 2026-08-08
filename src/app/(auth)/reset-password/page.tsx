"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ResetPasswordSchema } from "@/schemas/auth/ResetPasswordSchema";
import { resetPasswordAction } from "@/features/auth/actions/resetPasswordAction";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = ResetPasswordSchema.safeParse({ token, newPassword, confirmNewPassword });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const result = await resetPasswordAction(parsed.data);
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error.message);
      return;
    }

    setSucceeded(true);
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Invalid link</h1>
        <p className="text-sm text-neutral-600">
          This password reset link is missing its token. Please request a new one.
        </p>
        <a href="/forgot-password" className="mt-4 text-sm text-neutral-600 underline">
          Request a new link
        </a>
      </main>
    );
  }

  if (succeeded) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Password updated</h1>
        <p className="mb-6 text-sm text-neutral-600">
          Your password has been changed successfully.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Go to login
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Reset password</h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="newPassword" className="mb-1 block text-sm font-medium">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          {fieldErrors.newPassword?.map((msg) => (
            <p key={msg} className="mt-1 text-sm text-red-600">
              {msg}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="confirmNewPassword" className="mb-1 block text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          {fieldErrors.confirmNewPassword?.map((msg) => (
            <p key={msg} className="mt-1 text-sm text-red-600">
              {msg}
            </p>
          ))}
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </main>
  );
}