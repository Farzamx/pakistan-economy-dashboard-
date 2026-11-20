// Marketing site fonts — kept in their own module, separate from the app's
// own fonts (see AppShell.tsx), so each side's next/font/google calls are
// scoped to the routes that actually render them. Imported directly by
// each marketing page.tsx (each already its own route-level chunk via
// Next's file-system routing, no dynamic-import trick needed here the way
// AppShell.tsx needed one for its providers/components) — this keeps
// Next's per-route font preload injection scoped to marketing routes only,
// so app routes never preload fonts they don't use, and vice versa.
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";

// Split into two Archivo weights rather than one weight array so only the
// 800 (the H1's own weight) gets preloaded, per the hero brief.
const archivoDisplay = Archivo({
  variable: "--font-archivo-display",
  subsets: ["latin"],
  weight: "800",
  display: "swap",
  preload: true,
});
const archivoHeading = Archivo({
  variable: "--font-archivo-heading",
  subsets: ["latin"],
  weight: "700",
  display: "swap",
  preload: false,
});
// Public Sans is self-hosted rather than loaded through next/font/google.
// Turbopack's Google-font pipeline intermittently failed the Vercel build on
// this one family ("Can't resolve '@vercel/turbopack-next/internal/font/google/font'
// … next/font/google queries have exactly one entry", 6 errors, one per
// Public Sans @font-face) while the same commit built fine on retry, so the
// build depended on what Google's CSS endpoint returned at that moment.
// The files are Google Fonts' own v21 build (Public Sans 2.001, complete
// Latin, Latin Extended and Vietnamese character set), converted
// losslessly to WOFF2, so the typeface renders exactly as before. Licence:
// SIL OFL 1.1, see ./fonts/public-sans/OFL.txt.
const publicSans = localFont({
  variable: "--font-public-sans",
  src: [
    { path: "./fonts/public-sans/PublicSans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/public-sans/PublicSans-500.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  preload: false,
  // Same metric-adjusted Arial fallback next/font/google generated, to keep
  // layout shift unchanged while the font loads.
  adjustFontFallback: "Arial",
});
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

export const marketingFontVariables = `${archivoDisplay.variable} ${archivoHeading.variable} ${publicSans.variable} ${ibmPlexMono.variable}`;
