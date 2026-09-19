import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCart } from "@/stores/cart-store";
import { formatTND, parsePrice } from "@/lib/price";
import { useT } from "@/hooks/use-language";
import { placeOrder } from "@/lib/orders.functions.server";
import { validatePromoCode } from "@/lib/discounts.functions.server";
import { calculateDiscountAmount } from "@/lib/discounts.server";
import { getDeliveryFee } from "@/lib/settings.server";
import { getActiveProducts } from "@/lib/products.server";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  loader: async () => {
    const [deliveryFee, products] = await Promise.all([
      getDeliveryFee(),
      getActiveProducts(),
    ]);
    return { deliveryFee, products };
  },
  head: () => ({
    meta: [
      { title: "Checkout — HOUSE OF FLAGS" },
      {
        name: "description",
        content:
          "Complete your HOUSE OF FLAGS order. Limited fabric flags shipped from Tunis. Limited restocks.",
      },
      { property: "og:title", content: "Checkout — HOUSE OF FLAGS" },
      {
        property: "og:description",
        content: "Claim your flag before it disappears.",
      },
    ],
  }),
  component: Checkout,
});

const PHRASES = [
  "Stay loud. Stay quiet. Stay yours.",
  "No restocks. No regrets.",
  "We move slow. We move sure.",
  "The thing carries weight.",
  "No restocks. No regrets.",
];

