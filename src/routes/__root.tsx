import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartDrawer } from "@/components/cart-drawer";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Error / 404</p>
        <h1 className="mt-6 font-display text-7xl">LOST</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This page was never made. Or it sold out and never came back.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center border hairline px-6 py-3 text-xs uppercase tracking-[0.3em] text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            Return to drop
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KHALTA — Fabric art for identity" },
      {
        name: "description",
        content:
          "KHALTA — premium fabric wall flags. Limited drops. Statements you hang on your wall. No restocks.",
      },
      { name: "author", content: "KHALTA" },
      { property: "og:title", content: "KHALTA — Fabric art for identity" },
      {
        property: "og:description",
        content: "Limited fabric wall flags. Drop 001 out now. No restocks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "KHALTA — Fabric art for identity" },
      { name: "description", content: "KHALTA is a dark, cinematic e-commerce site selling collectible fabric art statements." },
      { property: "og:description", content: "KHALTA is a dark, cinematic e-commerce site selling collectible fabric art statements." },
      { name: "twitter:description", content: "KHALTA is a dark, cinematic e-commerce site selling collectible fabric art statements." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const themeInit = `(function(){try{var t=localStorage.getItem('khalta-theme');var d=t==='dark';var r=document.documentElement;if(d){r.classList.add('dark');}r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <SiteHeader />
      <main className="min-h-screen">
        <Outlet />
      </main>
      <SiteFooter />
      <CartDrawer />
      <Toaster position="bottom-right" />
    </>
  );
}
