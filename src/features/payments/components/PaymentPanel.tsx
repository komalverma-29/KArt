"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { recordPaymentDetailsAction } from "@/features/payments/actions/paymentActions";

interface PaymentPanelProps {
  payment: {
    id: string;
    orderId: string;
    status: string;
    method: string | null;
    paymentReference: string | null;
    paymentDate: string | null; // ISO string as passed from a Server Component
    amount: number;
    notes: string | null;
  };
}

const METHODS = ["BANK_TRANSFER", "UPI", "CASH", "OTHER"];
const STATUSES = ["PENDING", "PAID", "REFUNDED"];

export function PaymentPanel({ payment }: PaymentPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(payment.status);
  const [method, setMethod] = useState(payment.method ?? "");
  const [paymentReference, setPaymentReference] = useState(payment.paymentReference ?? "");
  const [paymentDate, setPaymentDate] = useState(payment.paymentDate?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(payment.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await recordPaymentDetailsAction({
      id: payment.id,
      status,
      method: method || undefined,
      paymentReference: paymentReference || undefined,
      paymentDate: paymentDate || undefined,
      notes: notes || undefined,
    });

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-neutral-200 p-4">
      <h3 className="text-sm font-medium">Payment</h3>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">—</option>
          {METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Reference (UTR / receipt no.)</label>
        <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Payment date</label>
        <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Private notes (Studio-only)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={isSubmitting} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        {isSubmitting ? "Saving…" : "Save payment"}
      </button>
    </form>
  );
}
