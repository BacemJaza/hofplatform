import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/stores/cart-store";
import { toast } from "sonner";
import { formatTND, parsePrice } from "@/lib/price";
import { useT } from "@/hooks/use-language";
import { ProductsLoading } from "@/components/products-loading";
import { getActiveProducts, getProductBySlug } from "@/lib/products.server";
import { productImages, canPreOrder } from "@/lib/products";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const [product, products] = await Promise.all([
      getProductBySlug({ data: params.slug }),
      getActiveProducts(),
    ]);

    if (!product || !product.is_active) throw notFound();

    return {
      product,
      others: products.filter((p) => p.slug !== product.slug).slice(0, 3),
    };
  },
  pendingComponent: ProductsLoading,
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return { meta: [{ title: "Not found — HOUSE OF FLAGS" }] };
    return {
      meta: [
        { title: `${p.name} — HOUSE OF FLAGS Drop 001` },
        { name: "description", content: p.story.slice(0, 155) },
        { property: "og:title", content: `${p.name} — HOUSE OF FLAGS` },
        { property: "og:description", content: p.story.slice(0, 155) },
        { property: "og:image", content: p.image },
        { property: "twitter:image", content: p.image },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-4xl">SOMETHING BROKE</p>
      <p className="text-sm text-muted-foreground">
        We couldn't load this piece. Please try again in a moment.
      </p>
      {import.meta.env.DEV && error?.message && (
        <pre className="mt-2 max-h-40 max-w-lg overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
          {error.message}
        </pre>
      )}
      <Link to="/drops" className="mt-2 text-xs uppercase tracking-[0.3em] underline-offset-8 hover:underline">
        Back to drop
      </Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-6xl">SOLD OUT</p>
      <p className="text-sm text-muted-foreground">This piece doesn't exist or never returned.</p>
      <Link to="/drops" className="text-xs uppercase tracking-[0.3em] underline-offset-8 hover:underline">
        Back to drop
      </Link>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product, others } = Route.useLoaderData();
  const images = productImages(product);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [withSupport, setWithSupport] = useState(false);
  const add = useCart((s) => s.add);
  const t = useT();

  const activeImage = images[activeIndex] ?? product.image;
  const supportExtra =
    product.support.enabled && withSupport ? parsePrice(product.support.price) : 0;
  const unitTotal = parsePrice(product.price) + supportExtra;
  const priceTND = formatTND(unitTotal);

  const onAdd = () => {
    add(product, { withSupport });
    toast(`${product.name} — added to your bag`, {
      description: "From the studio in Tunis to your wall.",
    });
  };

  return (
    <article className="pt-24">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-6 py-12 md:grid-cols-2 md:gap-16 md:px-10 md:py-20">
        {/* Gallery */}
        <div className="space-y-4">
          <div
            className="relative aspect-[4/5] overflow-hidden bg-card vignette cursor-zoom-in"
            onClick={() => setZoom((z) => !z)}
          >
            <img
              src={activeImage}
              alt={`${product.name} fabric wall flag`}
              width={1024}
              height={1280}
              className={`h-full w-full object-cover transition-transform duration-[1200ms] ease-out ${
                zoom ? "scale-150" : "scale-100"
              }`}
            />
            <div className="absolute bottom-4 right-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {zoom ? t("product.tapShrink") : t("product.tapZoom")}
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => {
                    setActiveIndex(i);
                    setZoom(false);
                  }}
                  className={`relative h-16 w-14 shrink-0 overflow-hidden border transition-opacity sm:h-20 sm:w-16 ${
                    i === activeIndex
                      ? "border-foreground opacity-100"
                      : "hairline opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === activeIndex}
                >
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {t("product.spec")}
          </p>
        </div>

        {/* Info */}
        <div className="md:sticky md:top-28 md:self-start">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            HOUSE OF FLAGS / Drop 001 / {product.label}
          </p>
          <h1 className="mt-6 font-display text-7xl md:text-8xl">{product.name}</h1>

          <div className="mt-8 flex items-baseline gap-4">
            <span className="font-display text-3xl">{formatTND(product.price)}</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {t("cart.shippingNote")}
            </span>
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            {product.tags.map((tag: string) => (
              <span
                key={tag}
                className="border hairline px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-10 max-w-md text-sm leading-relaxed text-muted-foreground">
            {product.story}
          </p>

          {product.support.enabled && (
            <fieldset className="mt-10 max-w-md space-y-3">
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

          {canPreOrder(product) ? (
            <Link
              to="/pre-order"
              search={{ slug: product.slug }}
              className="mt-12 inline-block border hairline py-5 px-8 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background"
            >
              Pre-Order — {formatTND(product.price)}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="mt-12 w-full border hairline py-5 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background md:w-auto md:px-16"
            >
              {t("cart.add")} — {priceTND}
            </button>
          )}

          <div className="mt-12 border-t hairline pt-8 text-xs leading-relaxed text-muted-foreground">
            <p className="uppercase tracking-[0.3em] text-foreground">{t("product.details")}</p>
            <ul className="mt-4 space-y-2">
              <li>— 100% cotton flag fabric, 220 gsm</li>
              <li>— Hand-trimmed, brass grommets, hanging cord included</li>
              <li>— Each flag numbered & signed</li>
              <li>— Ships in 5–7 days from Tunis</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Related — only when there are other active pieces */}
      {others.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-6 py-24 md:px-10">
          <div className="mb-12 flex items-end justify-between">
            <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
              {t("product.more")}
            </p>
            <Link to="/drops" className="text-[10px] uppercase tracking-[0.3em] hover:text-foreground">
              {t("product.viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {others.map((p) => (
              <Link
                key={p.slug}
                to="/product/$slug"
                params={{ slug: p.slug }}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-card vignette">
                  <img
                    src={p.image}
                    alt={p.name}
                    width={1024}
                    height={1280}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
                  />
                </div>
                <p className="mt-3 font-display text-lg">{p.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
