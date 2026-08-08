"use client";

import { useState, type FormEvent } from "react";
import { RequestPasswordResetSchema } from "@/schemas/auth/ResetPasswordSchema";
import { requestPasswordResetAction } from "@/features/auth/actions/requestPasswordResetAction";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = RequestPasswordResetSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setIsSubmitting(true);
    await requestPasswordResetAction(parsed.data);
    setIsSubmitting(false);

    // Always show the same confirmation, regardless of whether the
    // email exists — no account enumeration.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-neutral-600">
          If an account exists for that email address, we&apos;ve sent instructions to reset your
          password. The link will expire in 30 minutes.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Forgot password</h1>
      <p className="mb-8 text-sm text-neutral-600">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          {fieldErrors.email?.map((msg) => (
            <p key={msg} className="mt-1 text-sm text-red-600">
              {msg}
            </p>
          ))}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? "Sending…" : "Send reset link"}
        </button>

        <div className="text-center text-sm">
          <a href="/login" className="text-neutral-600 underline">
            Back to login
          </a>
        </div>
      </form>
    </main>
  );
}