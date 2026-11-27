"use client";

// One delegated listener for the GA4 custom events (src/lib/analytics/events.ts), so server-rendered pages only carry data attributes:
//   dataset_download     a click on a link to /api/datasets/<id> or /research-datasets/...    params: dataset (the id or file name), page_path
//   internal_nav         a click on a link marked data-track="related-link"                     params: block, from_path, to_path
//   chart_interaction    a change of a radio/checkbox or a toggle-button press inside a chart (an element with data-chart)
//                                                                                              params: chart (its title), control (the input's name), option (the fixed option value), page_path
//   calculator_use       the first input change on a Decision Support Lab tool page, once per page view   params: calculator (the tool's slug)
//   calculator_complete  a click on an element marked data-track="calculator-complete" (report download, save to snapshot)
//                                                                                              params: calculator, action
// What is NEVER sent: anything typed into a field, profile values, amounts or results. Only fixed labels and paths.

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/events";

const LAB = /^\/decision-support-lab\/([a-z0-9-]+)/;

export default function AnalyticsListener() {
  const pathname = usePathname();
  const usedOn = useRef<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el) return;
      const a = el.closest("a[href]") as HTMLAnchorElement | null;
      if (a) {
        const url = new URL(a.href, window.location.origin);
        if (url.origin === window.location.origin) {
          const ds = /^\/api\/datasets\/([^/?#]+)/.exec(url.pathname) ?? /^\/research-datasets\/(.+)$/.exec(url.pathname);
          if (ds) track("dataset_download", { dataset: decodeURIComponent(ds[1]), page_path: window.location.pathname });
          else if (a.dataset.track === "related-link") track("internal_nav", { block: "related", from_path: window.location.pathname, to_path: url.pathname });
        }
      }
      const done = el.closest('[data-track="calculator-complete"]') as HTMLElement | null;
      const lab = LAB.exec(window.location.pathname);
      if (done && lab) track("calculator_complete", { calculator: lab[1], action: done.dataset.trackAction ?? "complete" });
      const toggle = el.closest("button[aria-pressed]") as HTMLButtonElement | null;
      const chart = toggle?.closest("[data-chart]") as HTMLElement | null;
      if (toggle && chart) track("chart_interaction", { chart: chart.dataset.chart, control: "series", option: toggle.textContent?.trim() ?? "", page_path: window.location.pathname });
    };
    const onChange = (e: Event) => {
      const input = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement ? e.target : null;
      if (!input) return;
      const chart = input.closest("[data-chart]") as HTMLElement | null;
      if (chart && (input instanceof HTMLSelectElement || input.type === "radio" || input.type === "checkbox")) {
        // Radio, checkbox and select options in charts are fixed choices (a range, a tenor, a basis), never typed values.
        track("chart_interaction", { chart: chart.dataset.chart, control: input.name || input.id, option: input instanceof HTMLInputElement && input.type === "checkbox" ? String(input.checked) : input.value, page_path: window.location.pathname });
        return;
      }
      const lab = LAB.exec(window.location.pathname);
      if (lab && usedOn.current !== window.location.pathname) {
        usedOn.current = window.location.pathname;
        track("calculator_use", { calculator: lab[1] });
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("change", onChange, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("change", onChange, { capture: true });
    };
  }, []);

  // A new page view resets the "first use" marker.
  useEffect(() => {
    usedOn.current = null;
  }, [pathname]);

  return null;
}
