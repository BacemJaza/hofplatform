import { Link } from "@tanstack/react-router";
import { useCart } from "@/stores/cart-store";
import { useEffect } from "react";

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove, total } = useCart();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm transition-opacity duration-500 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l hairline bg-background transition-transform duration-500 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b hairline px-6 py-5">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            Your bag — {items.length} {items.length === 1 ? "piece" : "pieces"}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Close ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-display text-5xl">EMPTY</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Nothing on the wall yet. Pick a flag — they don't come back.
            </p>
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="mt-6 border hairline px-6 py-3 text-xs uppercase tracking-[0.3em] transition-colors hover:bg-foreground hover:text-background"
            >
              Explore Drop 001
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <ul className="space-y-6">
                {items.map((it) => (
                  <li key={it.slug} className="flex gap-4">
                    <Link
                      to="/product/$slug"
                      params={{ slug: it.slug }}
                      onClick={() => setOpen(false)}
                      className="block h-28 w-24 shrink-0 overflow-hidden bg-card vignette"
                    >
                      <img
                        src={it.image}
                        alt={it.name}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <p className="font-display text-lg">{it.name}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                          {it.price}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border hairline">
                          <button
                            type="button"
                            onClick={() => setQty(it.slug, it.qty - 1)}
                            className="px-3 py-1 text-sm hover:bg-foreground hover:text-background"
                            aria-label="Decrease"
                          >
                            −
                          </button>
                          <span className="px-3 text-xs">{it.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(it.slug, it.qty + 1)}
                            className="px-3 py-1 text-sm hover:bg-foreground hover:text-background"
                            aria-label="Increase"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(it.slug)}
                          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:ember-text"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t hairline px-6 py-6">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                  Subtotal
                </p>
                <p className="font-display text-2xl">€{total().toFixed(0)}</p>
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Shipping from Tunis included
              </p>
              <Link
                to="/checkout"
                onClick={() => setOpen(false)}
                className="mt-6 block w-full border hairline py-4 text-center text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background"
              >
                Checkout →
              </Link>
              <p className="mt-4 text-center text-[10px] uppercase tracking-[0.4em] ember-text">
                ● No restocks. Move quick.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
