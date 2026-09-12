"use client";

import { useState, type FormEvent } from "react";
import { submitPurchaseRequestAction } from "@/features/shop/actions/submitPurchaseRequestAction";

interface PurchaseFormProps {
  artworkId: string;
  artworkTitle: string;
  unitPrice: number;
}

interface DraftOrder {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  notes: string;
  quantity: number;
}

const EMPTY_DRAFT: DraftOrder = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  shippingAddress: "",
  notes: "",
  quantity: 1,
};

type Step = "form" | "summary" | "confirmed";

/**
 * Public, unauthenticated purchase flow (BR-011). Eligibility is
 * re-verified server-side inside ShopService on submission regardless
 * of what this component already knows — the client is never trusted.
 */
export function PurchaseForm({ artworkId, artworkTitle, unitPrice }: PurchaseFormProps) {
  const [step, setStep] = useState<Step>("form");
  const [draft, setDraft] = useState<DraftOrder>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const totalPrice = unitPrice * draft.quantity;

  function handleReview(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!draft.customerName.trim() || !draft.customerEmail.trim() || !draft.shippingAddress.trim()) {
      setError("Please fill in your name, email, and shipping address.");
      return;
    }
    setStep("summary");
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);

    const result = await submitPurchaseRequestAction({
      artworkId,
      customerName: draft.customerName,
      customerEmail: draft.customerEmail,
      customerPhone: draft.customerPhone || undefined,
      shippingAddress: draft.shippingAddress,
      notes: draft.notes || undefined,
      quantity: draft.quantity,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
      setStep("form");
      return;
    }

    setOrderNumber(result.data.orderNumber);
    setStep("confirmed");
  }

  if (step === "confirmed") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <h3 className="mb-2 text-lg font-semibold text-green-900">Purchase request submitted</h3>
        <p className="text-sm text-green-800">
          Your order reference number is <span className="font-mono font-medium">{orderNumber}</span>.
        </p>
        <p className="mt-2 text-sm text-green-800">
          Payment instructions will be provided separately by the artist.
        </p>
      </div>
    );
  }

  if (step === "summary") {
    return (
      <div className="space-y-4 rounded-lg border border-neutral-200 p-4">
        <h3 className="text-sm font-medium">Confirm your order</h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-neutral-500">Artwork</dt><dd>{artworkTitle}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Quantity</dt><dd>{draft.quantity}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Unit price</dt><dd>${unitPrice.toFixed(2)}</dd></div>
          <div className="flex justify-between font-medium"><dt>Total</dt><dd>${totalPrice.toFixed(2)}</dd></div>
        </dl>
        <dl className="space-y-1 border-t border-neutral-200 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-neutral-500">Name</dt><dd>{draft.customerName}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Email</dt><dd>{draft.customerEmail}</dd></div>
          {draft.customerPhone && <div className="flex justify-between"><dt className="text-neutral-500">Phone</dt><dd>{draft.customerPhone}</dd></div>}
          <div className="flex justify-between"><dt className="text-neutral-500">Shipping address</dt><dd className="text-right">{draft.shippingAddress}</dd></div>
        </dl>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep("form")}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Submitting…" : "Confirm and submit"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleReview} className="space-y-4 rounded-lg border border-neutral-200 p-4">
      <h3 className="text-sm font-medium">Purchase this artwork</h3>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Full name</label>
        <input
          value={draft.customerName}
          onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        {fieldErrors.customerName && <p className="mt-1 text-xs text-red-600">{fieldErrors.customerName[0]}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Email address</label>
        <input
          type="email"
          value={draft.customerEmail}
          onChange={(e) => setDraft({ ...draft, customerEmail: e.target.value })}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        {fieldErrors.customerEmail && <p className="mt-1 text-xs text-red-600">{fieldErrors.customerEmail[0]}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Phone number (optional)</label>
        <input
          value={draft.customerPhone}
          onChange={(e) => setDraft({ ...draft, customerPhone: e.target.value })}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Shipping address</label>
        <textarea
          value={draft.shippingAddress}
          onChange={(e) => setDraft({ ...draft, shippingAddress: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        {fieldErrors.shippingAddress && <p className="mt-1 text-xs text-red-600">{fieldErrors.shippingAddress[0]}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Additional notes (optional)</label>
        <textarea
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          rows={2}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Quantity</label>
        <input
          type="number"
          min={1}
          value={draft.quantity}
          onChange={(e) => setDraft({ ...draft, quantity: Math.max(1, Number(e.target.value) || 1) })}
          className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
        Review order
      </button>
    </form>
  );
}
