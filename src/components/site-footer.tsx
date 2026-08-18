import { Link } from "@tanstack/react-router";
import { useT } from "@/hooks/use-language";

const TIKTOK_URL = "https://www.tiktok.com/@houseofflagstn";
const INSTAGRAM_URL = "https://www.instagram.com/houseofflagstn";
const EMAIL = "houseofflagstn@gmail.com";
const PHONE_DISPLAY = "+216 53 069 199";
const PHONE_HREF = "+21653069199";

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="border-t hairline mt-32">
      <div className="mx-auto max-w-[1600px] px-6 py-16 md:px-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-3xl tracking-tight">HOUSE OF FLAGS</p>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {t("footer.tag")}
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <p className="text-foreground">{t("footer.follow")}</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href={TIKTOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  TikTok
                </a>
              </li>
            </ul>
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <p className="text-foreground">{t("footer.contact")}</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={`mailto:${EMAIL}`}
                  className="normal-case tracking-normal text-sm text-foreground transition-colors hover:text-[hsl(var(--ember,15_70%_55%))]"
                >
                  {EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${PHONE_HREF}`}
                  className="normal-case tracking-normal text-sm text-foreground transition-colors hover:text-[hsl(var(--ember,15_70%_55%))]"
                >
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li className="normal-case tracking-normal text-[11px] leading-relaxed text-muted-foreground">
                {t("footer.contactNote")}
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t hairline pt-8 text-[10px] uppercase tracking-[0.3em] text-muted-foreground md:flex-row md:items-center">
          <p>{t("footer.rights")}</p>
          <p>{t("footer.made")}</p>
        </div>
      </div>
    </footer>
  );
}