function Checkout() {
  const navigate = useNavigate();
  const { deliveryFee, products } = Route.useLoaderData();
  const { items, subtotal, clear, setWithSupport, setSupportQty, lineUnitPrice, syncCatalog } = useCart();
  const t = useT();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderRef, setOrderRef] = useState("");
  const [phrase, setPhrase] = useState(PHRASES[0]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent: number;
  } | null>(null);
  const [promoMessage, setPromoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    syncCatalog(products);
  }, [products, syncCatalog]);

  const itemsSubtotal = subtotal();
  const discountAmount = appliedPromo
    ? calculateDiscountAmount(itemsSubtotal, appliedPromo.discountPercent)
    : 0;
  const discountedSubtotal = itemsSubtotal - discountAmount;
  const orderTotal = discountedSubtotal + deliveryFee;

  const applyPromoCode = async () => {
    const code = promoInput.trim();
    if (!code) {
      setPromoMessage({ type: "error", text: "Enter a promo code." });
      return;
    }

    setPromoLoading(true);
    setPromoMessage(null);

    try {
      const result = await validatePromoCode({ data: { code } });
      if (!result.ok) {
        setAppliedPromo(null);
        setPromoMessage({ type: "error", text: result.error });
        return;
      }

      setAppliedPromo({
        code: result.code,
        discountPercent: result.discountPercent,
      });
      setPromoInput(result.code);
      setPromoMessage({ type: "success", text: "Discount code activated" });
    } catch {
      setPromoMessage({ type: "error", text: "Could not validate promo code. Try again." });
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMessage(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Check for out-of-stock items or insufficient stock
    const outOfStockItems: typeof items = [];
    const insufficientStockItems: typeof items = [];

    items.forEach((item) => {
      const product = products.find((p) => p.slug === item.slug);
      if (!product) return;

      if (product.quantity === 0) {
        outOfStockItems.push(item);
      } else if (item.qty > product.quantity) {
        insufficientStockItems.push(item);
      }
    });

    // If any items have insufficient stock, redirect to preorder
    if (insufficientStockItems.length > 0) {
      const insufficientNames = insufficientStockItems
        .map((item) => {
          const product = products.find((p) => p.slug === item.slug);
          return product?.name || item.slug;
        })
        .join(", ");

      toast.error(t("checkout.exceedsAvailable"));
      
      // Redirect to preorder with first insufficient item
      if (insufficientStockItems[0]) {
        navigate({ to: "/pre-order", search: { slug: insufficientStockItems[0].slug } });
      }
      return;
    }

    if (outOfStockItems.length > 0) {
      const outOfStockNames = outOfStockItems
        .map((item) => {
          const product = products.find((p) => p.slug === item.slug);
          return product?.name || item.slug;
        })
        .join(", ");

      toast.error(
        `${outOfStockNames} ${outOfStockItems.length > 1 ? "are" : "is"} out of stock. Please use Pre-Order instead.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      const result = await placeOrder({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          notes: form.notes.trim(),
          items: items.map((i) => ({
            slug: i.slug,
            qty: i.qty,
            supportQty: i.withSupport ? i.supportQty : 0,
          })),
          promoCode: appliedPromo?.code ?? "",
        },
      });

      if (!result.ok) {
        toast.error(result.error || "Couldn't place your order. Try again in a sec.");
        setSubmitting(false);
        return;
      }

      setOrderRef(result.orderRef);
      setPhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
      setSubmitted(true);
      clear();
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Order submission failed:", err);
      toast.error("Couldn't place your order. Try again in a sec.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <article className="pt-32">
        <section className="mx-auto flex max-w-[760px] flex-col items-center px-6 py-24 text-center md:px-10">
          <p className="text-[10px] uppercase tracking-[0.5em] ember-text">
            {t("checkout.received")}
          </p>
          <h1 className="mt-8 font-display text-7xl leading-[0.9] md:text-9xl">
            {t("checkout.inA")}
            <br />
            {t("checkout.inB")}
          </h1>
          <p className="mt-10 max-w-md text-base leading-relaxed text-muted-foreground">
            {t("checkout.confirm")}
          </p>
          <p className="mt-8 font-display text-2xl text-foreground">"{phrase}"</p>

          <div className="mt-12 w-full max-w-sm border hairline">
            <div className="flex items-center justify-between px-5 py-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span>{t("checkout.ref")}</span>
              <span className="font-display text-base text-foreground">{orderRef}</span>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center gap-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              {t("checkout.yezzi")}
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/drops" })}
              className="border hairline px-10 py-4 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background"
            >
              {t("checkout.back")}
            </button>
          </div>
        </section>
      </article>
    );
  }

  if (items.length === 0) {
    return (
      <article className="pt-32">
        <section className="mx-auto flex max-w-[760px] flex-col items-center px-6 py-24 text-center md:px-10">
          <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
            {t("checkout.tag")}
          </p>
          <h1 className="mt-8 font-display text-6xl md:text-8xl">{t("checkout.emptyTitle")}</h1>
          <p className="mt-8 max-w-sm text-sm text-muted-foreground">
            {t("checkout.emptyText")}
          </p>
          <Link
            to="/drops"
            className="mt-10 border hairline px-8 py-4 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background"
          >
            {t("hero.cta")}
          </Link>
        </section>
      </article>
    );
  }

  return (
    <article className="pt-28">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-16 px-6 py-16 md:grid-cols-[1.2fr_1fr] md:px-10 md:py-24">
        <div>
          <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
            {t("checkout.tag")}
          </p>
          <h1 className="mt-6 font-display text-6xl leading-[0.9] md:text-7xl">
            {t("checkout.title")}
          </h1>
          <p className="mt-6 max-w-md text-sm text-muted-foreground">
            {t("checkout.intro")}
          </p>

          <form onSubmit={onSubmit} className="mt-12 space-y-8">
            <Field
              label={t("checkout.name")}
              required
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <Field
                label={t("checkout.email")}
                type="email"
                required
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                label={t("checkout.phone")}
                type="tel"
                required
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
            </div>
            <Field
              label={t("checkout.city")}
              placeholder="Tunis, TN"
              required
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
            />
            <Field
              label={t("checkout.address")}
              required
              value={form.address}
              onChange={(v) => setForm({ ...form, address: v })}
            />
            <Field
              label={t("checkout.notes")}
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full border hairline py-5 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending…" : `${t("checkout.place")} — ${formatTND(orderTotal)}`}
            </button>
            <p className="text-center text-[10px] uppercase tracking-[0.4em] ember-text">
              {t("checkout.soon")}
            </p>
          </form>
        </div>

        <aside className="md:sticky md:top-28 md:self-start">
          <div className="border hairline">
            <div className="border-b hairline px-6 py-5">
              <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                {t("checkout.bag")}
              </p>
            </div>
            <ul className="divide-y hairline">
              {items.map((it) => {
                const catalog = products.find((p) => p.slug === it.slug);
                const supportEnabled = catalog?.support.enabled ?? it.supportEnabled;
                const supportName = catalog?.support.name ?? it.supportName;
                const supportPrice = catalog?.support.price ?? it.supportPrice;
                const isOutOfStock = catalog && catalog.quantity === 0;

                return (
                  <li key={it.slug} className="space-y-4 px-6 py-5">
                    <div className="flex gap-4">
                      <div className="h-20 w-16 shrink-0 overflow-hidden bg-card">
                        <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex flex-1 items-center justify-between gap-3">
                        <div>
                          <p className="font-display text-lg">{it.name}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Qty {it.qty}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            With support: {it.withSupport ? it.supportQty : 0} · Without support: {it.qty - (it.withSupport ? it.supportQty : 0)}
                          </p>
                          {isOutOfStock && (
                            <p className="mt-2 text-[9px] uppercase tracking-[0.3em] text-destructive">
                              ⚠️ Out of stock — use Pre-Order
                            </p>
                          )}
                        </div>
                        <p className="text-xs">{formatTND(lineUnitPrice(it))}</p>
                      </div>
                    </div>

                    {supportEnabled && (
                      <fieldset className="space-y-2 border-t hairline pt-4">
                        <legend className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{t("support.question")}</legend>
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={it.withSupport}
                            onChange={(event) => setWithSupport(it.slug, event.target.checked)}
                            className="accent-foreground"
                          />
                          <span>{t("support.with")}{supportName ? ` — ${supportName}` : ""}{parsePrice(supportPrice) > 0 ? ` (+${formatTND(supportPrice)} / unit)` : ""}</span>
                        </label>
                        {it.withSupport && (
                          <label className="flex items-center justify-between gap-3 text-xs">
                            <span>{t("support.quantity")}</span>
                            <input
                              type="number"
                              min="0"
                              max={it.qty}
                              value={it.supportQty}
                              onChange={(event) => setSupportQty(it.slug, Number(event.target.value))}
                              className="w-20 border hairline bg-transparent px-2 py-1 text-center"
                            />
                          </label>
                        )}
                      </fieldset>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="space-y-4 border-t hairline px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                  Promo code
                </p>
                {appliedPromo ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-3 border hairline px-3 py-2">
                      <div>
                        <p className="font-mono text-sm">{appliedPromo.code}</p>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                          {appliedPromo.discountPercent}% off items
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removePromoCode}
                        className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Remove
                      </button>
                    </div>
                    {promoMessage?.type === "success" && (
                      <p className="text-xs text-emerald-600">{promoMessage.text}</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 border-b hairline bg-transparent py-2 text-sm uppercase outline-none transition-colors focus:border-foreground"
                    />
                    <button
                      type="button"
                      onClick={applyPromoCode}
                      disabled={promoLoading}
                      className="border hairline px-4 py-2 text-[10px] uppercase tracking-[0.3em] transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
                    >
                      {promoLoading ? "Checking…" : "Apply"}
                    </button>
                  </div>
                )}
                {promoMessage?.type === "error" && (
                  <p className="mt-2 text-xs text-destructive">{promoMessage.text}</p>
                )}
              </div>
            </div>
            <div className="space-y-3 border-t hairline px-6 py-5 text-xs">
              <Row label={t("checkout.subtotal")} value={formatTND(itemsSubtotal)} />
              {appliedPromo && discountAmount > 0 && (
                <>
                  <Row
                    label={`Discount (${appliedPromo.discountPercent}%)`}
                    value={`-${formatTND(discountAmount)}`}
                  />
                  <Row label="Discounted subtotal" value={formatTND(discountedSubtotal)} />
                </>
              )}
              <Row label={t("checkout.delivery")} value={formatTND(deliveryFee)} />
              <div className="mt-4 flex items-baseline justify-between border-t hairline pt-4">
                <p className="text-[10px] uppercase tracking-[0.4em]">{t("checkout.total")}</p>
                <p className="font-display text-3xl">{formatTND(orderTotal)}</p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            {t("checkout.shippedFrom")}
          </p>
        </aside>
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
        {label}
        {required && <span className="ember-text"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full border-b hairline bg-transparent py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span className="text-[10px] uppercase tracking-[0.4em]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
