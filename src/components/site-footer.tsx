export function SiteFooter() {
  return (
    <footer className="border-t hairline mt-32">
      <div className="mx-auto max-w-[1600px] px-6 py-16 md:px-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-3xl tracking-tight">KHALTA</p>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              خلطة — Fabric art from Tunis. Limited drops. No restocks.
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <p className="text-foreground">Index</p>
            <ul className="mt-4 space-y-3">
              <li>Drop 001</li>
              <li>Philosophy</li>
              <li>Drops</li>
              <li>Shipping</li>
            </ul>
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <p className="text-foreground">Follow</p>
            <ul className="mt-4 space-y-3">
              <li className="transition-colors hover:text-foreground">Instagram</li>
              <li className="transition-colors hover:text-foreground">TikTok</li>
              <li className="transition-colors hover:text-foreground">Newsletter</li>
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t hairline pt-8 text-[10px] uppercase tracking-[0.3em] text-muted-foreground md:flex-row md:items-center">
          <p>© KHALTA — Tunis. All flags reserved.</p>
          <p>Made for the ones who hang their identity. خلطة.</p>
        </div>
      </div>
    </footer>
  );
}
