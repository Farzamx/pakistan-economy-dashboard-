"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { TaggedNewsItem } from "@/lib/data/intelligence";
import { NEWS_CATEGORIES, type NewsCategory } from "@/lib/news/relevanceEngine";
import InfoTooltip from "@/components/InfoTooltip";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";

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

const FRESHNESS_STYLES: Record<string, string> = {
  Fresh: "text-emerald-400/70 light:text-emerald-700",
  Recent: "text-amber-400/70 light:text-amber-600",
  Aging: "text-white/30 light:text-slate-400",
};

function impactScoreClass(score: number): string {
  if (score > 0) return "bg-emerald-500/10 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 border-emerald-500/20 light:border-emerald-200";
  if (score < 0) return "bg-rose-500/10 light:bg-rose-50 text-rose-400 light:text-rose-700 border-rose-500/20 light:border-rose-200";
  return "bg-white/5 light:bg-slate-100 text-white/30 light:text-slate-500 border-white/10 light:border-slate-200";
}

function relevanceClass(score: number): string {
  if (score >= 8) return "bg-neon-blue/15 text-neon-blue border-neon-blue/25";
  if (score >= 5) return "bg-white/5 light:bg-slate-100 text-white/50 light:text-slate-600 border-white/10 light:border-slate-200";
  return "bg-white/[0.02] light:bg-slate-50 text-white/25 light:text-slate-400 border-white/5 light:border-slate-200";
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

type TabId = "All" | NewsCategory;
const TABS: TabId[] = ["All", ...NEWS_CATEGORIES];

// Per-tab display cap — keeps the grid readable; "All" already sorts by
// relevance then recency (news.ts), so its cap surfaces the strongest
// stories dashboard-wide, not just whatever fetched first.
const ITEMS_PER_TAB = 8;

export default function NewsIntelligenceSection({ items, modelDisplayName, newsRefreshedAt, sourceCount }: Props) {
  const prefersReducedMotion = useSafeReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("All");
  const { t } = useLanguage();

  const catMap: Record<string, string> = {
    "All": t("news.catAll"),
    "Pakistan Economy": t("news.catPakistanEconomy"),
    "IMF & Debt": t("news.catImfDebt"),
    "Central Banks": t("news.catCentralBanks"),
    "Energy": t("news.catEnergy"),
    "Geopolitics": t("news.catGeopolitics"),
    "Global Macro": t("news.catGlobalMacro"),
    "Markets": t("news.catMarkets"),
  };
  const freshnessMap: Record<string, string> = {
    Fresh: t("news.freshFresh"),
    Recent: t("news.freshRecent"),
    Aging: t("news.freshAging"),
  };
  const sentimentMap: Record<string, string> = {
    Bullish: t("news.sentBullish"),
    Bearish: t("news.sentBearish"),
    Neutral: t("news.sentNeutral"),
  };

  // Tabs with zero articles right now are hidden rather than shown empty —
  // which tabs are non-empty varies fetch to fetch with real news volume.
  const countByTab = useMemo(() => {
    const counts: Partial<Record<TabId, number>> = { All: items.length };
    for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, [items]);

  const visibleTabs = TABS.filter((tab) => (countByTab[tab] ?? 0) > 0);

  const filteredItems = useMemo(() => {
    const matching = activeTab === "All" ? items : items.filter((item) => item.category === activeTab);
    return matching.slice(0, ITEMS_PER_TAB);
  }, [items, activeTab]);

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
            {t("news.title")}
          </h2>
          <span className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-neon-blue/70">
            {modelDisplayName}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
          {t("news.description")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[10px] text-white/25 light:text-slate-400">
            <span className="text-white/35 light:text-slate-500">{t("news.refreshed")}</span>{" "}
            {newsRefreshedAt}
          </span>
          <span className="text-[10px] text-white/15 light:text-slate-300">·</span>
          <span className="text-[10px] text-white/25 light:text-slate-400">
            {sourceCount} {t("news.sources")}
          </span>
          <span className="text-[10px] text-white/15 light:text-slate-300">·</span>
          <span className="text-[10px] text-white/25 light:text-slate-400">{t("news.breakingRefresh")}</span>
        </div>
      </motion.div>

      {/* Category tabs */}
      {visibleTabs.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {visibleTabs.map((tab) => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                  active
                    ? "border-neon-blue/40 bg-neon-blue/15 text-neon-blue"
                    : "border-white/10 light:border-slate-200 text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900"
                }`}
              >
                {catMap[tab] ?? tab} <span className="opacity-60">({countByTab[tab]})</span>
              </button>
            );
          })}
        </div>
      )}

      {items.length === 0 && (
        <p className="mt-6 text-sm text-white/30 light:text-slate-400">
          {t("news.unavailable")}
        </p>
      )}

      <motion.div
        key={activeTab}
        className="mt-6 grid gap-3 sm:grid-cols-2"
        initial={prefersReducedMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={gridVariants}
      >
        {filteredItems.map((item) => {
          const { sentiment, riskLevel, impactScore, reason, marketImpact } = item.intelligence;
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
                  {catMap[item.category] ?? item.category}
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
                    {sentimentMap[sentiment] ?? sentiment}
                  </span>
                  <InfoTooltip termKey={sentiment} size="xs" />
                </span>

                <span className="inline-flex items-center gap-0.5">
                  <span className={`text-[10px] font-medium ${RISK_STYLES[riskLevel] ?? RISK_STYLES.Low}`}>
                    {riskLevel === "Low" ? t("news.riskLow") : riskLevel === "Moderate" ? t("news.riskMed") : t("news.riskHigh")}
                  </span>
                  <InfoTooltip termKey="Risk Level" size="xs" />
                </span>

                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${impactScoreClass(impactScore)}`}
                >
                  {formatImpactScore(impactScore)}
                </span>
              </div>

              {/* Row 4: quality score strip — relevance / source reliability / freshness */}
              <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 light:border-slate-100 pt-1.5">
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tabular-nums ${relevanceClass(item.relevanceScore)}`}
                  title="Pakistan relevance score (0-10)"
                >
                  {t("news.relevance")} {item.relevanceScore}
                </span>
                <span className="text-[9px] text-white/30 light:text-slate-400" title="Source reliability score (0-10)">
                  {t("news.sourceRating")} {item.sourceReliability}/10
                </span>
                <span className={`text-[9px] font-medium ${FRESHNESS_STYLES[item.freshness]}`}>
                  {freshnessMap[item.freshness] ?? item.freshness}
                </span>
              </div>

              {/* Row 5: market impact (deterministic) or AI reason (fallback) */}
              {marketImpact ? (
                <div className="text-[10px] leading-relaxed text-white/40 light:text-slate-500">
                  <span className="font-semibold text-white/55 light:text-slate-600">{marketImpact.label}:</span>{" "}
                  {marketImpact.bullets.join(" · ")}
                </div>
              ) : reason === "Economic impact analysis unavailable." ? (
                // Production Audit Part 3 fix: this exact string is the
                // NEUTRAL_TAG sentinel (intelligence.ts) — previously
                // rendered nothing at all, making an AI-tagging
                // failure/fallback look identical to a card that simply had
                // no deterministic market-impact rule. Now visibly flagged.
                <p className="text-[10px] leading-relaxed text-white/25 light:text-slate-400 italic">
                  {t("news.aiUnavailable")}
                </p>
              ) : (
                reason && (
                  <p className="text-[10px] leading-relaxed text-white/35 light:text-slate-500 italic">
                    {reason}
                  </p>
                )
              )}

              {/* Row 6: source */}
              <p className="text-[10px] text-white/25 light:text-slate-400">{item.source}</p>
            </motion.a>
          );
        })}
      </motion.div>
    </div>
  );
}
