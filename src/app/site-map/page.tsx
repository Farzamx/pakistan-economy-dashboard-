import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL, SEO_PAGES } from "@/lib/seoConfig";
import { COMPARISONS, SECTOR_COMPOSITION } from "@/lib/comparisons/comparisonRegistry";
import { BUDGET_CATEGORIES, BUDGET_EXTRA_SEO_SLUGS } from "@/lib/budget/budgetRegistry";
import { PROVINCIAL_SEO_SLUGS } from "@/lib/provincial/provincialBudgetRegistry";
import { T } from "@/components/T";

export const metadata: Metadata = {
  title: `Site Map | ${SITE_NAME}`,
  description:
    "Complete site map for Pakistan Economic Intelligence — every public page organised by category for easy navigation.",
  alternates: {
    canonical: `${SITE_URL}/site-map`,
  },
  robots: { index: true, follow: true },
};

const COMPARISON_LABELS: Record<string, string> = {
  "usd-pkr-vs-forex-reserves": "USD/PKR vs Forex Reserves",
  "current-account-vs-forex-reserves": "Current Account vs Forex Reserves",
  "external-debt-vs-forex-reserves": "External Debt vs Forex Reserves",
  "exports-vs-imports": "Exports vs Imports",
  "trade-balance-vs-usd-pkr": "Trade Balance vs USD/PKR",
  "inflation-vs-policy-rate": "Inflation vs Policy Rate",
  "inflation-vs-core-inflation": "Inflation vs Core Inflation",
  "inflation-vs-money-supply": "Inflation vs Money Supply",
  "inflation-vs-urban-food-inflation": "Inflation vs Urban Food Inflation",
  "pakistan-vs-us-inflation": "Pakistan vs US Inflation",
  "pakistan-vs-fed-funds-rate": "Pakistan vs Fed Funds Rate",
  "pakistan-vs-india-gdp-growth": "Pakistan vs India GDP Growth",
  "pakistan-vs-bangladesh-gdp-growth": "Pakistan vs Bangladesh GDP Growth",
  "gold-vs-usd-pkr": "Gold vs USD/PKR",
  "gold-vs-treasury-bills": "Gold vs Treasury Bills",
  "gdp-sector-composition": "GDP Sector Composition",
};

const BUDGET_LABELS: Record<string, string> = {
  "debt-servicing": "Debt Servicing",
  "defence-spending": "Defence Spending",
  "psdp": "PSDP (Development Spending)",
  "subsidies": "Subsidies",
  "fiscal-deficit": "Fiscal Deficit",
  "provincial-transfers": "Provincial Transfers",
  "education-budget": "Education Budget",
  "health-budget": "Health Budget",
  "debt-servicing-vs-defence": "Debt Servicing vs Defence",
  "where-does-tax-money-go": "Where Does Tax Money Go?",
};

const PROVINCIAL_LABELS: Record<string, string> = {
  "punjab-budget": "Punjab Budget",
  "sindh-budget": "Sindh Budget",
  "kp-budget": "KP Budget",
  "balochistan-budget": "Balochistan Budget",
  "punjab-education-budget": "Punjab Education Budget",
  "sindh-health-budget": "Sindh Health Budget",
  "kp-development-budget": "KP Development Budget",
  "balochistan-budget-analysis": "Balochistan Budget Analysis",
  "provincial-debt-comparison": "Provincial Debt Comparison",
  "provincial-education-comparison": "Provincial Education Comparison",
  "provincial-health-comparison": "Provincial Health Comparison",
  "growth-explorer": "Provincial Growth Explorer",
  "debt-burden-rankings": "Debt Burden Rankings",
  "development-spending-rankings": "Development Spending Rankings",
  "own-revenue-rankings": "Own Revenue Rankings",
};

function Section({ title, links }: { title: React.ReactNode; links: { href: string; label: string }[] }) {
  return (
    <section className="glass-card p-6 sm:p-8">
      <h2 className="mb-4 text-base font-semibold text-white/70 light:text-slate-700 uppercase tracking-widest text-xs">
        {title}
      </h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block text-sm text-white/65 light:text-slate-600 hover:text-neon-blue transition-colors"
            >
              {link.label} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SiteMapPage() {
  const comparisonLinks = [
    ...COMPARISONS.map((c) => ({
      href: `/comparisons/${c.slug}`,
      label: COMPARISON_LABELS[c.slug] ?? c.slug,
    })),
    {
      href: `/comparisons/${SECTOR_COMPOSITION.slug}`,
      label: COMPARISON_LABELS[SECTOR_COMPOSITION.slug] ?? SECTOR_COMPOSITION.slug,
    },
  ];

  const budgetLinks = [
    ...BUDGET_CATEGORIES.map((c) => ({
      href: `/budget/${c.slug}`,
      label: BUDGET_LABELS[c.slug] ?? c.slug,
    })),
    ...BUDGET_EXTRA_SEO_SLUGS.map((slug) => ({
      href: `/budget/${slug}`,
      label: BUDGET_LABELS[slug] ?? slug,
    })),
  ];

  const provincialLinks = PROVINCIAL_SEO_SLUGS.filter((slug) => slug !== "rankings").map((slug) => ({
    href: `/provincial-budget/${slug}`,
    label: PROVINCIAL_LABELS[slug] ?? slug,
  }));

  return (
    <div className="min-h-screen w-full px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium text-white/50 light:text-slate-500 transition-colors hover:text-white light:hover:text-slate-900"
          >
            <span aria-hidden="true">←</span> {SITE_NAME}
          </Link>
          <span className="min-w-0 shrink break-all text-right text-[10px] uppercase tracking-widest text-white/25 light:text-slate-400">
            pakeconintel.com/site-map
          </span>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">
          <T tKey="sitemap.title" />
        </h1>
        <p className="mt-3 text-sm text-white/60 light:text-slate-500">
          <T tKey="sitemap.description" />
        </p>

        <div className="mt-8 space-y-6">
          <Section
            title={<T tKey="sitemap.indicators" />}
            links={SEO_PAGES.map((p) => ({ href: `/${p.slug}`, label: p.label }))}
          />
          <Section title={<T tKey="sitemap.comparisons" />} links={comparisonLinks} />
          <Section title={<T tKey="sitemap.budget" />} links={budgetLinks} />
          <Section title={<T tKey="sitemap.provincial" />} links={provincialLinks} />
          <Section
            title={<T tKey="sitemap.mainDashboard" />}
            links={[
              { href: "/", label: "Live Economic Dashboard" },
              { href: "/economic-calendar", label: "Economic Calendar" },
            ]}
          />
        </div>

        <div className="mt-10 mb-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:bg-neon-blue/20"
          >
            <T tKey="sitemap.openDashboard" />
          </Link>
        </div>
      </div>
    </div>
  );
}
