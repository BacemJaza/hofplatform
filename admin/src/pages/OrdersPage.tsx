import { useEffect, useMemo, useState } from "react";
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
  Input,
} from "@/components/ui";

type Filter = "all" | "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

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
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
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

  const filtered = useMemo(() => {
    let result = orders;

    if (filter !== "all") {
      result = result.filter((o) => o.status === filter);
    }

    if (dateFilter !== "all") {
      const now = new Date();

      if (dateFilter === "today") {
        result = result.filter((o) => {
          const d = new Date(o.created_at);
          return d.toDateString() === now.toDateString();
        });
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        result = result.filter((o) => new Date(o.created_at) >= weekAgo);
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        result = result.filter((o) => new Date(o.created_at) >= monthAgo);
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          o.order_ref.toLowerCase().includes(q) ||
          o.items.some((item) => item.slug?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [orders, filter, dateFilter, search]);

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

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "confirmed", "shipped", "delivered", "cancelled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === f ? "bg-accent text-white" : "bg-background text-muted hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "today", "week", "month"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDateFilter(d)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                dateFilter === d
                  ? "bg-accent text-white"
                  : "bg-background text-muted hover:text-foreground"
              }`}
            >
              {d === "today" ? "Today" : d === "week" ? "This Week" : d === "month" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>

        <Input
          placeholder="Search by customer, email, or product slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {orders.length === 0 ? (
        <EmptyState message="No orders yet." />
      ) : filtered.length === 0 ? (
        <EmptyState message="No orders match your filters." />
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
