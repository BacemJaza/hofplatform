import { createFileRoute, Link } from "@tanstack/react-router";
import heroFlag from "@/assets/hero-flag.png";
import { ProductBuyCard } from "@/components/product-buy-card";
import { ProductCard } from "@/components/product-card";
import { ProductsLoading } from "@/components/products-loading";
import { useT } from "@/hooks/use-language";
import { TopBar } from "@/components/top-bar";
import { getProducts } from "@/lib/products.server";

export const Route = createFileRoute("/")({
  loader: async () => {
    const products = await getProducts();
    const activeProducts = products.filter((product) => product.is_active);
    const featured = activeProducts.length === 1 ? activeProducts[0] : null;

    return {
      products,
      featured,
      heroProduct: activeProducts[0] ?? products[0] ?? null,
    };
  },
  head: () => ({
    meta: [
      { title: "HOUSE OF FLAGS — Drop 001 / Fabric flags made in Tunis" },
      {
        name: "description",
        content:
          "HOUSE OF FLAGS Drop 001 — limited fabric wall flags made in Tunis. Real cotton. Made to say something. Once sold out, never returns.",
      },
      { property: "og:title", content: "HOUSE OF FLAGS — Drop 001" },
      {
        property: "og:description",
        content: "Limited fabric wall flags from Tunis. Something to actually hang.",
      },
      { property: "og:image", content: heroFlag },
      { property: "twitter:image", content: heroFlag },
    ],
  }),
  pendingComponent: ProductsLoading,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-24 text-center">
      <p className="font-display text-4xl">COULDN&apos;T LOAD DROP</p>
      <p className="max-w-md text-sm text-muted-foreground">
        We couldn&apos;t reach the catalog right now. Please refresh and try again.
      </p>
      {import.meta.env.DEV && error?.message && (
        <pre className="mt-2 max-h-40 max-w-lg overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
          {error.message}
        </pre>
      )}
      <Link
        to="/"
        className="mt-2 text-xs uppercase tracking-[0.3em] underline-offset-8 hover:underline"
      >
        Retry
      </Link>
    </div>
  ),
  component: Index,
});

type Slide = { src: string; alt: string; labelKey: "hero.slide1" | "hero.slide2" | "hero.slide3" | "hero.slide4" | "hero.slide5" };

