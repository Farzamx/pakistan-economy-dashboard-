"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { TaggedNewsItem } from "@/lib/data/intelligence";
import InfoTooltip from "@/components/InfoTooltip";

const CATEGORY_LABELS: Record<string, string> = {
  pakistan: "Pakistan",
  global: "Global",
  markets: "Markets",
  energy: "Energy",
};

const SENTIMENT_STYLES: Record<string, string> = {
  bullish: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  bearish: "bg-rose-500/15 text-rose-400 border border-rose-500/20",
  neutral: "bg-white/5 text-white/40 border border-white/10",
};

const RISK_STYLES: Record<string, string> = {
  low: "text-emerald-400/70",
  medium: "text-amber-400/70",
  high: "text-rose-400/70",
};

function formatAge(publishedAt: string): string {
  const diffMs = Date.now() - new Date(publishedAt).getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60_000))}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

// Transitions are passed directly on motion elements (not inside Variants)
// to avoid framer-motion v12's strict Easing literal type check on objects.
const headingVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

interface Props {
  items: TaggedNewsItem[];
}

export default function NewsIntelligenceSection({ items }: Props) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div id="news-intelligence" className="scroll-mt-8">
      <motion.div
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={headingVariants}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h2 className="mt-12 text-xl font-semibold text-white sm:text-2xl">
          News &amp; Intelligence
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Latest headlines from Pakistan and global markets, enriched with AI
          sentiment and risk tagging.
        </p>
      </motion.div>

      {items.length === 0 && (
        <p className="mt-6 text-sm text-white/30">
          News feeds are temporarily unavailable. Check back shortly.
        </p>
      )}

      <motion.div
        className="mt-6 grid gap-3 sm:grid-cols-2"
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={gridVariants}
      >
        {items.map((item) => (
          <motion.a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
            variants={cardVariants}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/40">
                {CATEGORY_LABELS[item.category] ?? item.category}
              </span>
              <span className="text-[10px] text-white/30" suppressHydrationWarning>
                {formatAge(item.publishedAt)}
              </span>
            </div>

            <p className="text-sm font-medium leading-snug text-white/80 group-hover:text-white">
              {item.title}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    SENTIMENT_STYLES[item.intelligence.sentiment]
                  }`}
                >
                  {item.intelligence.sentiment}
                </span>
                <InfoTooltip
                  termKey={
                    item.intelligence.sentiment.charAt(0).toUpperCase() +
                    item.intelligence.sentiment.slice(1)
                  }
                  size="xs"
                />
              </span>
              <span className="inline-flex items-center gap-0.5">
                <span
                  className={`text-[10px] font-medium ${RISK_STYLES[item.intelligence.risk]}`}
                >
                  {item.intelligence.risk} risk
                </span>
                <InfoTooltip termKey="Risk Level" size="xs" />
              </span>
              {item.intelligence.relatedIndicators.map((ind) => (
                <span
                  key={ind}
                  className="rounded-md bg-neon-blue/10 px-1.5 py-0.5 text-[10px] text-neon-blue/70"
                >
                  {ind}
                </span>
              ))}
            </div>

            <p className="text-[10px] text-white/25">{item.source}</p>
          </motion.a>
        ))}
      </motion.div>
    </div>
  );
}
