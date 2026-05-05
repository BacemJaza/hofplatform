import { createFileRoute } from "@tanstack/react-router";
import heroFlag from "@/assets/hero-flag.jpg";
import { activeProducts } from "@/data/products";
import { ProductBuyCard } from "@/components/product-buy-card";
import { useT } from "@/hooks/use-language";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HOUSE OF FLAGS — Drop 001 / Fabric art for identity" },
      {
        name: "description",
        content:
          "HOUSE OF FLAGS Drop 001 — limited fabric wall flags from Tunis. Statements, not decoration. Once sold out, never returns.",
      },
      { property: "og:title", content: "HOUSE OF FLAGS — Drop 001" },
      {
        property: "og:description",
        content: "Limited fabric wall flags. Statements you hang on your wall.",
      },
      { property: "og:image", content: heroFlag },
      { property: "twitter:image", content: heroFlag },
    ],
  }),
  component: Index,
});

function Index() {
  const t = useT();
  const product = activeProducts[0];
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
      {/* HERO */}
      <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
        <div className="absolute inset-0 animate-slow-zoom">
          <img
            src={heroFlag}
            alt="Hanging fabric flag with the words NO RULES in a dark concrete room"
            width={1920}
            height={1080}
            className="h-full w-full object-cover animate-flag-sway"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="animate-fade-in text-[10px] uppercase tracking-[0.5em] text-muted-foreground" style={{ animationDelay: "200ms" }}>
            {t("hero.tag")}
          </p>
          <h1
            className="mt-8 animate-fade-up px-2 font-display text-[16vw] leading-[0.85] md:text-[10rem]"
            style={{ animationDelay: "400ms" }}
          >
            NO RULES
          </h1>
          <p
            className="mt-8 max-w-md animate-fade-up text-sm uppercase tracking-[0.35em] text-muted-foreground"
            style={{ animationDelay: "700ms" }}
          >
            {t("hero.sub")}
          </p>

          <div className="mt-12 animate-fade-up" style={{ animationDelay: "950ms" }}>
            <a
              href="#drop-001"
              className="group inline-flex items-center gap-4 border hairline px-8 py-4 text-xs uppercase tracking-[0.35em] transition-all hover:bg-foreground hover:text-background"
            >
              <span>{t("hero.cta")}</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground animate-fade-in" style={{ animationDelay: "1400ms" }}>
          {t("hero.scroll")}
        </div>
      </section>

      {/* MARQUEE */}
      <div className="relative overflow-hidden border-y hairline py-6">
        <div className="flex w-max animate-marquee gap-16 whitespace-nowrap font-display text-2xl tracking-[0.05em] text-muted-foreground/60">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-16">
              {marquee.map((tx, j) => (
                <span key={j}>{tx}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* PHILOSOPHY BANNER — punchy intro */}
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

      {/* DROP 001 — single piece with inline buy */}
      <section id="drop-001" className="mx-auto max-w-[1200px] px-6 py-32 md:px-10">
        <div className="mb-20 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
              {t("drop.tag")}
            </p>
            <h2 className="mt-6 font-display text-6xl md:text-8xl">{t("drop.title")}</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t("drop.intro")}
          </p>
        </div>

        {product && <ProductBuyCard product={product} />}
      </section>

      {/* PHILOSOPHY */}
      <section className="relative mx-auto max-w-[900px] px-6 py-32 text-center md:px-10">
        <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
          {t("philosophy.tag")}
        </p>
        <p className="mt-12 font-display text-4xl leading-[1.15] text-balance md:text-6xl">
          {t("philosophy.h1a")}
          <br />
          {t("philosophy.h1b")}
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
            <div className="grid grid-cols-3 gap-6 pt-6">
              <div>
                <p className="font-display text-3xl text-foreground">1</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em]">{t("system.pieces")}</p>
              </div>
              <div>
                <p className="font-display text-3xl text-foreground">50</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em]">{t("system.flags")}</p>
              </div>
              <div>
                <p className="font-display text-3xl ember-text">0</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em]">{t("system.restocks")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
