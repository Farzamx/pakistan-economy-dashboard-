// Marketing site fonts — kept in their own module, separate from the app's
// own fonts (see AppShell.tsx), so each side's next/font/google calls are
// scoped to the routes that actually render them. Imported directly by
// each marketing page.tsx (each already its own route-level chunk via
// Next's file-system routing, no dynamic-import trick needed here the way
// AppShell.tsx needed one for its providers/components) — this keeps
// Next's per-route font preload injection scoped to marketing routes only,
// so app routes never preload fonts they don't use, and vice versa.
import { Archivo, Public_Sans, IBM_Plex_Mono } from "next/font/google";

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
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

export const marketingFontVariables = `${archivoDisplay.variable} ${archivoHeading.variable} ${publicSans.variable} ${ibmPlexMono.variable}`;
