import React from "react";

export function TopBar() {
  return (
    <div
      className="mx-auto mb-1 mt-2 max-w-[1200px] px-3 py-1.5 sm:mb-4 sm:mt-4 sm:py-2 md:mb-5 md:mt-5"
      style={{ ["--topbar-height" as any]: "56px" }}
    >
        <div className="flex flex-col items-center gap-2 md:items-center md:gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-10">
                <a href="mailto:houseofflagstn@gmail.com" className="flex items-center gap-2 rounded-sm border px-2.5 py-2 text-[11px] transition hover:bg-foreground hover:text-background sm:px-3 sm:text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-3 w-3">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8h18V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10z" />
                    </svg>
                    <span className="hidden sm:inline">houseofflagstn@gmail.com</span>
                </a>

                <a href="tel:+21653069199" className="flex items-center gap-2 rounded-sm border px-2.5 py-2 text-[11px] transition hover:bg-foreground hover:text-background sm:px-3 sm:text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-3 w-3">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a2 2 0 011.94 1.5l.72 3.62a2 2 0 01-.45 1.7L8.3 12.7a16 16 0 006.99 6.99l1.88-1.88a2 2 0 011.7-.45l3.62.72A2 2 0 0121 19.72V23a2 2 0 01-2 2A19 19 0 013 5z" />
                    </svg>
                    <span className="hidden sm:inline">+216 53 069 199</span>
                </a>
                <a href="https://www.instagram.com/houseofflagstn" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-sm border px-2.5 py-2 text-[11px] transition hover:bg-foreground hover:text-background sm:px-3 sm:text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-3 w-3">
                        <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
                        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
                    </svg>
                <span className="hidden sm:inline">@HOUSEOFFLAGSTN</span>
                </a>
            </div>
        </div>
    </div>
  );
}

export default TopBar;
