import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import type { Order } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Spinner,
} from "@/components/ui";

const statusTone: Record<string, "neutral" | "success" | "danger" | "warning"> = {
  pending: "warning",
  confirmed: "neutral",
  shipped: "neutral",
  delivered: "success",
  cancelled: "danger",
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setError("");
    try {
      const { orders: data } = await api.orders.list();
      setOrders(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.orders.delete(deleteId);
      setOrders((prev) => prev.filter((o) => o.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete order.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title="Orders"
        description="View and manage customer orders."
        action={
          <Link to="/orders/new">
            <Button>New order</Button>
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}

      {orders.length === 0 ? (
        <EmptyState message="No orders yet." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-background/40">
                  <td className="px-4 py-3 font-mono text-xs">{order.order_ref}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-xs text-muted">{order.email}</p>
                  </td>
                  <td className="px-4 py-3">{formatMoney(order.total, order.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[order.status] ?? "neutral"}>{order.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link to={`/orders/${order.id}/edit`}>
                        <Button variant="secondary">Edit</Button>
                      </Link>
                      <Button variant="danger" onClick={() => setDeleteId(order.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete order"
        message="This permanently removes the order record."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </>
  );
}
