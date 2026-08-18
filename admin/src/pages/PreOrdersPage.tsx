import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import type { PreOrder } from "@/lib/types";
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

export function PreOrdersPage() {
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const load = async () => {
    setError("");
    try {
      const { preOrders: data } = await api.preOrders.list();
      setPreOrders(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load pre-orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = preOrders;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.customer_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.pre_order_ref.toLowerCase().includes(q) ||
          p.items.some((item: any) => item.slug?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [preOrders, search]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.preOrders.delete(deleteId);
      setPreOrders((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete pre-order.");
    } finally {
      setDeleting(false);
    }
  };

  const confirmActivate = async (id: string) => {
    if (!id) return;
    setActivatingId(id);
    try {
      await api.preOrders.activate(id);
      setPreOrders((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to activate pre-order.");
    } finally {
      setActivatingId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title="Pre-Orders"
        description="View and manage customer pre-orders for out-of-stock products."
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-4">
        <Input
          placeholder="Search by customer, email, reference, or product slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {preOrders.length === 0 ? (
        <EmptyState message="No pre-orders yet." />
      ) : filtered.length === 0 ? (
        <EmptyState message="No pre-orders match your filters." />
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
              {filtered.map((preOrder) => (
                <tr key={preOrder.id} className="hover:bg-background/40">
                  <td className="px-4 py-3 font-mono text-xs">{preOrder.pre_order_ref}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{preOrder.customer_name}</p>
                    <p className="text-xs text-muted">{preOrder.email}</p>
                  </td>
                  <td className="px-4 py-3">{formatMoney(preOrder.total, preOrder.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[preOrder.status] ?? "neutral"}>{preOrder.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(preOrder.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="primary"
                        disabled={activatingId === preOrder.id}
                        onClick={() => confirmActivate(preOrder.id)}
                      >
                        {activatingId === preOrder.id ? "Activating..." : "Activate Order"}
                      </Button>
                      <Button variant="danger" onClick={() => setDeleteId(preOrder.id)}>
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
        title="Delete pre-order"
        message="This permanently removes the pre-order record."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </>
  );
}
