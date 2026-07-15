import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Nastaliq_Urdu, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import CreatorBadge from "@/components/CreatorBadge";
import GalaxyBackground from "@/components/GalaxyBackground";
import MotionProvider from "@/components/MotionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { SidebarProvider } from "@/components/SidebarProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import MobileNav from "@/components/MobileNav";
import TopNav from "@/components/TopNav";
import MobileStickyCta from "@/components/MobileStickyCta";
import BfcacheGuard from "@/components/BfcacheGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Loaded at build time so the font is available immediately when Urdu is
// selected — no layout shift or flash of unstyled Urdu text.
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// PEIC v2.1: an editorial serif, paired with Geist Sans, is what actually
// separates "institutional research product" from "SaaS admin dashboard" —
// every generic dashboard template ships one grotesk for everything. Used
// sparingly: headline numbers and section titles only (see globals.css's
// .text-display/.text-headline), never body copy or dense data.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://www.pakeconintel.com";
const SITE_NAME = "Pakistan Economic Intelligence Center";
// Shorter description used for social sharing (OG/Twitter) — distinct from
// the longer search-engine meta description below.
const SOCIAL_DESCRIPTION = "Real-time dashboard tracking Pakistan's key economic indicators.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} | Live Pakistan Economy Dashboard`,
  description:
    "Real-time dashboard tracking Pakistan GDP, inflation, exchange rates, reserves, remittances, financial markets, monetary policy, and economic indicators in one place.",
  keywords: [
    "Pakistan economy",
    "Pakistan economic dashboard",
    "Pakistan inflation",
    "Pakistan GDP",
    "Pakistan exchange rate",
    "USD PKR",
    "SBP policy rate",
    "Pakistan reserves",
    "Pakistan remittances",
    "Pakistan financial markets",
    "economic indicators Pakistan",
  ],
  alternates: {
    canonical: SITE_URL,
    types: {
      "application/xml": `${SITE_URL}/sitemap.xml`,
    },
  },
  openGraph: {
    title: SITE_NAME,
    description: SOCIAL_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SOCIAL_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD structured data (Website schema) — the Metadata API has no
// dedicated field for this. Per Next.js's own guidance, next/script is for
// loading/executing JavaScript; JSON-LD is structured data, not executable
// code, so a native <script type="application/ld+json"> tag is the right
// choice (and is exempt from React's "script tag" dev warning, which only
// applies to tags that look like they're meant to execute).
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: "Real-time dashboard for Pakistan economic indicators",
};
// Escape "<" so the payload can't be used to break out of the script tag
// (e.g. a value containing "</script>") — recommended by the Next.js docs.
const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

// Unset in environments that haven't configured analytics (e.g. a fresh
// local checkout without NEXT_PUBLIC_GA_MEASUREMENT_ID) — guarded so
// <GoogleAnalytics> is simply omitted rather than loading gtag.js with an
// empty/invalid measurement ID.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoNastaliqUrdu.variable} ${sourceSerif.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        {/* Runs before hydration — reads localStorage and sets data-theme on
            <html> so there is never a flash of wrong theme. Uses next/script
            with strategy="beforeInteractive" (Next's injection mechanism,
            not plain React-rendered DOM) rather than a raw <script> tag, so
            it doesn't trigger React's "script tag" dev warning and is
            guaranteed to run before any hydration occurs. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('dashboard-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <BfcacheGuard />
        <ThemeProvider>
          <LanguageProvider>
          <AuthProvider>
            <PreferencesProvider>
              <SidebarProvider>
                <GalaxyBackground />
                <MotionProvider>
                  <MobileNav />
                  <TopNav />
                  {children}
                  <CreatorBadge />
                  <MobileStickyCta />
                </MotionProvider>
              </SidebarProvider>
            </PreferencesProvider>
          </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
      {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
    </html>
  );
}
