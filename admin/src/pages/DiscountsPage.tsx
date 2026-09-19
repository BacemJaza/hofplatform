import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import type { Discount } from "@/lib/types";
import { formatDate } from "@/lib/format";
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

type Filter = "all" | "active" | "inactive";

export function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setError("");
    try {
      const { discounts: data } = await api.discounts.list();
      setDiscounts(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load discounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = discounts;

    if (filter === "active") result = result.filter((d) => d.is_active);
    else if (filter === "inactive") result = result.filter((d) => !d.is_active);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.code.toLowerCase().includes(q));
    }

    return result;
  }, [discounts, filter, search]);

  const setStatus = async (discount: Discount, is_active: boolean) => {
    try {
      const { discount: updated } = await api.discounts.setStatus(discount.id, is_active);
      setDiscounts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update discount.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.discounts.delete(deleteId);
      setDiscounts((prev) => prev.filter((d) => d.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete discount.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title="Discounts"
        description="Manage promo codes and track usage."
        action={
          <Link to="/discounts/new">
            <Button>New discount</Button>
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-accent text-white"
                  : "bg-background text-muted hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search by promo code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No discounts found." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Promo code</th>
                <th className="px-4 py-3 font-medium">Discount %</th>
                <th className="px-4 py-3 font-medium">Times used</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((discount) => (
                <tr key={discount.id} className="hover:bg-background/40">
                  <td className="px-4 py-3 font-mono text-sm font-medium">{discount.code}</td>
                  <td className="px-4 py-3">{discount.discount_percent}%</td>
                  <td className="px-4 py-3">{discount.usage_count}</td>
                  <td className="px-4 py-3">
                    <Badge tone={discount.is_active ? "success" : "neutral"}>
                      {discount.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(discount.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link to={`/discounts/${discount.id}/edit`}>
                        <Button variant="ghost">Edit</Button>
                      </Link>
                      {discount.is_active ? (
                        <Button variant="ghost" onClick={() => setStatus(discount, false)}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={() => setStatus(discount, true)}>
                          Activate
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => setDeleteId(discount.id)}>
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
        open={Boolean(deleteId)}
        title="Delete discount?"
        message="This promo code will be permanently removed."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
