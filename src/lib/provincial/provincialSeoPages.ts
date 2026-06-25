// Registry for every /provincial-budget/[slug] SEO page that isn't a plain
// province workspace (punjab, sindh, kp, balochistan) — mirrors how
// src/lib/budget/budgetRegistry.ts drives /budget/[slug] for federal
// category pages. Content is generated from the same live dataset rather
// than hand-authored per page, so it can never drift out of sync with the
// numbers shown on the main workspace pages.

import type { ProvinceId } from "@/data/provincialBudgetHistorical";
import { getLatestProvinceYear, getProvinceYears, type ProvincialTrendField } from "./provincialBudgetData";
import { getProvinceMeta } from "./provincialBudgetRegistry";

export interface FaqItem {
  question: string;
  answer: string;
}

export type ProvincialSeoPageType = "province-overview" | "province-category" | "cross-comparison";

export interface ProvincialSeoPageDef {
  slug: string;
  type: ProvincialSeoPageType;
  title: string;
  description: string;
  province?: ProvinceId;
  field?: ProvincialTrendField;
  fieldLabel?: string;
}

export const PROVINCIAL_SEO_PAGES: ProvincialSeoPageDef[] = [
  {
    slug: "punjab-budget",
    type: "province-overview",
    province: "punjab",
    title: "Punjab Budget — Total Outlay, Development & Sector Spending",
    description: "Punjab's provincial budget breakdown — total outlay, development budget, education, health, and debt servicing, sourced from the Punjab Finance Department's own official documents.",
  },
  {
    slug: "sindh-budget",
    type: "province-overview",
    province: "sindh",
    title: "Sindh Budget — Total Outlay, Development & Sector Spending",
    description: "Sindh's provincial budget breakdown — total outlay, development budget, education, health, and debt servicing, sourced from the Sindh Finance Department's own official documents.",
  },
  {
    slug: "kp-budget",
    type: "province-overview",
    province: "kp",
    title: "Khyber Pakhtunkhwa Budget — Total Outlay, Development & Sector Spending",
    description: "KP's provincial budget breakdown — total outlay, development budget, local government, and debt servicing, sourced from the KP Finance Department's own official documents.",
  },
  {
    slug: "balochistan-budget",
    type: "province-overview",
    province: "balochistan",
    title: "Balochistan Budget — Total Outlay, Development & Sector Spending",
    description: "Balochistan's provincial budget breakdown — total outlay, development budget, education, health, and debt servicing, sourced from the Balochistan Finance Department's own official documents.",
  },
  {
    slug: "punjab-education-budget",
    type: "province-category",
    province: "punjab",
    field: "education",
    fieldLabel: "Education",
    title: "Punjab Education Budget",
    description: "Punjab's education sector allocation, sourced directly from the Punjab Finance Department's official budget documents.",
  },
  {
    slug: "sindh-health-budget",
    type: "province-category",
    province: "sindh",
    field: "health",
    fieldLabel: "Health",
    title: "Sindh Health Budget",
    description: "Sindh's health sector allocation, sourced directly from the Sindh Finance Department's official budget documents.",
  },
  {
    slug: "kp-development-budget",
    type: "province-category",
    province: "kp",
    field: "developmentBudget",
    fieldLabel: "Development Budget (ADP)",
    title: "KP Development Budget (ADP)",
    description: "Khyber Pakhtunkhwa's Annual Development Programme allocation, sourced directly from the KP Finance Department's official budget documents.",
  },
  {
    slug: "balochistan-budget-analysis",
    type: "province-overview",
    province: "balochistan",
    title: "Balochistan Budget Analysis",
    description: "A full breakdown of Balochistan's provincial budget — total outlay, development spending, sector allocations, debt servicing, and federal transfer dependency.",
  },
  {
    slug: "provincial-debt-comparison",
    type: "cross-comparison",
    field: "debtServicing",
    fieldLabel: "Debt Servicing",
    title: "Provincial Debt Comparison — Punjab vs Sindh vs KP vs Balochistan",
    description: "Comparing debt servicing across Pakistan's four provinces — which province carries the largest debt-servicing burden, sourced from each province's own official budget documents.",
  },
  {
    slug: "provincial-education-comparison",
    type: "cross-comparison",
    field: "education",
    fieldLabel: "Education",
    title: "Provincial Education Spending Comparison",
    description: "Comparing education budgets across Pakistan's four provinces — which province allocates the most to education, sourced from each province's own official budget documents.",
  },
  {
    slug: "provincial-health-comparison",
    type: "cross-comparison",
    field: "health",
    fieldLabel: "Health",
    title: "Provincial Health Spending Comparison",
    description: "Comparing health budgets across Pakistan's four provinces — which province allocates the most to health, sourced from each province's own official budget documents.",
  },
];

export function getProvincialSeoPage(slug: string): ProvincialSeoPageDef | undefined {
  return PROVINCIAL_SEO_PAGES.find((p) => p.slug === slug);
}

export function getAllProvincialSeoSlugs(): string[] {
  return PROVINCIAL_SEO_PAGES.map((p) => p.slug);
}

