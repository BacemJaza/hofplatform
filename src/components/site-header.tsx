import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useCart } from "@/stores/cart-store";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage, useT, type Lang } from "@/hooks/use-language";
import houseOfFlagsLogo from "@/assets/house-of-flags-logo.png";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const items = useCart((s) => s.items);
  const setOpen = useCart((s) => s.setOpen);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useLanguage();
  const t = useT();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const langs: Lang[] = ["en", "fr", "ar"];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b hairline"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 md:px-10">
        <Link to="/" aria-label="HOUSE OF FLAGS — home" className="flex items-center">
          <span className="inline-flex h-9 items-center overflow-hidden bg-black px-2 md:h-10 md:px-3">
            <img
              src={houseOfFlagsLogo}
              alt="HOUSE OF FLAGS"
              className="h-16 w-auto select-none md:h-20"
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </span>
        </Link>
        <nav className="hidden items-center gap-10 text-xs uppercase tracking-[0.25em] text-muted-foreground md:flex">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            {t("nav.drop")}
          </Link>
          <Link to="/drops" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            {t("nav.drops")}
          </Link>
          <Link to="/contact" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            {t("nav.contact")}
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-muted-foreground md:gap-5">
          {/* Language switcher */}
          <div className="flex items-center border hairline text-[10px]">
            {langs.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-label={`Switch language to ${l}`}
                aria-pressed={lang === l}
                className={`px-2 py-1.5 uppercase tracking-[0.25em] transition-colors ${
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
            <span className="hidden sm:inline">{t("nav.cart")}</span>
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center border hairline px-1.5 text-[10px] transition-colors ${
                count > 0 ? "ember-text border-current" : ""
              }`}
            >
              {count}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
