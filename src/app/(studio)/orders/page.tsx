import Link from "next/link";
import { OrderService } from "@/services/order/OrderService";

export default async function OrdersPage() {
  const orders = await OrderService.list();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-neutral-500">No orders yet.</p>
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
