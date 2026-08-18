import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatTND, parsePrice } from "@/lib/price";
import { useT } from "@/hooks/use-language";
import { placePreOrder } from "@/lib/pre-orders.functions.server";
import { getProductBySlug } from "@/lib/products.server";
import { ProductsLoading } from "@/components/products-loading";
import type { Product } from "@/lib/products";

export const Route = createFileRoute("/pre-order")({
  validateSearch: (search: Record<string, unknown>) => ({
    slug: (search.slug as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Pre-Order — HOUSE OF FLAGS" },
      { name: "description", content: "Pre-order this out-of-stock piece from HOUSE OF FLAGS." },
    ],
  }),
  component: PreOrderPage,
});

function PreOrderPage() {
  const { slug } = useSearch({ from: "/pre-order" });
  const navigate = useNavigate();
  const t = useT();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preOrderRef, setPreOrderRef] = useState("");
  const [qty, setQty] = useState(1);
  const [withSupport, setWithSupport] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });

  // Load product on mount or when slug changes
  useEffect(() => {
    const loadProduct = async () => {
      try {
        if (!slug) {
          setError("Product slug is required");
          return;
        }

        const productData = await getProductBySlug({ data: slug });
        if (!productData || !productData.is_active) {
          setError("Product not found or inactive");
          return;
        }

        setProduct(productData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [slug]);

  if (loading) {
    return <ProductsLoading />;
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-4xl">SOMETHING BROKE</p>
        <p className="text-sm text-muted-foreground">
          {error || "We couldn't load this pre-order form. Please try again."}
        </p>
        <Link to="/drops" className="mt-2 text-xs uppercase tracking-[0.3em] underline-offset-8 hover:underline">
          Back to drop
        </Link>
      </div>
    );
  }

  const supportExtra =
    product.support.enabled && withSupport ? parsePrice(product.support.price) : 0;
  const unitTotal = parsePrice(product.price) + supportExtra;
  const lineTotal = unitTotal * qty;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const result = await placePreOrder({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          notes: form.notes.trim(),
          items: [
            {
              slug: product.slug,
              qty,
              withSupport: Boolean(withSupport),
            },
          ],
        },
      });

      if (!result.ok) {
        toast.error(result.error || "Couldn't place your pre-order. Try again in a sec.");
        setSubmitting(false);
        return;
      }

      setPreOrderRef(result.preOrderRef);
      setSubmitted(true);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Pre-order submission failed:", err);
      toast.error("Couldn't place your pre-order. Try again in a sec.");
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <article className="pt-32">
        <section className="mx-auto flex max-w-[760px] flex-col items-center px-6 py-24 text-center md:px-10">
          <p className="text-[10px] uppercase tracking-[0.5em] ember-text">
            Pre-Order Received
          </p>
          <h1 className="mt-8 font-display text-7xl leading-[0.9] md:text-9xl">
            Thanks
            <br />
            for the
            <br />
            Commitment
          </h1>
          <p className="mt-10 max-w-md text-base leading-relaxed text-muted-foreground">
            Your pre-order for <strong>{product.name}</strong> has been recorded. We'll notify you when this piece is back in stock.
          </p>

          <div className="mt-12 w-full max-w-sm border hairline">
            <div className="flex items-center justify-between px-5 py-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span>Pre-Order Reference</span>
              <span className="font-display text-base text-foreground">{preOrderRef}</span>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center gap-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              Check out more pieces
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/drops" })}
              className="border hairline px-10 py-4 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background"
            >
              Back to Drop
            </button>
          </div>
        </section>
      </article>
    );
  }

  return (
    <article className="pt-24">
      <div className="mx-auto max-w-[1600px] px-6 py-12 md:px-10 md:py-20">
        <div className="mb-12">
          <Link
            to="/product/$slug"
            params={{ slug: product.slug }}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
          >
            ← Back to product
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
          {/* Product Summary */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              HOUSE OF FLAGS / Drop 001 / {product.label}
            </p>
            <h1 className="mt-4 font-display text-5xl md:text-6xl">{product.name}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.story}</p>

            <div className="mt-8 space-y-4 border-t hairline pt-8">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Base Price
                </span>
                <span className="font-display text-lg">{formatTND(product.price)}</span>
              </div>

              {product.support.enabled && withSupport && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {product.support.name}
                  </span>
                  <span className="font-display text-lg">
                    {formatTND(product.support.price)}
                  </span>
                </div>
              )}

              {qty > 1 && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Quantity ({qty}x)
                  </span>
                  <span className="font-display text-lg">
                    × {qty}
                  </span>
                </div>
              )}

              <div className="border-t hairline pt-4 flex items-baseline justify-between">
                <span className="font-display text-lg text-foreground">Total (excl. shipping)</span>
                <span className="font-display text-2xl">{formatTND(String(lineTotal))}</span>
              </div>
            </div>

            <p className="mt-8 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              ⚠️ This item is currently out of stock. Your pre-order secures one when we restock. Shipping will be calculated at fulfillment.
            </p>
          </div>

          {/* Pre-Order Form */}
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Quantity
              </label>
              <div className="flex items-center border hairline">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  className="px-4 py-3 text-sm transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span className="flex-1 text-center font-display text-lg">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(Math.min(20, qty + 1))}
                  disabled={qty >= 20}
                  className="px-4 py-3 text-sm transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            {product.support.enabled && (
              <fieldset className="space-y-3 border-t hairline pt-6">
                <legend className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {t("support.question")}
                </legend>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="support"
                    checked={!withSupport}
                    onChange={() => setWithSupport(false)}
                    className="accent-foreground"
                  />
                  <span>{t("support.without")}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="support"
                    checked={withSupport}
                    onChange={() => setWithSupport(true)}
                    className="accent-foreground"
                  />
                  <span>
                    {t("support.with")} — {product.support.name}
                    {parsePrice(product.support.price) > 0
                      ? ` (+${formatTND(product.support.price)})`
                      : ""}
                  </span>
                </label>
              </fieldset>
            )}

            <fieldset className="space-y-3 border-t hairline pt-6">
              <legend className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Contact Information
              </legend>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  required
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+216 XX XXX XXXX"
                  required
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Tunis"
                  required
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street and number"
                  required
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special requests?"
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                  rows={3}
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={submitting}
              className="w-full border hairline py-5 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Confirm Pre-Order"}
            </button>

            <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
              ✓ We will contact you when this item is back in stock.
            </p>
          </form>
        </div>
      </div>
    </article>
  );
}