/** SEO pages (overview + category) scoped to one province — used to link each province's workspace page to its own SEO pages, since nothing else on the site linked to them otherwise. */
export function getSeoPagesForProvince(province: ProvinceId): ProvincialSeoPageDef[] {
  return PROVINCIAL_SEO_PAGES.filter((p) => p.province === province);
}

/** The 3 cross-province comparison SEO pages — used to link /provincial-budget/compare to its deeper, single-metric SEO pages. */
export function getCrossComparisonSeoPages(): ProvincialSeoPageDef[] {
  return PROVINCIAL_SEO_PAGES.filter((p) => p.type === "cross-comparison");
}

/**
 * FAQPage structured data, generated from the live dataset rather than
 * hand-typed per page — every claim below (years covered, source document,
 * relationship to the federal budget) is read directly off the registry and
 * historical dataset, so it can't drift out of sync or assert something the
 * data doesn't actually support. Mirrors the FAQPage pattern already used
 * on /budget, /budget/[slug], and /comparisons/[slug].
 */
export function getProvinceWorkspaceFaq(province: ProvinceId): FaqItem[] {
  const meta = getProvinceMeta(province);
  const years = getProvinceYears(province);
  const latest = getLatestProvinceYear(province);
  const earliest = years[0];

  return [
    {
      question: `What years does the ${meta.name} Budget Workshop cover?`,
      answer:
        years.length > 1
          ? `FY${earliest.fiscalYear} through FY${latest.fiscalYear} — ${meta.name}'s own official archive doesn't go back as far as every other province, so this Workshop starts where ${meta.name}'s real, verified documents do, rather than padding earlier years with guesses.`
          : `Currently FY${latest.fiscalYear} only — ${meta.name}'s historical figures for earlier years are a tracked follow-up, not yet transcribed, so they aren't shown rather than estimated.`,
    },
    {
      question: `Where does this data come from?`,
      answer: `Every figure is transcribed directly from ${meta.name}'s own official ${latest.citations.summary.document}, published by the ${meta.name} Finance Department. The exact source document and table are cited for each fiscal year.`,
    },
    {
      question: `Does this include all of ${meta.name}'s government spending?`,
      answer: `This covers ${meta.name}'s provincial budget as published in its own Finance Department documents. It does not include federal spending within ${meta.name}, or local-government-level budgets set independently of the provincial budget.`,
    },
    {
      question: `How is this different from the Federal Budget Workshop?`,
      answer: `The Federal Budget Workshop tracks Pakistan's federal government budget. This is ${meta.name}'s own, separate provincial budget — a different government, a different document, never merged with federal figures anywhere on this dashboard.`,
    },
  ];
}

export function getProvincialSeoPageFaq(page: ProvincialSeoPageDef): FaqItem[] {
  if (page.type === "province-overview" && page.province) {
    const meta = getProvinceMeta(page.province);
    const year = getLatestProvinceYear(page.province);
    return [
      {
        question: `What is ${meta.name}'s total budget for FY${year.fiscalYear}?`,
        answer: `Rs ${year.totalOutlay !== null ? year.totalOutlay.toFixed(1) : "—"} billion, per the ${meta.name} Finance Department's own ${year.citations.summary.document} for FY${year.fiscalYear}.`,
      },
      {
        question: `Where can I see ${meta.name}'s full budget breakdown?`,
        answer: `The full interactive ${meta.name} Budget Workshop has KPI cards, an allocation chart, a Rs100 spending breakdown, debt intelligence, and per-citizen spending — this page is a summary of it.`,
      },
    ];
  }
  if (page.type === "province-category" && page.province && page.fieldLabel) {
    const meta = getProvinceMeta(page.province);
    const year = getLatestProvinceYear(page.province);
    return [
      {
        question: `What is ${meta.name}'s ${page.fieldLabel} allocation for FY${year.fiscalYear}?`,
        answer:
          typeof year[page.field as keyof typeof year] === "number"
            ? `Rs ${(year[page.field as keyof typeof year] as number).toFixed(1)} billion, per the ${meta.name} Finance Department's own ${year.citations.summary.document} for FY${year.fiscalYear}.`
            : `Not separately stated in ${meta.name}'s FY${year.fiscalYear} budget documents — see the ${meta.name} Budget Workshop's data notes for why.`,
      },
      {
        question: `Where does this figure come from?`,
        answer: `Transcribed directly from the ${meta.name} Finance Department's own official ${year.citations.summary.document}, FY${year.fiscalYear} Budget Estimate.`,
      },
    ];
  }
  if (page.type === "cross-comparison" && page.fieldLabel) {
    return [
      {
        question: `How are the four provinces compared on ${page.fieldLabel}?`,
        answer: `Each province's own latest verified budget year is used — these years differ by province, since each one's real archive goes back a different distance. The ranking is a direct calculation, not an AI estimate.`,
      },
      {
        question: `Why might a province show "Not available" for ${page.fieldLabel}?`,
        answer: `Some provinces' own budget documents don't separately itemize every category every year. Rather than estimate a missing figure, it's shown as unavailable.`,
      },
    ];
  }
  return [];
}
