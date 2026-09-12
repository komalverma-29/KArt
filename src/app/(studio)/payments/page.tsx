import Link from "next/link";
import { PaymentService } from "@/services/payment/PaymentService";
import type { PaymentStatus, PaymentMethod } from "@prisma/client";

const STATUSES: PaymentStatus[] = ["PENDING", "PAID", "REFUNDED"];
const METHODS: PaymentMethod[] = ["BANK_TRANSFER", "UPI", "CASH", "OTHER"];

interface PaymentsPageProps {
  searchParams?: {
    q?: string;
    status?: string;
    method?: string;
  };
}

/**
 * FR-PAY-002 View Payments, FR-PAY-009 Search Payments, FR-PAY-010
 * Filter Payments. Payment notes are never selected/displayed here —
 * this list only shows the fields FR-PAY-002 requires (id, order,
 * customer, status, method, amount, last updated). Full payment detail
 * (including private notes) stays in the embedded Payment panel on the
 * Order detail page (FR-PAY-003/FR-PAY-008).
 */
export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const q = searchParams?.q ?? "";
  const status = searchParams?.status ?? "";
  const method = searchParams?.method ?? "";

  const payments = await PaymentService.list({
    ...(q ? { search: q } : {}),
    ...(status ? { status: status as PaymentStatus } : {}),
    ...(method ? { method: method as PaymentMethod } : {}),
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Payments</h1>

      <form className="mb-6 flex flex-wrap items-end gap-3 text-sm" method="get">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Search</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Order #, customer, reference"
            className="rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Status</label>
          <select name="status" defaultValue={status} className="rounded-md border border-neutral-300 px-2 py-1.5">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Method</label>
          <select name="method" defaultValue={method} className="rounded-md border border-neutral-300 px-2 py-1.5">
            <option value="">All</option>
            {METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
          Apply
        </button>
      </form>

      {payments.length === 0 ? (
        <p className="text-sm text-neutral-500">No payments match these filters.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500">
              <th className="py-2">Payment</th>
              <th className="py-2">Order</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Status</th>
              <th className="py-2">Method</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Last updated</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b">
                <td className="py-2 font-mono text-xs">{payment.id.slice(0, 8)}</td>
                <td className="py-2">
                  <Link href={`/studio/orders/${payment.orderId}`} className="underline">
                    {payment.order.orderNumber}
                  </Link>
                </td>
                <td className="py-2">{payment.order.customerName}</td>
                <td className="py-2">{payment.status}</td>
                <td className="py-2">{payment.method?.replace(/_/g, " ") ?? "—"}</td>
                <td className="py-2">${Number(payment.amount).toFixed(2)}</td>
                <td className="py-2">{new Date(payment.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
