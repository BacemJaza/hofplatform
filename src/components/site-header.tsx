import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useCart } from "@/stores/cart-store";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage, useT, type Lang } from "@/hooks/use-language";
import houseOfFlagsLogo from "@/assets/house-of-flags-logo.png";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const items = useCart((s) => s.items);
  const setOpen = useCart((s) => s.setOpen);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useLanguage();
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when menu open
  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  const langs: Lang[] = ["en", "fr"];

  return (
    <header
      style={{ top: "var(--topbar-height, 0px)" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || menuOpen
          ? "bg-background/90 backdrop-blur-md border-b hairline"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 md:px-10">
        <Link to="/" aria-label="HOUSE OF FLAGS — home" className="flex items-center">
          <span className="inline-flex h-9 items-center overflow-hidden bg-black px-2 md:h-10 md:px-3">
            <img
              src={houseOfFlagsLogo}
              alt="HOUSE OF FLAGS"
              className="h-14 w-auto select-none md:h-20"
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </span>
        </Link>
        <nav className="hidden items-center gap-10 text-xs uppercase tracking-[0.25em] text-muted-foreground md:flex">
          <Link to="/drops" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            {t("nav.drop")}
          </Link>
          <Link to="/drops" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            {t("nav.drops")}
          </Link>
          <Link to="/contact" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            {t("nav.contact")}
          </Link>
        </nav>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground sm:gap-3 md:gap-5">
          {/* Language switcher */}
          <div className="flex items-center border hairline text-[10px]">
            {langs.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-label={`Switch language to ${l}`}
                aria-pressed={lang === l}
                className={`px-1.5 py-1.5 sm:px-2 uppercase tracking-[0.2em] transition-colors ${
                  lang === l
                    ? "bg-foreground text-background"
                    : "hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="inline-flex h-8 w-8 items-center justify-center border hairline transition-colors hover:text-foreground hover:bg-foreground/5"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group flex items-center gap-2 transition-colors hover:text-foreground"
            aria-label={`Open cart, ${count} items`}
          >
            <span className="hidden md:inline">{t("nav.cart")}</span>
            <span
              className={`inline-flex h-7 min-w-7 sm:h-5 sm:min-w-5 items-center justify-center border hairline px-1.5 text-[10px] transition-colors ${
                count > 0 ? "ember-text border-current" : ""
              }`}
            >
              {count}
            </span>
          </button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="inline-flex h-8 w-8 items-center justify-center border hairline transition-colors hover:text-foreground hover:bg-foreground/5 md:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down nav */}
      <div
        className={`md:hidden overflow-hidden border-t hairline bg-background/95 backdrop-blur-md transition-[max-height,opacity] duration-300 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 border-transparent"
        }`}
      >
        <nav className="flex flex-col px-6 py-6 text-sm uppercase tracking-[0.3em]">
          <Link
            to="/drops"
            activeProps={{ className: "text-foreground" }}
            className="border-b hairline py-4 text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.drop")}
          </Link>
          <Link
            to="/drops"
            activeProps={{ className: "text-foreground" }}
            className="border-b hairline py-4 text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.drops")}
          </Link>
          <Link
            to="/contact"
            activeProps={{ className: "text-foreground" }}
            className="py-4 text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.contact")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