function Index() {
  const t = useT();
  const { products, featured, heroProduct } = Route.useLoaderData();
  const gridProducts = featured
    ? products.filter((product) => product.slug !== featured.slug)
    : products;
  const marquee = [
    t("marquee.1"),
    "★",
    t("marquee.2"),
    "★",
    t("marquee.3"),
    "★",
    t("marquee.4"),
    "★",
    t("marquee.5"),
    "★",
  ];

  return (
    <>
      {/* MARQUEE */}
      <div className="relative overflow-hidden border-y hairline py-6 mx-auto mt-25">
        <div className="flex w-max animate-marquee gap-16 whitespace-nowrap font-display text-xl tracking-[0.05em] text-muted-foreground/60">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-16">
              {marquee.map((tx, j) => (
                <span key={j}>{tx}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <TopBar />

      {/* HERO */}
      <section className="relative flex min-h-[58svh] w-full overflow-hidden sm:min-h-[70vh] md:h-[80vh] md:min-h-[600px]">
        <div className="absolute inset-0 animate-slow-zoom">
          <img
            src={heroFlag}
            alt="Hanging fabric flag with the words NO RULES in a dark concrete room"
            width={1920}
            height={1080}
            className="h-full w-full object-[center_35%] sm:object-center"
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-background/55 via-background/25 to-background" />

        <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:gap-5 sm:px-6 sm:py-12 md:gap-8 md:py-16">
          <p
            className="animate-fade-in max-w-[22rem] text-[9px] uppercase tracking-[0.28em] text-white bg-black px-2 py-0.5 sm:max-w-none sm:text-[10px] sm:tracking-[0.5em]"
            style={{ animationDelay: "200ms" }}
          >
            {t("hero.tag")}
          </p>
          <h1
            className="animate-fade-up max-w-[95vw] px-1 font-display text-[clamp(2.6rem,13vw,10rem)] leading-[0.9] wrap-break-word md:text-[10rem] md:leading-[0.85]"
            style={{ animationDelay: "400ms" }}
          >
            {"HOUSE OF FLAGS"}
          </h1>
          <p
            className="animate-fade-up max-w-[18rem] text-[11px] uppercase tracking-[0.22em] text-white bg-black px-2 py-0.5 sm:max-w-md sm:text-sm sm:tracking-[0.35em]"
            style={{ animationDelay: "700ms" }}
          >
            {t("hero.sub")}
          </p>

          <div className="animate-fade-up pt-1 sm:pt-2 md:pt-4" style={{ animationDelay: "950ms" }}>
            <Link
              to="/drops"
              className="group inline-flex min-h-11 items-center gap-3 border hairline px-5 py-3 text-[11px] uppercase tracking-[0.28em] transition-all hover:bg-foreground hover:text-background sm:gap-4 sm:px-8 sm:py-4 sm:text-xs sm:tracking-[0.35em]"
            >
              <span>{t("hero.cta")}</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY BANNER */}
      <section className="border-b hairline">
        <div className="mx-auto max-w-[1200px] px-6 py-20 text-center md:px-10 md:py-28">
          <p className="text-[10px] uppercase tracking-[0.5em] ember-text">
            {t("banner.tag")}
          </p>
          <p className="mt-8 font-display text-3xl leading-[1.15] text-balance md:text-5xl">
            {t("banner.line1")}
            <br />
            <span className="text-foreground">{t("banner.line2")}</span>
            <br />
            <span className="ember-text">{t("banner.line3")}</span>
          </p>
        </div>
      </section>

      {/* DROP 001 — live catalog from Supabase */}
      <section id="drop-001" className="mx-auto max-w-[1600px] px-6 py-32 md:px-10">
        <div className="mb-20 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
              {t("drop.tag")}
            </p>
            <h2 className="mt-6 font-display text-6xl md:text-8xl">{t("drop.title")}</h2>
          </div>
          {products.length !== 0 ? (
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("drop.intro")}
          </p>
          ) :(
          <></>
          )}
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The drop is being prepared. Check back soon.
          </p>
        ) : (
          <div className="space-y-20">
            {featured && <ProductBuyCard product={featured} />}

            {gridProducts.length > 0 && (
              <div className="grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
                {gridProducts.map((product, index) => (
                  <ProductCard
                    key={product.slug}
                    product={product}
                    index={index}
                    comingSoon={!product.is_active}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* PHILOSOPHY */}
      <section className="relative mx-auto max-w-[900px] px-6 py-32 text-center md:px-10">
        <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
          {t("philosophy.tag")}
        </p>
        <p className="mt-12 font-display text-4xl leading-[1.15] text-balance md:text-6xl">
          {t("philosophy.h1a")}
          <br />
          <span className="ember-text">{t("philosophy.h1c")}</span>
          <br />
          {t("philosophy.h1d")}
        </p>
        <div className="mx-auto mt-16 h-px w-24 bg-foreground/20" />
        <p className="mt-12 mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          {t("philosophy.body")}
        </p>
      </section>

      {/* DROP SYSTEM */}
      <section className="border-y hairline">
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-6 py-32 md:grid-cols-2 md:px-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
              {t("system.tag")}
            </p>
            <h2 className="mt-6 font-display text-5xl leading-[0.95] md:text-7xl">
              {t("system.titleA")}
              <br />
              <span className="ember-text">{t("system.titleB")}</span>
            </h2>
          </div>
          <div className="flex flex-col justify-center gap-8 text-sm leading-relaxed text-muted-foreground">
            <p>{t("system.p1")}</p>
            <p>{t("system.p2")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
