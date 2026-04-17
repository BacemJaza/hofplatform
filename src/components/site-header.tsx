import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCart } from "@/stores/cart-store";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const items = useCart((s) => s.items);
  const setOpen = useCart((s) => s.setOpen);
  const count = items.reduce((n, i) => n + i.qty, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b hairline"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 md:px-10">
        <Link to="/" className="font-display text-lg tracking-[0.2em]">
          KHALTA
        </Link>
        <nav className="hidden items-center gap-10 text-xs uppercase tracking-[0.25em] text-muted-foreground md:flex">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            Drop 001
          </Link>
          <Link to="/philosophy" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            Philosophy
          </Link>
          <Link to="/drops" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            Drops
          </Link>
        </nav>
        <div className="flex items-center gap-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group flex items-center gap-2 transition-colors hover:text-foreground"
            aria-label={`Open cart, ${count} items`}
          >
            <span>Cart</span>
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center border hairline px-1.5 text-[10px] transition-colors ${
                count > 0 ? "ember-text border-current" : ""
              }`}
            >
              {count}
            </span>
          </button>
          <span className="ember-text">●</span>
        </div>
      </div>
    </header>
  );
}
