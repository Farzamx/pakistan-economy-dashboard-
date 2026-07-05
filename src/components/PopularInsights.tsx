"use client";

import ProtectedLink from "@/components/ProtectedLink";
import { useLanguage } from "@/components/LanguageProvider";

// Homepage discovery module (SEO Architecture Migration, Phase B) — the
// single highest-leverage internal-linking fix available: the homepage is
// the most-crawled, most-visited page on the site, and none of the 50 pages
// freed from the login wall in Phase A had a single link pointing to them
// from it. Uses ProtectedLink (not next/link's <Link>) since Punjab/Sindh
// Budget and Provincial Budget Rankings became premium tools again after
// the Premium Access Restoration fix — the other 7 destinations stay
// public, and ProtectedLink is a safe no-op wrapper for those.

interface InsightLink {
  label: string;
  href: string;
  category: "Comparison" | "Budget" | "Provincial";
}

const INSIGHTS: InsightLink[] = [
  { label: "Pakistan vs India GDP Growth", href: "/comparisons/pakistan-vs-india-gdp-growth", category: "Comparison" },
  { label: "Where Does Pakistan's Tax Money Go?", href: "/budget/where-does-tax-money-go", category: "Budget" },
  { label: "Defence Spending", href: "/budget/defence-spending", category: "Budget" },
  { label: "Education Budget", href: "/budget/education-budget", category: "Budget" },
  { label: "Health Budget", href: "/budget/health-budget", category: "Budget" },
  { label: "Punjab Budget", href: "/provincial-budget/punjab", category: "Provincial" },
  { label: "Sindh Budget", href: "/provincial-budget/sindh", category: "Provincial" },
  { label: "Debt Servicing vs Defence", href: "/budget/debt-servicing-vs-defence", category: "Budget" },
  { label: "Provincial Budget Rankings", href: "/provincial-budget/rankings", category: "Provincial" },
  { label: "Exports vs Imports", href: "/comparisons/exports-vs-imports", category: "Comparison" },
];

const CATEGORY_COLOR: Record<InsightLink["category"], string> = {
  Comparison: "#38bdf8",
  Budget: "#34d399",
  Provincial: "#a855f7",
};

export default function PopularInsights() {
  const { t } = useLanguage();
  const categoryLabel: Record<InsightLink["category"], string> = {
    Comparison: t("popularInsights.comparison"),
    Budget: t("popularInsights.budget"),
    Provincial: t("popularInsights.provincial"),
  };
  return (
    <section className="mt-8" aria-labelledby="popular-insights-heading">
      <h2
        id="popular-insights-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-white/40 light:text-slate-500"
      >
        {t("popularInsights.title")}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {INSIGHTS.map((item) => (
          <ProtectedLink
            key={item.href}
            href={item.href}
            data-cta="popular-insights"
            data-cta-source="popular-insights"
            className="glass-card group flex flex-col gap-2 rounded-xl p-4 transition-all hover:scale-[1.02]"
            style={{ borderColor: `${CATEGORY_COLOR[item.category]}33` }}
          >
            <span
              className="text-[9px] font-semibold uppercase tracking-widest"
              style={{ color: CATEGORY_COLOR[item.category] }}
            >
              {categoryLabel[item.category]}
            </span>
            <span className="text-sm font-medium leading-snug text-white light:text-slate-900">{item.label}</span>
            <span className="mt-auto text-xs text-neon-blue opacity-0 transition-opacity group-hover:opacity-100">
              {t("popularInsights.explore")}
            </span>
          </ProtectedLink>
        ))}
      </div>
    </section>
  );
}
