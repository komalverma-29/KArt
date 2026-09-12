import Link from "next/link";
import { OrderService } from "@/services/order/OrderService";
import type { OrderSort } from "@/repositories/order/OrderRepository";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

const STATUSES: OrderStatus[] = [
  "PENDING", "CONFIRMED", "AWAITING_PAYMENT", "PAID",
  "PREPARING_SHIPMENT", "SHIPPED", "DELIVERED", "CANCELLED",
];
const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "PAID", "REFUNDED"];
const SORTS: { value: OrderSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "customerName", label: "Customer name" },
  { value: "totalAmount", label: "Total amount" },
];

interface OrdersPageProps {
  searchParams?: {
    q?: string;
    status?: string;
    paymentStatus?: string;
    sort?: string;
  };
}

/** FR-ORDER-002/009/010/011 — order list with search, filters, and sort. */
export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const q = searchParams?.q ?? "";
  const status = searchParams?.status ?? "";
  const paymentStatus = searchParams?.paymentStatus ?? "";
  const sort = (searchParams?.sort as OrderSort) || "newest";

  const orders = await OrderService.list({
    ...(q ? { search: q } : {}),
    ...(status ? { status: status as OrderStatus } : {}),
    ...(paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {}),
    sort,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Orders</h1>

      <form className="mb-6 flex flex-wrap items-end gap-3 text-sm" method="get">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Search</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Order #, customer, email"
            className="rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Status</label>
          <select name="status" defaultValue={status} className="rounded-md border border-neutral-300 px-2 py-1.5">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Payment status</label>
          <select name="paymentStatus" defaultValue={paymentStatus} className="rounded-md border border-neutral-300 px-2 py-1.5">
            <option value="">All</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Sort</label>
          <select name="sort" defaultValue={sort} className="rounded-md border border-neutral-300 px-2 py-1.5">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
          Apply
        </button>
      </form>

      {orders.length === 0 ? (
        <p className="text-sm text-neutral-500">No orders match these filters.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500">
              <th className="py-2">Order</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Status</th>
              <th className="py-2">Payment</th>
              <th className="py-2">Total</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b">
                <td className="py-2">
                  <Link href={`/studio/orders/${order.id}`} className="underline">{order.orderNumber}</Link>
                </td>
                <td className="py-2">{order.customerName}</td>
                <td className="py-2">{order.status.replace(/_/g, " ")}</td>
                <td className="py-2">{order.payment?.status ?? "—"}</td>
                <td className="py-2">${Number(order.totalAmount).toFixed(2)}</td>
                <td className="py-2">{new Date(order.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
