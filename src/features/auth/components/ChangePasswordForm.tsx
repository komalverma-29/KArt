"use client";

import { useState, type FormEvent } from "react";
import { ChangePasswordSchema } from "@/schemas/auth/ChangePasswordSchema";
import { changePasswordAction } from "@/features/auth/actions/changePasswordAction";

/**
 * Minimum password-change integration required by Task 2.5.4.
 *
 * This component is intentionally NOT wired into any route yet — the
 * full Settings page is Epic 8 scope. Epic 8 should import and render
 * this component inside its Settings form; nothing further needs to
 * change here when that happens.
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(false);

    const parsed = ChangePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const result = await changePasswordAction(parsed.data);
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error.message);
      if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium">
          Current password
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {fieldErrors.currentPassword?.map((msg) => (
          <p key={msg} className="mt-1 text-sm text-red-600">
            {msg}
          </p>
        ))}
      </div>

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
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
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
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {fieldErrors.confirmNewPassword?.map((msg) => (
          <p key={msg} className="mt-1 text-sm text-red-600">
            {msg}
          </p>
        ))}
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}
      {success && <p className="text-sm text-green-700">Password updated successfully.</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}