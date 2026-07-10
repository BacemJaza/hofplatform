import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/products";
import { formatTND } from "@/lib/price";
import { useT } from "@/hooks/use-language";

export function ProductCard({
  product,
  index,
  comingSoon = false,
}: {
  product: Product;
  index: number;
  comingSoon?: boolean;
}) {
  const t = useT();

  const inner = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-card vignette">
        <img
          src={product.image}
          alt={`${product.name} fabric flag hanging on a wall`}
          width={1024}
          height={1280}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-[1400ms] ease-out ${
            comingSoon ? "scale-105 blur-xl grayscale" : "group-hover:scale-110"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent opacity-60 transition-opacity duration-700 group-hover:opacity-30" />

        {comingSoon && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
              /locked
            </p>
            <p className="mt-4 font-display text-3xl uppercase tracking-[0.15em] text-foreground">
              {t("drop.comingSoon")}
            </p>
            <span className="mt-4 inline-block border hairline px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              ● soon
            </span>
          </div>
        )}

        {!comingSoon && (
          <>
            <div className="absolute left-4 top-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              /0{product.slug.length % 7}
            </div>
            <div className="absolute right-4 top-4 text-[10px] uppercase tracking-[0.3em] ember-text">
              ● Limited
            </div>
          </>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className={`font-display text-xl ${comingSoon ? "text-muted-foreground" : ""}`}>
            {comingSoon ? "—" : product.name}
          </h3>
          <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            {comingSoon ? t("drop.comingSoon") : product.label}
          </p>
        </div>
        <p className={`font-display text-lg transition-colors ${
          comingSoon ? "text-muted-foreground/50" : "text-muted-foreground group-hover:text-foreground"
        }`}>
          {comingSoon ? "—" : formatTND(product.price)}
        </p>
      </div>
    </>
  );

  if (comingSoon) {
    return (
      <div
        aria-disabled="true"
        className="block cursor-not-allowed select-none opacity-90 animate-fade-up"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block animate-fade-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {inner}
    </Link>
  );
}
