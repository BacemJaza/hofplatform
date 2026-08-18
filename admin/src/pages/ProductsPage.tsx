import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import { formatDate, formatTnd } from "@/lib/format";
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

type Filter = "all" | "active" | "inactive" | "in-stock" | "out-of-stock" | "available-pre-order";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setError("");
    try {
      const { products: data } = await api.products.list();
      setProducts(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = products;

    if (filter === "active") result = result.filter((p) => p.is_active);
    else if (filter === "inactive") result = result.filter((p) => !p.is_active);
    else if (filter === "in-stock") result = result.filter((p) => p.is_active && p.quantity > 0);
    else if (filter === "out-of-stock") result = result.filter((p) => p.is_active && p.quantity === 0);
    else if (filter === "available-pre-order") result = result.filter((p) => p.is_active && p.quantity === 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.label.toLowerCase().includes(q)
      );
    }

    return result;
  }, [products, filter, search]);

  const toggleActive = async (product: Product) => {
    try {
      const { product: updated } = await api.products.toggleActive(product.id, !product.is_active);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update product.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.products.delete(deleteId);
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage catalog items and availability."
        action={
          <Link to="/products/new">
            <Button>New product</Button>
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "inactive", "in-stock", "out-of-stock", "available-pre-order"] as const).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-accent text-white"
                    : "bg-background text-muted hover:text-foreground"
                }`}
              >
                {f === "in-stock"
                  ? "In Stock"
                  : f === "out-of-stock"
                    ? "Out of Stock"
                    : f === "available-pre-order"
                      ? "Available for Pre-Order"
                      : f}
              </button>
            )
          )}
        </div>
        <Input
          placeholder="Search by name, slug, or label..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No products found." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-background/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-background">
                        {(product.image_urls?.[0] || product.image_url) ? (
                          <img
                            src={product.image_urls?.[0] || product.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted">{product.label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{product.slug}</td>
                  <td className="px-4 py-3">{formatTnd(product.price_eur)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{product.quantity}</span>
                      {product.quantity === 0 && <Badge tone="danger">Out</Badge>}
                      {product.quantity > 0 && product.quantity <= 5 && <Badge tone="warning">Low</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        product.is_active
                          ? product.quantity > 0
                            ? "success"
                            : "warning"
                          : "neutral"
                      }
                    >
                      {product.is_active
                        ? product.quantity > 0
                          ? "In Stock"
                          : "Pre-Order"
                        : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(product.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => toggleActive(product)}>
                        {product.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Link to={`/products/${product.id}/edit`}>
                        <Button variant="secondary">Edit</Button>
                      </Link>
                      <Button variant="danger" onClick={() => setDeleteId(product.id)}>
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
        title="Delete product"
        message="This permanently removes the product from the catalog."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </>
  );
}
