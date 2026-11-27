// GA4 custom events (SEO Stage 2 measurement plan, docs/seo-implementation.md). Every event and parameter is on an explicit allow-list, and parameters
// are short labels (a tool's slug, a chart's title, a control's option, a page path): NEVER a value a visitor typed, a profile field or an amount.
// Sending is a no-op when GA is not loaded (no measurement ID, blocked by the browser, or server rendering).

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

/** Keeps only allowed keys, as strings of at most 100 characters; drops anything that looks like a number a visitor could have typed. */
export function sanitize(name: EventName, params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of EVENT_PARAMS[name]) {
    const v = params[key];
    if (typeof v !== "string" || v === "") continue;
    out[key] = v.slice(0, 100);
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
