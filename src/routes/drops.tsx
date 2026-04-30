import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/drops")({
  head: () => ({
    meta: [
      { title: "Drops — HOUSE OF FLAGS" },
      {
        name: "description",
        content:
          "Every HOUSE OF FLAGS drop is limited. Once a piece sells out, it never returns. View past and upcoming drops.",
      },
      { property: "og:title", content: "Drops — HOUSE OF FLAGS" },
      {
        property: "og:description",
        content: "Limited drops. No restocks. View the archive.",
      },
    ],
  }),
  component: Drops,
});

const drops = [
  {
    code: "001",
    name: "NO RULES",
    status: "Live",
    date: "April 2026",
    desc: "Seven pieces on heavyweight cotton. Statements you hang on your wall.",
    href: "/" as const,
  },
  {
    code: "002",
    name: "Untitled",
    status: "Coming",
    date: "Summer 2026",
    desc: "Sign up to the list. We don't tell anyone twice.",
    href: null,
  },
  {
    code: "003",
    name: "Untitled",
    status: "Locked",
    date: "—",
    desc: "Drops we haven't named yet. They name themselves when they're ready.",
    href: null,
  },
];

function Drops() {
  return (
    <div className="pt-32">
      <section className="mx-auto max-w-[1200px] px-6 py-16 md:px-10">
        <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
          The archive
        </p>
        <h1 className="mt-8 font-display text-6xl leading-[0.95] md:text-8xl">
          Drops
        </h1>
        <p className="mt-8 max-w-md text-sm leading-relaxed text-muted-foreground">
          Every drop is small. Every drop is final. This is everything we've made and
          everything we will.
        </p>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 pb-24 md:px-10">
        <div className="border-t hairline">
          {drops.map((d) => (
            <div
              key={d.code}
              className="group grid grid-cols-12 gap-4 border-b hairline py-10 transition-colors hover:bg-card md:py-14"
            >
              <div className="col-span-2 font-display text-2xl text-muted-foreground md:text-3xl">
                /{d.code}
              </div>
              <div className="col-span-7 md:col-span-6">
                <h2 className="font-display text-3xl md:text-5xl">{d.name}</h2>
                <p className="mt-3 max-w-sm text-sm text-muted-foreground">{d.desc}</p>
              </div>
              <div className="col-span-3 md:col-span-2 text-right text-[10px] uppercase tracking-[0.3em]">
                <p
                  className={
                    d.status === "Live"
                      ? "ember-text"
                      : d.status === "Coming"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  ● {d.status}
                </p>
                <p className="mt-2 text-muted-foreground">{d.date}</p>
              </div>
              <div className="col-span-12 md:col-span-2 md:text-right">
                {d.href ? (
                  <Link
                    to={d.href}
                    className="text-xs uppercase tracking-[0.3em] underline-offset-8 transition-colors hover:text-foreground hover:underline"
                  >
                    View →
                  </Link>
                ) : (
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/60">
                    Locked
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
