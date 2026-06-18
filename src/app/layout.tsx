import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CreatorBadge from "@/components/CreatorBadge";
import GalaxyBackground from "@/components/GalaxyBackground";
import MotionProvider from "@/components/MotionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://pakeconintel.com";
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
// dedicated field for this, so it's rendered directly as a script tag,
// which is the standard Next.js-recommended approach.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: "Real-time dashboard for Pakistan economic indicators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        {/* Runs synchronously before first paint — reads localStorage and sets
            data-theme on <html> so there is never a flash of wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('dashboard-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <GalaxyBackground />
          <MotionProvider>
            {children}
            <CreatorBadge />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
