import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/philosophy")({
  head: () => ({
    meta: [
      { title: "Philosophy — KHALTA" },
      {
        name: "description",
        content:
          "KHALTA philosophy — fabric art as identity. Not posters. Not decoration. Statements you hang on your wall.",
      },
      { property: "og:title", content: "Philosophy — KHALTA" },
      {
        property: "og:description",
        content: "Fabric art as identity. Statements you hang on your wall.",
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
          Philosophy
        </p>
        <h1 className="mt-8 font-display text-6xl leading-[0.95] text-balance md:text-8xl">
          We don't make
          <br />
          <span className="ember-text">decoration.</span>
        </h1>
      </section>

      <section className="mx-auto max-w-[700px] px-6 pb-24 md:px-10">
        <div className="space-y-10 text-base leading-relaxed text-muted-foreground">
          <p>
            KHALTA started in a warehouse in Berlin with one idea: most things on most
            walls don't mean anything. They were chosen by an algorithm, framed by a
            stranger, and they say nothing about the person who lives there.
          </p>
          <p className="text-foreground text-lg leading-relaxed">
            We make fabric flags. Heavyweight cotton, raw edges, big quiet typography.
            One word. Sometimes two. Always something you'd think about before
            tattooing on yourself.
          </p>
          <p>
            Each piece is made for a specific kind of person — the ones who built their
            identity off the grid, who never asked anyone what's in season, who hang
            things on their wall not to fill space but to mark it.
          </p>
          <p>
            Drops are intentionally small. We don't restock. We don't re-release. If
            you have one, no one else can have the next one. That's the entire point.
          </p>
        </div>

        <div className="mt-16 border-t hairline pt-12">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            Built in
          </p>
          <p className="mt-4 font-display text-2xl">Berlin / Cotton / Cinematic</p>
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
