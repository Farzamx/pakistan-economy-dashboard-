"use client";

// Google Analytics 4 without query strings or fragments (replaces @next/third-parties' <GoogleAnalytics>, whose plain gtag('config', id) sent an automatic
// page view with the full URL, so an unsubscribe token in /subscriptions/manage?token=... reached GA).
//
//   1. An inline bootstrap (gaBootstrapScript) sets page_location and page_referrer to origin + pathname, configures GA with send_page_view: false and
//      sends the first page view with those sanitised fields.
//   2. gtag.js loads after the page is interactive and processes the queued commands in order.
//   3. On every later client-side route change this component updates page_location / page_referrer (again origin + pathname) and sends one page_view.
// Every other event (including the custom ones in src/lib/analytics/events.ts) inherits the sanitised page_location set here.

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { analyticsUrl, gaBootstrapScript } from "@/lib/analytics/pageLocation";

type Gtag = (...args: unknown[]) => void;

export default function PrivacyGoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const location = analyticsUrl(window.location.href);
    // The first render's page view is sent by the bootstrap script; this only records where the visit started.
    if (previous.current === null) {
      previous.current = location;
      return;
    }
    if (location === previous.current) return;
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (typeof gtag === "function") {
      gtag("set", { page_location: location, page_referrer: previous.current });
      gtag("event", "page_view", { page_location: location, page_referrer: previous.current, page_title: document.title });
    }
    previous.current = location;
  }, [pathname]);

  return (
    <>
      <Script id="peic-ga-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: gaBootstrapScript(measurementId) }} />
      <Script id="peic-ga" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} />
    </>
  );
}
