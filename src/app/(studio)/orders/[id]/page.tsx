import { notFound } from "next/navigation";
import { OrderService } from "@/services/order/OrderService";
import { OrderStatusControl } from "@/features/orders/components/OrderStatusControl";
import { PaymentPanel } from "@/features/payments/components/PaymentPanel";
import { OrderNotesForm } from "./OrderNotesForm";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await OrderService.getById(params.id);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Order {order.orderNumber}</h1>

      <section className="mb-8 grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">Customer</h2>
          <p className="text-sm">{order.customerName}</p>
          <p className="text-sm">{order.customerEmail}</p>
          {order.customerPhone && <p className="text-sm">{order.customerPhone}</p>}
          <p className="mt-2 text-sm text-neutral-600">{order.shippingAddress}</p>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">Status</h2>
          <OrderStatusControl orderId={order.id} status={order.status} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Items</h2>
        <table className="w-full text-sm">
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.artworkTitle}</td>
                <td className="py-2">Qty {item.quantity}</td>
                <td className="py-2">${Number(item.unitPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm font-medium">Total: ${Number(order.totalAmount).toFixed(2)}</p>
      </section>

      {order.payment && (
        <section className="mb-8">
          <PaymentPanel
            payment={{
              id: order.payment.id,
              orderId: order.id,
              status: order.payment.status,
              method: order.payment.method,
              paymentReference: order.payment.paymentReference,
              paymentDate: order.payment.paymentDate ? order.payment.paymentDate.toISOString() : null,
              amount: Number(order.payment.amount),
              notes: order.payment.notes,
            }}
          />
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Status history</h2>
        <ul className="space-y-1 text-sm text-neutral-600">
          {order.statusHistory.map((entry) => (
            <li key={entry.id}>
              {new Date(entry.changedAt).toLocaleString()} — {entry.status.replace(/_/g, " ")}
              {entry.note ? ` (${entry.note})` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Internal notes (Studio-only)</h2>
        <OrderNotesForm orderId={order.id} initialNotes={order.internalNotes ?? ""} />
      </section>
    </main>
  );
}
