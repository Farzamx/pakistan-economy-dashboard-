"use client";

import { useId, useState } from "react";
import { IMPORTANCE_META, SURPRISE_META } from "@/lib/notifications/alertEmailTemplate";

interface PreviewExample {
  tabLabel: string;
  importance: "High" | "Medium" | "Low";
  eventName: string;
  source: string;
  dateLabel: string;
  previous: string;
  expected: string;
  actual: string;
  surprise: "positive" | "negative" | "in-line";
  surpriseLabel: string;
  interpretation: string;
  nextEvent: { name: string; dateLabel: string };
}

// Four realistic but entirely illustrative examples spanning the
// calendar's actual series — never fetched, never sent, purely a visual
// preview reusing the real email's importance/surprise color constants
// (alertEmailTemplate.ts) so this never drifts from what production
// alerts actually look like.
const EXAMPLES: PreviewExample[] = [
  {
    tabLabel: "CPI Inflation",
    importance: "High",
    eventName: "CPI Inflation Release (July 2026)",
    source: "Pakistan Bureau of Statistics",
    dateLabel: "1 Aug 2026 · 12:00 PM PKT",
    previous: "6.40%",
    expected: "6.50%",
    actual: "6.80%",
    surprise: "positive",
    surpriseLabel: "+0.30%",
    interpretation: "Higher-than-expected CPI — hawkish for interest rate expectations.",
    nextEvent: { name: "Core Inflation Release (July 2026)", dateLabel: "1 Aug 2026 · 12:00 PM PKT" },
  },
  {
    tabLabel: "Monetary Policy",
    importance: "High",
    eventName: "SBP Monetary Policy Committee Decision",
    source: "State Bank of Pakistan",
    dateLabel: "15 Aug 2026 · 3:00 PM PKT",
    previous: "11.00%",
    expected: "10.50%",
    actual: "10.00%",
    surprise: "negative",
    surpriseLabel: "-0.50%",
    interpretation: "Larger-than-expected rate cut — bearish for the Rupee, supportive for equities.",
    nextEvent: { name: "SBP Monetary Policy Report", dateLabel: "Sep 2026" },
  },
  {
    tabLabel: "Trade Balance",
    importance: "Medium",
    eventName: "Trade Balance (July 2026)",
    source: "Pakistan Bureau of Statistics",
    dateLabel: "10 Aug 2026 · 5:00 PM PKT",
    previous: "-$2.10B",
    expected: "-$2.30B",
    actual: "-$2.05B",
    surprise: "positive",
    surpriseLabel: "+$0.25B",
    interpretation: "Narrower-than-expected trade deficit — modestly positive for the Rupee.",
    nextEvent: { name: "Current Account Balance (July 2026)", dateLabel: "18 Aug 2026" },
  },
  {
    tabLabel: "FX Reserves",
    importance: "Medium",
    eventName: "SBP Foreign Exchange Reserves (Weekly)",
    source: "State Bank of Pakistan",
    dateLabel: "7 Aug 2026 · 5:00 PM PKT",
    previous: "$9.80B",
    expected: "$10.00B",
    actual: "$10.45B",
    surprise: "positive",
    surpriseLabel: "+$0.45B",
    interpretation: "Stronger reserve build than expected — supportive for currency stability.",
    nextEvent: { name: "SBP Foreign Exchange Reserves (Weekly)", dateLabel: "14 Aug 2026" },
  },
];

export default function LiveEmailPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabIdBase = useId();
  const example = EXAMPLES[activeIndex];
  const importance = IMPORTANCE_META[example.importance];
  const surprise = SURPRISE_META[example.surprise];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d18]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Example preview</span>
        <span className="text-[11px] text-slate-600">Not a real alert</span>
      </div>

      <div role="tablist" aria-label="Example alert type" className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 pt-2.5">
        {EXAMPLES.map((ex, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={ex.tabLabel}
              type="button"
              role="tab"
              id={`${tabIdBase}-tab-${i}`}
              aria-selected={active}
              aria-controls={`${tabIdBase}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveIndex(i)}
              className={`shrink-0 rounded-t-lg px-3 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                active ? "bg-sky-400/10 text-sky-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {ex.tabLabel}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${tabIdBase}-panel`} aria-labelledby={`${tabIdBase}-tab-${activeIndex}`} className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-sky-400">🇵🇰 Pakistan Economic Intelligence</p>
        <p className="mt-1 text-base font-bold text-white">Economic Release Alert</p>

        <span
          className="mt-4 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ backgroundColor: importance.bg, color: importance.text }}
        >
          {importance.emoji} {example.importance} Market Impact
        </span>
        <h3 className="mt-3 text-lg font-bold leading-tight text-white">{example.eventName}</h3>
        <p className="mt-0.5 text-xs text-slate-400">
          {example.source} · {example.dateLabel}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-0.5 overflow-hidden rounded-lg">
          <div className="bg-white/[0.03] px-2 py-3 text-center">
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Previous</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">{example.previous}</p>
          </div>
          <div className="bg-white/[0.03] px-2 py-3 text-center">
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Expected</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">{example.expected}</p>
          </div>
          <div className="bg-sky-400/10 px-2 py-3 text-center">
            <p className="text-[9px] uppercase tracking-wide text-sky-400">Actual</p>
            <p className="mt-1 text-sm font-bold text-sky-400">{example.actual}</p>
          </div>
        </div>

        <span
          className="mt-3 inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold"
          style={{ backgroundColor: surprise.bg, color: surprise.text }}
        >
          Surprise: {example.surpriseLabel} · {surprise.label}
        </span>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">{example.interpretation}</p>

        <div className="mt-4 rounded-lg bg-white/[0.03] py-3 text-center">
          <p className="text-base font-medium text-slate-400">{example.previous}</p>
          <p className="text-xs text-slate-600">&darr;</p>
          <p className="text-xl font-extrabold text-white">{example.actual}</p>
        </div>

        <div className="mt-5 flex justify-center">
          <span className="rounded-lg bg-sky-400 px-6 py-2.5 text-sm font-bold text-slate-950">View Full Analysis</span>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Next Scheduled Release</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{example.nextEvent.name}</p>
          <p className="text-xs text-slate-400">{example.nextEvent.dateLabel}</p>
        </div>
      </div>
    </div>
  );
}
