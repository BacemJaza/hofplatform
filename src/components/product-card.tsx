import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";

export function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block animate-fade-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-card vignette">
        <img
          src={product.image}
          alt={`${product.name} fabric flag hanging on a wall`}
          width={1024}
          height={1280}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent opacity-60 transition-opacity duration-700 group-hover:opacity-30" />
        <div className="absolute left-4 top-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          /0{product.slug.length % 7}
        </div>
        <div className="absolute right-4 top-4 text-[10px] uppercase tracking-[0.3em] ember-text">
          ● Limited
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl">{product.name}</h3>
          <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            {product.label}
          </p>
        </div>
        <p className="font-display text-lg text-muted-foreground transition-colors group-hover:text-foreground">
          {product.price}
        </p>
      </div>
    </Link>
  );
}
