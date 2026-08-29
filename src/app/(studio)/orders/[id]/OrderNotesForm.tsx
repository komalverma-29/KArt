"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addOrderNoteAction } from "@/features/orders/actions/orderActions";

export function OrderNotesForm({ orderId, initialNotes }: { orderId: string; initialNotes: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await addOrderNoteAction({ id: orderId, internalNotes: notes });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        placeholder="Notes visible only to you…"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        {isSubmitting ? "Saving…" : "Save note"}
      </button>
    </form>
  );
}
