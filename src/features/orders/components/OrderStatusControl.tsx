"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { updateOrderStatusAction, cancelOrderAction } from "@/features/orders/actions/orderActions";

const NEXT_STATUS: Record<string, string | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "AWAITING_PAYMENT",
  AWAITING_PAYMENT: "PAID",
  PAID: "PREPARING_SHIPMENT",
  PREPARING_SHIPMENT: "SHIPPED",
  SHIPPED: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

export function OrderStatusControl({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const nextStatus = NEXT_STATUS[status];

  async function advance() {
    if (!nextStatus) return;
    const result = await updateOrderStatusAction({ id: orderId, status: nextStatus });
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    router.refresh();
  }

  const canCancel = status !== "DELIVERED" && status !== "CANCELLED";

  return (
    <div className="space-y-2">
      <p className="text-sm">
        Current status: <span className="font-medium">{status.replace(/_/g, " ")}</span>
      </p>
      <div className="flex gap-3">
        {nextStatus && (
          <button onClick={advance} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
            Mark as {nextStatus.replace(/_/g, " ")}
          </button>
        )}
        {canCancel && (
          <ConfirmDialog
            trigger={<button className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600">Cancel order</button>}
            title="Cancel this order?"
            description="This cannot be undone. The order will move to Cancelled and can never become Delivered."
            confirmLabel="Cancel order"
            destructive
            onConfirm={async () => {
              const result = await cancelOrderAction({ id: orderId });
              if (!result.success) setError(result.error.message);
              router.refresh();
            }}
          />
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
