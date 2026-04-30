import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/philosophy")({
  head: () => ({
    meta: [
      { title: "Philosophy — HOUSE OF FLAGS" },
      {
        name: "description",
        content:
          "HOUSE OF FLAGS — fabric art born in Tunis. Statements stitched in cotton, carried from the medina to your wall.",
      },
      { property: "og:title", content: "Philosophy — HOUSE OF FLAGS" },
      {
        property: "og:description",
        content: "From Tunis. Fabric, identity, and noise turned quiet.",
      },
    ],
  }),
  component: Philosophy,
});

function Philosophy() {
  return (
    <div className="pt-32">
      <section className="mx-auto max-w-[900px] px-6 py-24 text-center md:px-10">
        <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
          Philosophy / من تونس
        </p>
        <h1 className="mt-8 font-display text-6xl leading-[0.95] text-balance md:text-8xl">
          We don't make
          <br />
          <span className="ember-text">decoration.</span>
        </h1>
        <p className="mt-10 text-sm uppercase tracking-[0.35em] text-muted-foreground">
          HOUSE OF FLAGS — fabric statements
        </p>
      </section>

      <section className="mx-auto max-w-[700px] px-6 pb-24 md:px-10">
        <div className="space-y-10 text-base leading-relaxed text-muted-foreground">
          <p>
            HOUSE OF FLAGS started in a small studio in Tunis. The name says it
            plainly — a house, and the flags it raises. What happens when the medina
            meets the street, when the spice market meets the spray can, when an old
            word in Derja sits next to a quiet English statement. That tension is the
            whole brand.
          </p>
          <p className="text-foreground text-lg leading-relaxed">
            We make fabric flags. Heavyweight cotton, raw edges, big quiet typography. One word.
            Sometimes two. Always something you'd think about before tattooing on yourself.
          </p>
          <p>
            Tunisia is loud. Markets shouting, cafés arguing, the call to prayer cutting through
            traffic. HOUSE OF FLAGS is what you hang on your wall when you go home and want the noise
            to mean something. <span className="text-foreground">El 7eyt yetkellem.</span> The
            wall speaks.
          </p>
          <p>
            Each piece is made for a specific kind of person — the Tunisian who never asked
            anyone what's in season, the diaspora kid building identity from two cities at
            once, the outsider anywhere who hangs things on their wall not to fill space but
            to mark it.
          </p>
          <p>
            Drops are intentionally small. We don't restock. We don't re-release. If you have
            one, no one else can have the next one. <span className="text-foreground">Yezzi
            tkhammem</span> — stop overthinking. The flag finds the right wall.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 border-t hairline pt-12 md:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              Made in
            </p>
            <p className="mt-3 font-display text-2xl">Tunis</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              Material
            </p>
            <p className="mt-3 font-display text-2xl">Cotton, 220 gsm</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              Spirit
            </p>
            <p className="mt-3 font-display text-2xl">خلطة</p>
          </div>
        </div>

        <div className="mt-16">
          <Link
            to="/"
            className="inline-flex items-center gap-3 border hairline px-8 py-4 text-xs uppercase tracking-[0.35em] transition-colors hover:bg-foreground hover:text-background"
          >
            ← Back to Drop 001
          </Link>
        </div>
      </section>
    </div>
  );
}
