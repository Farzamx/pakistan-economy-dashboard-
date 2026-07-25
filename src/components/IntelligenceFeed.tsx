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
/**
 * v4 Phase 2 — recomposed as ANALYST NOTES rather than a bullet list: each
 * entry leads with a fixed-width mono date/tag column (the desk-note
 * convention: when + what kind, then the note), with the release/signal
 * distinction carried by a typographic tag ("REL" / "SIG") instead of an
 * anonymous colored dot. The single entrance fade covers the whole list —
 * the old per-item stagger re-animated on every scroll into view, which the
 * v4 motion rules classify as decoration, not explanation.
 */
export default function IntelligenceFeed({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-label text-white/40 light:text-slate-400">Intelligence Feed</span>
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-neon-blue" />
      </div>
      <motion.ul
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mt-3 divide-y divide-white/[0.04] light:divide-slate-100"
      >
        {items.map((item, i) => (
          <li key={`${item.text}-${i}`} className="flex items-baseline gap-3 py-2">
            <span className="text-data w-[5.5rem] shrink-0 text-white/40 light:text-slate-400">
              {item.date ? formatFeedDate(item.date) : "—"}
              <span
                className={`ml-1.5 text-[9px] font-semibold tracking-wider ${
                  item.kind === "release" ? "text-neon-blue" : "text-white/35 light:text-slate-400"
                }`}
              >
                {item.kind === "release" ? "REL" : "SIG"}
              </span>
            </span>
            <span className="text-sm leading-relaxed text-white/75 light:text-slate-600">{item.text}</span>
          </li>
        ))}
      </motion.ul>
    </div>
  );
}
