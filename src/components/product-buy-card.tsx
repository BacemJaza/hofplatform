import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Product } from "@/lib/products";
import { pickHoverImage, productImages } from "@/lib/products";
import { formatTND, parsePrice } from "@/lib/price";
import { useCart } from "@/stores/cart-store";
import { useT } from "@/hooks/use-language";

/**
 * Landing-page product card with an inline quantity counter and a Buy button
 * that takes the user straight to /checkout. Replaces the click-through
 * `<ProductCard>` on the home grid. Keeps the existing cart store + checkout
 * flow intact — this just sets the cart to {qty} of this product and navigates.
 */
export function ProductBuyCard({ product }: { product: Product }) {
  const t = useT();
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const setOpen = useCart((s) => s.setOpen);

  const existing = items.find((i) => i.slug === product.slug);
  const [qty, setLocalQty] = useState<number>(existing?.qty ?? 1);

  const images = productImages(product);
  const [displaySrc, setDisplaySrc] = useState(images[0] ?? product.image);
  const hoverSrcRef = useRef<string | null>(null);

  const onEnter = () => {
    const hover = pickHoverImage(images);
    hoverSrcRef.current = hover;
    if (hover) setDisplaySrc(hover);
  };

  const onLeave = () => {
    hoverSrcRef.current = null;
    setDisplaySrc(images[0] ?? product.image);
  };

  const dec = () => setLocalQty((q) => Math.max(1, q - 1));
  const inc = () => setLocalQty((q) => Math.min(20, q + 1));

  const lineTotal = parsePrice(product.price) * qty;

  const onBuy = () => {
    // Replace any prior cart state for this slug with the chosen qty.
    if (existing) {
      remove(product.slug);
    }
    add(product); // adds 1 + opens drawer
    setOpen(false); // we don't want the drawer flashing open
    if (qty > 1) setQty(product.slug, qty);
    navigate({ to: "/checkout" });
  };

  return (
    <article className="mx-auto w-full max-w-[520px] animate-fade-up">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="group block"
        aria-label={`${product.name} — view details`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-card vignette sm:aspect-[4/5]">
          <img
            src={displaySrc}
            alt={`${product.name} fabric flag hanging on a wall`}
            width={1024}
            height={1280}
            loading="lazy"
            className="h-full w-full object-cover transition-[transform,opacity] duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 from-background/40 via-transparent to-transparent opacity-60 transition-opacity duration-700 group-hover:opacity-30" />
          <div className="absolute left-4 top-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            /01
          </div>
          <div className="absolute right-4 top-4 text-[10px] uppercase tracking-[0.3em] ember-text">
            ● Limited
          </div>
        </div>
      </Link>

      <div className="mt-5 flex items-start justify-between gap-4 sm:mt-6">
        <div>
          <h3 className="font-display text-xl sm:text-2xl">{product.name}</h3>
          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:text-[11px]">
            {product.label}
          </p>
        </div>
        <p className="font-display text-lg text-foreground sm:text-xl">
          {formatTND(product.price)}
        </p>
      </div>

      {/* Qty + Buy */}
      <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-stretch sm:gap-4">
        <div
          className="flex items-center justify-between border hairline sm:justify-start"
          aria-label="Quantity selector"
        >
          <button
            type="button"
            onClick={dec}
            disabled={qty <= 1}
            className="px-4 py-3 text-sm transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-10 px-2 text-center font-display text-lg">
            {qty}
          </span>
          <button
            type="button"
            onClick={inc}
            disabled={qty >= 20}
            className="px-4 py-3 text-sm transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onBuy}
          className="flex-1 whitespace-nowrap border hairline px-4 py-4 text-[10px] uppercase tracking-[0.25em] transition-colors hover:bg-foreground hover:text-background sm:px-8 sm:text-xs sm:tracking-[0.4em]"
        >
          {t("buy.cta")} — {formatTND(lineTotal)}
        </button>
      </div>

      <p className="mt-4 text-[9px] uppercase tracking-[0.35em] ember-text sm:text-[10px] sm:tracking-[0.4em]">
        {t("cart.noRestock")}
      </p>
    </article>
  );
}
