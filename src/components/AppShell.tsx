"use client";

// The app's full provider stack + chrome, pulled out of the root layout so
// it can be code-split behind a dynamic import (see ConditionalAppChrome.tsx)
// rather than shipped to every route unconditionally. Measured impact: the
// marketing landing page's mobile LCP under throttled load initially came in
// over budget because it was downloading and executing this entire stack
// (Auth/Language/Preferences/Sidebar/Theme providers, several hundred KB
// combined) despite using none of it — none of the marketing components call
// useAuth()/useLanguage()/usePreferences()/the sidebar hooks, and the
// marketing theme is hardcoded, not read from ThemeProvider. Moving this
// into its own dynamically-imported chunk means marketing routes never
// fetch it at all, while every existing app route gets the exact same tree
// as before, unchanged.
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Noto_Nastaliq_Urdu, Source_Serif_4 } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { SidebarProvider } from "@/components/SidebarProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import GalaxyBackground from "@/components/GalaxyBackground";
import MotionProvider from "@/components/MotionProvider";
import MobileNav from "@/components/MobileNav";
import TopNav from "@/components/TopNav";
import CreatorBadge from "@/components/CreatorBadge";
import MobileStickyCta from "@/components/MobileStickyCta";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import MobileWelcomeDialog from "@/components/MobileWelcomeDialog";
import ProfileCompletionDrawer from "@/components/decisionSupportLab/ProfileCompletionDrawer";
import RecentToolsTracker from "@/components/decisionSupportLab/RecentToolsTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// preload:false (changed from the previous unconditional eager preload,
// found during the marketing hero's performance audit): Noto Nastaliq
// Urdu's Arabic-script subset is a genuinely large file (~240KB for one
// weight), and it was being forced into every single app page's <head> as
// a preload regardless of whether that visitor ever selects Urdu — the
// large majority of English-language pageviews paid for it unconditionally.
// display:swap already covers the "no flash of unstyled text" case for the
// (much rarer) visitor who does switch to Urdu; they now pay one deferred,
// CSS-triggered fetch on first switch instead of everyone paying an eager
// fetch on every load.
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
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

const fontVariables = `${geistSans.variable} ${geistMono.variable} ${notoNastaliqUrdu.variable} ${sourceSerif.variable}`;

// Moved here from the root layout (also found during the marketing hero's
// performance audit): analytics must never load on the public marketing
// routes at all — GoogleAnalytics is now scoped to exactly the same
// app-only branch as everything else in this file, rather than living in
// the shared root layout where it rendered unconditionally for every route.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    // display:contents so this wrapper never participates in the body's
    // flex layout — it exists only to carry the font CSS variables down to
    // every app route, exactly as the old root-layout <html> className did.
    <div className={`${fontVariables} contents`}>
      {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
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
                  <ScrollToTopButton />
                  <MobileWelcomeDialog />
                  <ProfileCompletionDrawer />
                  <RecentToolsTracker />
                </MotionProvider>
              </SidebarProvider>
            </PreferencesProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </div>
  );
}
