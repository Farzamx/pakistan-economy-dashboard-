"use client";

import { motion } from "framer-motion";

export interface IntelligenceFeedItem {
  /** The full sentence, already composed — this component never invents wording. */
  text: string;
  /** "YYYY-MM-DD" when the underlying event/observation has a real date; omitted for a plain KPI-trend blurb with no single associated release date. */
  date?: string;
  kind: "release" | "signal";
}

interface Props {
  items: IntelligenceFeedItem[];
}

function formatFeedDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
}

/**
 * A compact "what changed" feed — the research-terminal counterpart to the
 * Hero's single "Latest Release" tile. Every line here is a real, already-
 * computed fact (a calendar release or a KPI's own trend/change string),
 * assembled into a sentence by the caller (page.tsx) — this component only
 * renders, never characterizes data itself.
 */
export default function IntelligenceFeed({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="text-label text-white/40 light:text-slate-400">Intelligence Feed</span>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-blue opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neon-blue" />
        </span>
      </div>
      <ul className="mt-3 divide-y divide-white/[0.04] light:divide-slate-100">
        {items.map((item, i) => (
          <motion.li
            key={`${item.text}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(i * 0.05, 0.3) }}
            className="flex items-baseline gap-2.5 py-2"
          >
            <span
              className={`mt-0.5 h-1 w-1 shrink-0 rounded-full ${
                item.kind === "release" ? "bg-neon-blue" : "bg-white/30 light:bg-slate-400"
              }`}
              aria-hidden="true"
            />
            <span className="text-sm text-white/75 light:text-slate-600">{item.text}</span>
            {item.date && (
              <span className="text-caption ml-auto shrink-0 text-white/35 light:text-slate-400">
                {formatFeedDate(item.date)}
              </span>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
