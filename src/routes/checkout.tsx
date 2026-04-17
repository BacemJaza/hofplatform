import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/stores/cart-store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — KHALTA" },
      {
        name: "description",
        content:
          "Complete your KHALTA order. Limited fabric flags shipped from Tunis. No restocks.",
      },
      { property: "og:title", content: "Checkout — KHALTA" },
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
  "From the medina to your wall.",
  "We move slow. We move sure.",
  "El 7aja t9ouwa. The thing carries weight.",
  "No restocks. No regrets.",
];

function Checkout() {
  const navigate = useNavigate();
  const { items, total, clear } = useCart();
  const [submitted, setSubmitted] = useState(false);
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = `KH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    setOrderRef(ref);
    setPhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
    setSubmitted(true);
    clear();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <article className="pt-32">
        <section className="mx-auto flex max-w-[760px] flex-col items-center px-6 py-24 text-center md:px-10">
          <p className="text-[10px] uppercase tracking-[0.5em] ember-text">
            ● Order received
          </p>
          <h1 className="mt-8 font-display text-7xl leading-[0.9] md:text-9xl">
            YOU'RE
            <br />
            IN.
          </h1>
          <p className="mt-10 max-w-md text-base leading-relaxed text-muted-foreground">
            We got your order. One of us will contact you soon to confirm and arrange
            delivery — straight from our studio in Tunis.
          </p>
          <p className="mt-8 font-display text-2xl text-foreground">"{phrase}"</p>

          <div className="mt-12 w-full max-w-sm border hairline">
            <div className="flex items-center justify-between px-5 py-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span>Order ref</span>
              <span className="font-display text-base text-foreground">{orderRef}</span>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center gap-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              Yezzi tkhammem · Stop overthinking
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="border hairline px-10 py-4 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background"
            >
              Back to the drop
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
            Checkout
          </p>
          <h1 className="mt-8 font-display text-6xl md:text-8xl">EMPTY BAG</h1>
          <p className="mt-8 max-w-sm text-sm text-muted-foreground">
            Nothing to check out. Go pick a piece — they leave faster than you think.
          </p>
          <Link
            to="/"
            className="mt-10 border hairline px-8 py-4 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background"
          >
            Explore Drop 001
          </Link>
        </section>
      </article>
    );
  }

  return (
    <article className="pt-28">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-16 px-6 py-16 md:grid-cols-[1.2fr_1fr] md:px-10 md:py-24">
        {/* Form */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
            Checkout / Drop 001
          </p>
          <h1 className="mt-6 font-display text-6xl leading-[0.9] md:text-7xl">
            Claim it.
          </h1>
          <p className="mt-6 max-w-md text-sm text-muted-foreground">
            Drop your details. We'll reach out from the studio in Tunis to confirm
            payment and shipping. No bots. No spam. Just one of us.
          </p>

          <form onSubmit={onSubmit} className="mt-12 space-y-8">
            <Field
              label="Full name"
              required
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <Field
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                label="Phone"
                type="tel"
                required
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
            </div>
            <Field
              label="City / Country"
              placeholder="Tunis, TN"
              required
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
            />
            <Field
              label="Address"
              required
              value={form.address}
              onChange={(v) => setForm({ ...form, address: v })}
            />
            <Field
              label="Notes (optional)"
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
            />

            <button
              type="submit"
              className="mt-4 w-full border hairline py-5 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background"
            >
              Place order — €{total().toFixed(0)}
            </button>
            <p className="text-center text-[10px] uppercase tracking-[0.4em] ember-text">
              ● We'll contact you soon. 7keya bel 7keya.
            </p>
          </form>
        </div>

        {/* Summary */}
        <aside className="md:sticky md:top-28 md:self-start">
          <div className="border hairline">
            <div className="border-b hairline px-6 py-5">
              <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                Your bag
              </p>
            </div>
            <ul className="divide-y hairline">
              {items.map((it) => (
                <li key={it.slug} className="flex gap-4 px-6 py-5">
                  <div className="h-20 w-16 shrink-0 overflow-hidden bg-card vignette">
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <p className="font-display text-lg">{it.name}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        Qty {it.qty}
                      </p>
                    </div>
                    <p className="text-xs">{it.price}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t hairline px-6 py-5 text-xs">
              <Row label="Subtotal" value={`€${total().toFixed(0)}`} />
              <Row label="Shipping" value="Included" />
              <div className="mt-4 flex items-baseline justify-between border-t hairline pt-4">
                <p className="text-[10px] uppercase tracking-[0.4em]">Total</p>
                <p className="font-display text-3xl">€{total().toFixed(0)}</p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            Shipped from Tunis · Made in studio · No restocks
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
