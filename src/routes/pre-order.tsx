import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatTND, parsePrice } from "@/lib/price";
import { useT } from "@/hooks/use-language";
import { placePreOrder } from "@/lib/pre-orders.functions.server";
import { getProductBySlug } from "@/lib/products.server";
import { ProductsLoading } from "@/components/products-loading";
import { discountedPrice, type Product } from "@/lib/products";

export const Route = createFileRoute("/pre-order")({
  validateSearch: (search: Record<string, unknown>) => ({
    slug: (search.slug as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Pre-order — HOUSE OF FLAGS" },
      { name: "description", content: "Submit a pre-order request for an unavailable HOUSE OF FLAGS design." },
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
  const [hasError, setHasError] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preOrderRef, setPreOrderRef] = useState("");
  const [qty, setQty] = useState(1);
  const [withSupport, setWithSupport] = useState(false);
  const [supportQty, setSupportQty] = useState(0);
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
          setHasError(true);
          return;
        }

        const productData = await getProductBySlug({ data: slug });
        if (!productData || productData.status !== "active") {
          setHasError(true);
          return;
        }

        setProduct(productData);
        setHasError(false);
      } catch (err) {
        console.error("Pre-order product load failed:", err);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [slug]);

  if (loading) {
    return <ProductsLoading />;
  }

  if (hasError || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-4xl">{t("preorder.page.errorTitle")}</p>
        <p className="text-sm text-muted-foreground">
          {t("preorder.page.errorBody")}
        </p>
        <Link to="/drops" className="mt-2 text-xs uppercase tracking-[0.3em] underline-offset-8 hover:underline">
          {t("common.backToCollection")}
        </Link>
      </div>
    );
  }

  const supportExtra = product.support.enabled ? parsePrice(product.support.price) : 0;
  const currentPrice = discountedPrice(product.price, product.discount_percent);
  const lineTotal = currentPrice * qty + (withSupport ? supportExtra * supportQty : 0);

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
              supportQty: withSupport ? supportQty : 0,
            },
          ],
        },
      });

      if (!result.ok) {
        toast.error(result.error || t("preorder.page.submittingError"));
        setSubmitting(false);
        return;
      }

      setPreOrderRef(result.preOrderRef);
      setSubmitted(true);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Pre-order submission failed:", err);
      toast.error(t("preorder.page.submittingError"));
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <article className="pt-32">
        <section className="mx-auto flex max-w-[760px] flex-col items-center px-6 py-24 text-center md:px-10">
          <p className="text-[10px] uppercase tracking-[0.5em] ember-text">
            {t("preorder.page.received")}
          </p>
          <h1 className="mt-8 font-display text-7xl leading-[0.9] md:text-9xl">
            {t("preorder.page.thanks")}
          </h1>
          <p className="mt-10 max-w-md text-base leading-relaxed text-muted-foreground">
            {t("preorder.page.message")} <strong>{product.name}</strong> {t("preorder.page.notified")}
          </p>

          <div className="mt-12 w-full max-w-sm border hairline">
            <div className="flex items-center justify-between px-5 py-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span>{t("preorder.page.ref")}</span>
              <span className="font-display text-base text-foreground">{preOrderRef}</span>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center gap-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              {t("preorder.page.explore")}
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/drops" })}
              className="border hairline px-10 py-4 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background"
            >
              {t("preorder.page.back")}
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
            {t("preorder.page.backToProduct")}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
          {/* Product Summary */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              HOUSE OF FLAGS / Collection 001 / {product.label}
            </p>
            <h1 className="mt-4 font-display text-5xl md:text-6xl">{product.name}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.story}</p>

            <div className="mt-8 space-y-4 border-t hairline pt-8">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {t("preorder.page.basePrice")}
                </span>
                <span className="font-display text-lg">
                  {product.discount_percent > 0 && (
                    <span className="mr-2 text-sm text-muted-foreground line-through">
                      {formatTND(product.price)}
                    </span>
                  )}
                  {formatTND(currentPrice)}
                  {product.discount_percent > 0 && (
                    <span className="ml-2 text-[10px] uppercase text-ember">
                      {product.discount_percent}% off
                    </span>
                  )}
                </span>
              </div>

              {product.support.enabled && withSupport && supportQty > 0 && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {product.support.name} x {supportQty}
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
                <span className="font-display text-lg text-foreground">{t("preorder.page.totalExclShipping")}</span>
                <span className="font-display text-2xl">{formatTND(String(lineTotal))}</span>
              </div>
            </div>

            <p className="mt-8 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {t("preorder.page.outOfStock")}
            </p>
          </div>

          {/* Pre-Order Form */}
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                {t("preorder.page.quantity")}
              </label>
              <div className="flex items-center border hairline">
                <button
                  type="button"
                  onClick={() => {
                    const nextQty = Math.max(1, qty - 1);
                    setQty(nextQty);
                    setSupportQty((current) => Math.min(current, nextQty));
                  }}
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
                {withSupport && (
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span>{t("support.quantity")}</span>
                    <input
                      type="number"
                      min="0"
                      max={qty}
                      value={supportQty}
                      onChange={(event) => setSupportQty(Math.max(0, Math.min(qty, Number(event.target.value))))}
                      className="w-20 border hairline bg-transparent px-2 py-1 text-center"
                    />
                  </label>
                )}
              </fieldset>
            )}

            <fieldset className="space-y-3 border-t hairline pt-6">
              <legend className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {t("preorder.page.contact")}
              </legend>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t("preorder.page.name")}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("preorder.page.namePlaceholder")}
                  required
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t("preorder.page.email")}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t("preorder.page.emailPlaceholder")}
                  required
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t("preorder.page.phone")}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={t("preorder.page.phonePlaceholder")}
                  required
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t("preorder.page.city")}</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder={t("preorder.page.cityPlaceholder")}
                  required
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t("preorder.page.address")}</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t("preorder.page.addressPlaceholder")}
                  required
                  className="w-full border hairline px-4 py-2 text-sm bg-background placeholder-muted-foreground outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t("preorder.page.notes")}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t("preorder.page.notesPlaceholder")}
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
              {submitting ? t("preorder.page.confirming") : t("preorder.page.confirm")}
            </button>

            <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
              {t("preorder.page.note")}
            </p>
          </form>
        </div>
      </div>
    </article>
  );
}
