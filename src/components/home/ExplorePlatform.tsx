// "Explore the platform" and the page footer for the Overview. Server-compatible (no hooks of its own).
//
// Every destination is an existing route. Links go through ProtectedLink, so a guest who follows one to a members' page gets the sign-in dialog,
// exactly as everywhere else on the site; for an open page it behaves as a normal link.

import type { ReactNode } from "react";
import ProtectedLink from "@/components/ProtectedLink";
import { PROVINCES } from "@/lib/provincial/provincialBudgetRegistry";
import { CARD } from "./OverviewSummary";

const FEATURES: { href: string; title: string; description: string; mobileOnly?: boolean }[] = [
  { href: "/macro-intelligence", title: "Macro Intelligence", description: "Seven-dimension regime read, with the evidence behind each call." },
  { href: "/budget", title: "Budget Tracker", description: "Federal spending and revenue, line by line." },
  { href: "/decision-support-lab", title: "Decision Lab", description: "Calculators for inflation, salary and savings in your city." },
  { href: "/comparisons", title: "Comparisons", description: "Put any two series, or two countries, on one chart." },
  // On a phone the province buttons and the questions list would be a long column; the two cards below are desktop-only, and these rows stand in.
  { href: "/provincial-budget", title: "Provincial budgets", description: "Punjab, Sindh, KP, Balochistan", mobileOnly: true },
  { href: "/academy", title: "Academy", description: "Learn how to read the data", mobileOnly: true },
];

const QUESTIONS: { href: string; label: string }[] = [
  { href: "/budget/where-does-tax-money-go", label: "Where does Pakistan's tax money go?" },
  { href: "/budget/debt-servicing-vs-defence", label: "Debt servicing vs defence" },
  { href: "/comparisons/pakistan-vs-india-gdp-growth", label: "Pakistan vs India GDP growth" },
  { href: "/provincial-budget/rankings", label: "Provincial budget rankings" },
  { href: "/budget/education-budget", label: "Education budget" },
  { href: "/budget/health-budget", label: "Health budget" },
  { href: "/comparisons/exports-vs-imports", label: "Exports vs imports" },
  { href: "/academy", label: "Learn to read the data, in the Academy" },
];

export function ExplorePlatform() {
  return (
    <section id="home-explore" aria-labelledby="home-explore-heading" className="flex flex-col gap-3 lg:gap-4">
      <h2 id="home-explore-heading" className="text-[17px] font-semibold text-pe-text">Explore the platform</h2>

      <ul className="grid grid-cols-1 max-lg:divide-y max-lg:divide-pe-border max-lg:rounded-[var(--pe-radius)] max-lg:border max-lg:border-pe-border max-lg:bg-pe-surface lg:grid-cols-4 lg:gap-4">
        {FEATURES.map((f) => (
          <li key={f.href} className={`min-w-0 lg:rounded-[var(--pe-radius)] lg:border lg:border-pe-border lg:bg-pe-surface ${f.mobileOnly ? "lg:hidden" : ""}`}>
            <ProtectedLink href={f.href} className="group flex h-full min-h-11 items-center justify-between gap-3 px-4 py-3 hover:bg-pe-surface-2 lg:flex-col lg:items-start lg:justify-start lg:gap-1.5 lg:p-5">
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-pe-text">{f.title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-pe-text-2">{f.description}</span>
              </span>
              <span className="shrink-0 text-[13px] font-medium text-pe-accent group-hover:underline lg:mt-auto lg:pt-2">
                <span className="max-lg:sr-only">Open </span>
                <span aria-hidden="true">→</span>
              </span>
            </ProtectedLink>
          </li>
        ))}
      </ul>

      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
        <div id="home-provincial" className={`${CARD} flex h-full flex-col p-4 lg:p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-pe-text">Provincial budgets</h3>
            <ProtectedLink href="/provincial-budget/compare" className="-my-2 inline-flex min-h-11 items-center text-[13px] font-medium text-pe-accent hover:underline">
              Compare all four →
            </ProtectedLink>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {PROVINCES.map((p) => (
              <li key={p.id}>
                <ProtectedLink
                  href={`/provincial-budget/${p.slug}`}
                  className="flex min-h-11 items-center rounded-[var(--pe-radius)] border border-pe-border px-3 text-[14px] font-medium text-pe-text hover:border-pe-border-strong hover:bg-pe-surface-2"
                >
                  {p.name}
                </ProtectedLink>
              </li>
            ))}
          </ul>
        </div>

        <div id="home-popular" className={`${CARD} flex h-full flex-col p-4 lg:p-5`}>
          <h3 className="text-[15px] font-semibold text-pe-text">Popular questions</h3>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {QUESTIONS.map((q) => (
              <li key={q.href}>
                <ProtectedLink href={q.href} className="flex min-h-11 items-center text-[14px] text-pe-accent hover:underline">
                  {q.label}
                </ProtectedLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** `sources` is the existing Data Sources control (it opens the per-indicator provenance table). */
export function OverviewFooter({ sources }: { sources: ReactNode }) {
  return (
    <footer className="mt-4 flex flex-col gap-3 border-t border-pe-border pt-5 text-[12px] text-pe-text-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <p>Data: State Bank of Pakistan, Pakistan Bureau of Statistics, World Bank, Yahoo Finance.</p>
        <div className="flex items-center gap-2">
          <span>Sources and methodology:</span>
          {sources}
        </div>
      </div>
      <p>Developed by Farzam Arif</p>
    </footer>
  );
}
