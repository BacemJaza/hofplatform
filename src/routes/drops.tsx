import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import { ProductsLoading } from "@/components/products-loading";
import type { Product } from "@/lib/products";
import { getProducts } from "@/lib/products.server";

export const Route = createFileRoute("/drops")({
  loader: async () => {
    const products = await getProducts();
    return { products };
  },
  pendingComponent: ProductsLoading,
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

type DropGroup = {
  code: string;
  name: string;
  status: "Live" | "Coming" | "Archive";
  date: string;
  desc: string;
  designs: Product[];
};

function groupProductsIntoDrops(products: Product[]): DropGroup[] {
  const byLabel = new Map<string, Product[]>();

  for (const product of products) {
    const label = product.label.trim() || "Untitled";
    const existing = byLabel.get(label);
    if (existing) {
      existing.push(product);
    } else {
      byLabel.set(label, [product]);
    }
  }

  return Array.from(byLabel.entries()).map(([name, designs], index) => {
    const hasLive = designs.some((d) => d.is_active);
    return {
      code: String(index + 1).padStart(3, "0"),
      name,
      status: hasLive ? "Live" : "Coming",
      date: "",
      desc: "",
      designs,
    };
  });
}

function productMatchesQuery(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (product.name.toLowerCase().includes(q)) return true;
  return product.tags.some((tag) => tag.toLowerCase().includes(q));
}

function Drops() {
  const { products } = Route.useLoaderData();
  const [query, setQuery] = useState("");

  const filteredProducts = products.filter((product) =>
    productMatchesQuery(product, query),
  );
  const drops = groupProductsIntoDrops(filteredProducts);

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

        <div className="mt-10 max-w-md">
          <label htmlFor="drops-search" className="sr-only">
            Search products by name or tags
          </label>
          <input
            id="drops-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or tags"
            className="w-full border hairline bg-transparent px-4 py-3 text-sm tracking-wide text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 pb-24 md:px-10">
        <div className="border-t hairline">
          {drops.length === 0 ? (
            <p className="py-14 text-sm text-muted-foreground">
              {query.trim()
                ? "No designs match that search."
                : "No drops yet. Check back soon."}
            </p>
          ) : (
            drops.map((d) => (
              <div
                key={d.code + d.name}
                className="border-b hairline py-10"
              >
                <div className="flex justify-between items-center">
                  <div className="col-span-2 font-display text-2xl text-muted-foreground md:text-3xl w-fit">
                    /{d.code}
                  </div>
                  <div className="col-span-7 md:col-span-6">
                    <h2 className="flex font-display text-2xl md:text-3xl justify-center w-fit">{d.name}</h2>
                    <p className="mt-3 max-w-sm text-sm text-muted-foreground w-fit">{d.desc}</p>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-right text-[10px] uppercase tracking-[0.3em] w-fit">
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
                    {d.date ? (
                      <p className="mt-2 text-muted-foreground">{d.date}</p>
                    ) : null}
                  </div>
                </div>

                {d.designs.length > 0 && (
                  <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                    {d.designs.map((product, index) => (
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
            ))
          )}
        </div>
      </section>
    </div>
  );
}
