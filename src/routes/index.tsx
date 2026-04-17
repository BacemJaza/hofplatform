import { createFileRoute, Link } from "@tanstack/react-router";
import heroFlag from "@/assets/hero-flag.jpg";
import { products } from "@/data/products";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KHALTA — Drop 001 / Fabric art for identity" },
      {
        name: "description",
        content:
          "KHALTA Drop 001 — limited fabric wall flags. Statements, not decoration. Once sold out, never returns.",
      },
      { property: "og:title", content: "KHALTA — Drop 001" },
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
            KHALTA — Drop 001 / Live now
          </p>
          <h1
            className="mt-8 animate-fade-up font-display text-[18vw] leading-[0.85] md:text-[10rem]"
            style={{ animationDelay: "400ms" }}
          >
            NO RULES
          </h1>
          <p
            className="mt-8 max-w-md animate-fade-up text-sm uppercase tracking-[0.35em] text-muted-foreground"
            style={{ animationDelay: "700ms" }}
          >
            Fabric art for identity
          </p>

          <div className="mt-12 animate-fade-up" style={{ animationDelay: "950ms" }}>
            <a
              href="#drop-001"
              className="group inline-flex items-center gap-4 border hairline px-8 py-4 text-xs uppercase tracking-[0.35em] transition-all hover:bg-foreground hover:text-background"
            >
              <span>Explore Drop 001</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground animate-fade-in" style={{ animationDelay: "1400ms" }}>
          Scroll
        </div>
      </section>

      {/* MARQUEE */}
      <div className="relative overflow-hidden border-y hairline py-6">
        <div className="flex w-max animate-marquee gap-16 whitespace-nowrap font-display text-2xl tracking-[0.05em] text-muted-foreground/60">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-16">
              {["NO RESTOCKS", "★", "LIMITED EDITION", "★", "DROP 001 — LIVE", "★", "FABRIC NOT PAPER", "★", "STATEMENTS NOT DECORATION", "★"].map((t, j) => (
                <span key={j}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* DROP 001 */}
      <section id="drop-001" className="mx-auto max-w-[1600px] px-6 py-32 md:px-10">
        <div className="mb-20 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
              Collection / 001
            </p>
            <h2 className="mt-6 font-display text-6xl md:text-8xl">DROP 001</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Seven pieces. Each printed on heavyweight cotton flag fabric. Made in limited
            quantity. When the count hits zero, it stays zero.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="relative mx-auto max-w-[900px] px-6 py-40 text-center md:px-10">
        <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
          Philosophy
        </p>
        <p className="mt-12 font-display text-4xl leading-[1.15] text-balance md:text-6xl">
          Not posters.
          <br />
          Not decoration.
          <br />
          <span className="ember-text">Statements.</span>
          <br />
          Identity you hang on your wall.
        </p>
        <div className="mx-auto mt-16 h-px w-24 bg-foreground/20" />
        <p className="mt-12 mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          KHALTA — خلطة — was built in Tunis for the ones who never wanted matching frames.
          Each flag is a piece of fabric that means something — to you, to whoever walks
          into your room, to the version of you that hung it.
        </p>
        <div className="mt-12">
          <Link
            to="/philosophy"
            className="text-xs uppercase tracking-[0.35em] text-muted-foreground underline-offset-8 transition-colors hover:text-foreground hover:underline"
          >
            Read more
          </Link>
        </div>
      </section>

      {/* DROP SYSTEM */}
      <section className="border-y hairline">
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-6 py-32 md:grid-cols-2 md:px-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
              The drop system
            </p>
            <h2 className="mt-6 font-display text-5xl leading-[0.95] md:text-7xl">
              Once it's gone,
              <br />
              <span className="ember-text">it's gone.</span>
            </h2>
          </div>
          <div className="flex flex-col justify-center gap-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              Each piece is produced in limited quantity. We do not restock. We do not
              re-release. When a flag sells out, it disappears from this site and it
              stays disappeared.
            </p>
            <p>
              That's the deal. The piece on your wall is one of a few that exist in
              the world. That's what makes it yours.
            </p>
            <div className="grid grid-cols-3 gap-6 pt-6">
              <div>
                <p className="font-display text-3xl text-foreground">7</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em]">Pieces</p>
              </div>
              <div>
                <p className="font-display text-3xl text-foreground">265</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em]">Flags total</p>
              </div>
              <div>
                <p className="font-display text-3xl ember-text">0</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em]">Restocks</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
