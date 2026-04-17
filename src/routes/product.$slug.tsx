import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getProduct, products } from "@/data/products";
import { useCart } from "@/stores/cart-store";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return { meta: [{ title: "Not found — KHALTA" }] };
    return {
      meta: [
        { title: `${p.name} — KHALTA Drop 001` },
        { name: "description", content: p.story.slice(0, 155) },
        { property: "og:title", content: `${p.name} — KHALTA` },
        { property: "og:description", content: p.story.slice(0, 155) },
        { property: "og:image", content: p.image },
        { property: "twitter:image", content: p.image },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-6xl">SOLD OUT</p>
      <p className="text-sm text-muted-foreground">This piece doesn't exist or never returned.</p>
      <Link to="/" className="text-xs uppercase tracking-[0.3em] underline-offset-8 hover:underline">
        Back to drop
      </Link>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const [zoom, setZoom] = useState(false);
  const add = useCart((s) => s.add);
  const others = products.filter((p) => p.slug !== product.slug).slice(0, 3);

  const onAdd = () => {
    add(product);
    toast(`${product.name} — added to your bag`, {
      description: "From the studio in Tunis to your wall.",
    });
  };

  return (
    <article className="pt-24">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-6 py-12 md:grid-cols-2 md:gap-16 md:px-10 md:py-20">
        {/* Image */}
        <div className="space-y-6">
          <div
            className="relative aspect-[4/5] overflow-hidden bg-card vignette cursor-zoom-in"
            onClick={() => setZoom((z) => !z)}
          >
            <img
              src={product.image}
              alt={`${product.name} fabric wall flag`}
              width={1024}
              height={1280}
              className={`h-full w-full object-cover transition-transform duration-[1200ms] ease-out ${
                zoom ? "scale-150" : "scale-100"
              }`}
            />
            <div className="absolute bottom-4 right-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Tap to {zoom ? "shrink" : "zoom fabric"}
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Heavyweight cotton — 90 × 140 cm — printed in studio
          </p>
        </div>

        {/* Info */}
        <div className="md:sticky md:top-28 md:self-start">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            KHALTA / Drop 001 / {product.label}
          </p>
          <h1 className="mt-6 font-display text-7xl md:text-8xl">{product.name}</h1>

          <div className="mt-8 flex items-baseline gap-4">
            <span className="font-display text-3xl">{product.price}</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Shipping included
            </span>
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            {product.tags.map((t: string) => (
              <span
                key={t}
                className="border hairline px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>

          <p className="mt-10 max-w-md text-sm leading-relaxed text-muted-foreground">
            {product.story}
          </p>

          <button
            type="button"
            onClick={onAdd}
            className="mt-12 w-full border hairline py-5 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background md:w-auto md:px-16"
          >
            Add to cart — {product.price}
          </button>

          <p className="mt-6 text-[10px] uppercase tracking-[0.4em] ember-text">
            ● No restocks. Once it's gone, it's gone.
          </p>

          <div className="mt-12 border-t hairline pt-8 text-xs leading-relaxed text-muted-foreground">
            <p className="uppercase tracking-[0.3em] text-foreground">Details</p>
            <ul className="mt-4 space-y-2">
              <li>— 100% cotton flag fabric, 220 gsm</li>
              <li>— Hand-trimmed, brass grommets, hanging cord included</li>
              <li>— Each flag numbered & signed</li>
              <li>— Ships in 5–7 days from Berlin</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Related */}
      <section className="mx-auto max-w-[1600px] px-6 py-24 md:px-10">
        <div className="mb-12 flex items-end justify-between">
          <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
            More from Drop 001
          </p>
          <Link to="/" className="text-[10px] uppercase tracking-[0.3em] hover:text-foreground">
            View all →
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
    </article>
  );
}
