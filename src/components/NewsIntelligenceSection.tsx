"use client";

import { motion } from "framer-motion";
import type { TaggedNewsItem } from "@/lib/data/intelligence";
import InfoTooltip from "@/components/InfoTooltip";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";

const CATEGORY_LABELS: Record<string, string> = {
  pakistan: "Pakistan",
  global: "Global",
  markets: "Markets",
  energy: "Energy",
};

const SENTIMENT_STYLES: Record<string, string> = {
  Bullish: "bg-emerald-500/15 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 border border-emerald-500/20 light:border-emerald-200",
  Bearish: "bg-rose-500/15 light:bg-rose-50 text-rose-400 light:text-rose-700 border border-rose-500/20 light:border-rose-200",
  Neutral: "bg-white/5 light:bg-slate-100 text-white/40 light:text-slate-500 border border-white/10 light:border-slate-200",
};

const RISK_STYLES: Record<string, string> = {
  Low: "text-emerald-400/70 light:text-emerald-700",
  Moderate: "text-amber-400/70 light:text-amber-600",
  High: "text-rose-400/70 light:text-rose-700",
};

function impactScoreClass(score: number): string {
  if (score > 0) return "bg-emerald-500/10 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 border-emerald-500/20 light:border-emerald-200";
  if (score < 0) return "bg-rose-500/10 light:bg-rose-50 text-rose-400 light:text-rose-700 border-rose-500/20 light:border-rose-200";
  return "bg-white/5 light:bg-slate-100 text-white/30 light:text-slate-500 border-white/10 light:border-slate-200";
}

function formatImpactScore(score: number): string {
  if (score > 0) return `+${score}`;
  return String(score);
}

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
  modelDisplayName: string;
  newsRefreshedAt: string; // PKT timestamp of the current page render
  sourceCount: number;     // distinct news source count
}

export default function NewsIntelligenceSection({ items, modelDisplayName, newsRefreshedAt, sourceCount }: Props) {
  const prefersReducedMotion = useSafeReducedMotion();

  return (
    <div id="news-intelligence" className="glass-panel-deep mt-12 scroll-mt-8 p-6 sm:p-8">
      <motion.div
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={headingVariants}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-white light:text-slate-900 sm:text-2xl">
            News &amp; Intelligence
          </h2>
          <span className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-neon-blue/70">
            {modelDisplayName}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
          Latest headlines from Pakistan and global markets, enriched with AI
          sentiment, risk, and economic impact analysis.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[10px] text-white/25 light:text-slate-400">
            <span className="text-white/35 light:text-slate-500">Refreshed</span>{" "}
            {newsRefreshedAt}
          </span>
          <span className="text-[10px] text-white/15 light:text-slate-300">·</span>
          <span className="text-[10px] text-white/25 light:text-slate-400">
            {sourceCount} source{sourceCount !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] text-white/15 light:text-slate-300">·</span>
          <span className="text-[10px] text-white/25 light:text-slate-400">Updates every 2h</span>
        </div>
      </motion.div>

      {items.length === 0 && (
        <p className="mt-6 text-sm text-white/30 light:text-slate-400">
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
        {items.map((item) => {
          const { sentiment, riskLevel, impactScore, reason } = item.intelligence;
          return (
            <motion.a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-4 transition-colors hover:border-white/10 light:hover:border-slate-300 hover:bg-white/[0.04] light:hover:bg-slate-50"
              variants={cardVariants}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Row 1: category tag + timestamp */}
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-white/5 light:bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-white/40 light:text-slate-500">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <span className="text-[10px] text-white/30 light:text-slate-400" suppressHydrationWarning>
                  {formatAge(item.publishedAt)}
                </span>
              </div>

              {/* Row 2: headline */}
              <p className="text-sm font-medium leading-snug text-white/80 light:text-slate-800 group-hover:text-white light:group-hover:text-slate-900">
                {item.title}
              </p>

              {/* Row 3: AI badges — sentiment, risk, impact score */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.Neutral
                    }`}
                  >
                    {sentiment}
                  </span>
                  <InfoTooltip termKey={sentiment} size="xs" />
                </span>

                <span className="inline-flex items-center gap-0.5">
                  <span className={`text-[10px] font-medium ${RISK_STYLES[riskLevel] ?? RISK_STYLES.Low}`}>
                    {riskLevel} risk
                  </span>
                  <InfoTooltip termKey="Risk Level" size="xs" />
                </span>

                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${impactScoreClass(impactScore)}`}
                >
                  {formatImpactScore(impactScore)}
                </span>
              </div>

              {/* Row 4: AI reason */}
              {reason && reason !== "Economic impact analysis unavailable." && (
                <p className="text-[10px] leading-relaxed text-white/35 light:text-slate-500 italic">
                  {reason}
                </p>
              )}

              {/* Row 5: source */}
              <p className="text-[10px] text-white/25 light:text-slate-400">{item.source}</p>
            </motion.a>
          );
        })}
      </motion.div>
    </div>
  );
}
