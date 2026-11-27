// GA4 custom events (SEO Stage 2 measurement plan, docs/seo-implementation.md). Every event and parameter is on an explicit allow-list, and parameters
// are short labels (a tool's slug, a chart's title, a control's option, a page path without query or fragment): NEVER a value a visitor typed, a profile
// field or an amount. page_location on these events is the sanitised origin + pathname set by PrivacyGoogleAnalytics.
// Sending is a no-op when GA is not loaded (no measurement ID, blocked by the browser, or server rendering).

import { analyticsPath } from "./pageLocation";

export const EVENT_PARAMS = {
  csv_download: ["file", "page_path"],
  dataset_download: ["dataset", "page_path"],
  chart_interaction: ["chart", "control", "option", "page_path"],
  calculator_use: ["calculator"],
  calculator_complete: ["calculator", "action"],
  internal_nav: ["block", "from_path", "to_path"],
} as const;

export type EventName = keyof typeof EVENT_PARAMS;

type Gtag = (command: "event", name: string, params: Record<string, string>) => void;

/**
 * Keeps only the parameters on the event's allow-list (EVENT_PARAMS), as non-empty strings of at most 100 characters; every other key, and any non-string
 * value, is dropped. The protection is the allow-list itself: it contains only label-type keys (a tool slug, a chart title, a fixed option, a path), so a
 * typed amount or profile field has no key it could travel under. Path parameters (`*_path`) are additionally cut at the first "?" or "#", so a query
 * string or fragment can never be sent even if a caller passes a full URL.
 */
export function sanitize(name: EventName, params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of EVENT_PARAMS[name]) {
    const v = params[key];
    if (typeof v !== "string" || v === "") continue;
    const value = key.endsWith("_path") ? analyticsPath(v) : v;
    if (value === "") continue;
    out[key] = value.slice(0, 100);
  }
  return out;
}

export function track(name: EventName, params: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", name, sanitize(name, params));
  } catch {
    // analytics must never break the page
  }
}
