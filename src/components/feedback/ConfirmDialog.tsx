"use client";

import { useState, type ReactNode } from "react";

interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Minimal reusable confirmation dialog (FR-COM-012 Common). Not the
 * full Epic 10 cross-cutting system — just the integration point Epic 3
 * needs for destructive actions (archive/restore/publish/delete).
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
      setOpen(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">{title}</h2>
            <p className="mb-6 text-sm text-neutral-600">{description}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${destructive ? "bg-red-600" : "bg-neutral-900"}`}
              >
                {isSubmitting ? "Working…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}