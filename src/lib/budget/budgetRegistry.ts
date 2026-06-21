// Single source of truth for the Budget Workshop's per-category metadata —
// mirrors src/lib/comparisons/comparisonRegistry.ts's role for Comparisons.
// Every category here maps to a field on BudgetYearRecord (see
// src/data/budgetHistorical.ts) and, for the 8 listed below, a dedicated
// /budget/[slug] SEO page.

import type { BudgetYearRecord } from "@/data/budgetHistorical";

export type BudgetCategoryId =
  | "defence"
  | "debtServicing"
  | "federalPsdp"
  | "subsidies"
  | "fiscalDeficit"
  | "provincialTransfer"
  | "federalEducation"
  | "federalHealth";

export interface BudgetCategoryDef {
  id: BudgetCategoryId;
  slug: string;
  title: string;
  shortTitle: string;
  unit: "Rs billion" | "% of GDP";
  /** Reads the BE figure for this category off a year record (billions of Rs unless noted). */
  getValue: (year: BudgetYearRecord) => number | null;
  description: string;
  whyItMatters: string;
  faq: { question: string; answer: string }[];
  /** Shown as a tooltip/footnote wherever this category appears — only set for federal-only categories that could be mistaken for total national spending. */
  disclaimer?: string;
  color: string;
}

const NEON_BLUE = "#38bdf8";
const NEON_PURPLE = "#a855f7";
const AMBER = "#f59e0b";
const EMERALD = "#34d399";
const ROSE = "#fb7185";
const VIOLET = "#818cf8";

export const FEDERAL_PROVINCIAL_DISCLAIMER =
  "Education and health are primarily provincial responsibilities after the 18th Amendment (2010). These figures represent federal current expenditure only — not total national spending on this sector.";

export const BUDGET_CATEGORIES: BudgetCategoryDef[] = [
  {
    id: "debtServicing",
    slug: "debt-servicing",
    title: "Pakistan's Debt Servicing (Interest Payments)",
    shortTitle: "Debt Servicing",
    unit: "Rs billion",
    getValue: (y) => y.debtServicing,
    color: ROSE,
    description: "Interest payments on Pakistan's domestic and external public debt — the single largest line item in the federal budget.",
    whyItMatters: "Debt servicing now consumes a larger share of the federal budget than defence — money spent servicing past borrowing is money unavailable for development, education, or health, regardless of which government is in office.",
    faq: [
      { question: "Is debt servicing the same as total public debt?", answer: "No. Total public debt is the stock of money owed (tens of trillions of Rupees); debt servicing is the interest paid on that debt in a single fiscal year. This dataset tracks the annual interest payment, not the outstanding debt stock." },
      { question: "Why has debt servicing grown so much?", answer: "A growing debt stock, persistently high domestic interest rates, and Rupee depreciation (which raises the local-currency cost of servicing foreign debt) have all pushed this figure up sharply since the late 2010s." },
    ],
  },
  {
    id: "defence",
    slug: "defence-spending",
    title: "Pakistan Defence Budget",
    shortTitle: "Defence",
    unit: "Rs billion",
    getValue: (y) => y.defence,
    color: NEON_BLUE,
    description: "The Defence Affairs and Services allocation — Pakistan's military spending as published in the federal Budget in Brief.",
    whyItMatters: "Defence has historically been one of Pakistan's largest current expenditure items, though debt servicing has now overtaken it in absolute terms — a structural shift worth tracking over time.",
    faq: [
      { question: "Does this include all military-related spending?", answer: "This is the Defence Affairs and Services allocation from Budget in Brief's Table 1 — the headline figure typically cited as \"the defence budget.\" It does not separately break out classified or off-budget items, which Budget in Brief does not itemize publicly." },
    ],
  },
  {
    id: "federalPsdp",
    slug: "psdp",
    title: "Public Sector Development Programme (PSDP)",
    shortTitle: "PSDP",
    unit: "Rs billion",
    getValue: (y) => y.federalPsdp,
    color: EMERALD,
    description: "The Federal Public Sector Development Programme — the federal government's development/infrastructure spending budget.",
    whyItMatters: "PSDP is the main lever for federally-funded infrastructure, energy, and development projects. Provinces run their own, separate development programmes (Annual Development Programmes) outside this figure.",
    faq: [
      { question: "Is PSDP the same as total development spending in Pakistan?", answer: "No — this is the federal PSDP only. Each province runs its own Annual Development Programme (ADP), funded from its own budget, which is not included in this federal figure." },
    ],
  },
  {
    id: "subsidies",
    slug: "subsidies",
    title: "Pakistan's Federal Subsidies",
    shortTitle: "Subsidies",
    unit: "Rs billion",
    getValue: (y) => y.subsidies,
    color: AMBER,
    description: "Federal government subsidies — mainly electricity tariff differentials, with smaller allocations for wheat, fertilizer, and other commodities.",
    whyItMatters: "Power-sector tariff subsidies are the dominant component in most years — a recurring fiscal pressure point in Pakistan's IMF programme discussions.",
    faq: [
      { question: "What's the biggest subsidy category?", answer: "Electricity tariff differential subsidies (including K-Electric and inter-DISCO tariff equalization) have been the largest component in most years covered by this dataset." },
    ],
  },
  {
    id: "fiscalDeficit",
    slug: "fiscal-deficit",
    title: "Pakistan's Budgeted Fiscal Deficit",
    shortTitle: "Fiscal Deficit",
    unit: "Rs billion",
    getValue: (y) => y.fiscalDeficitRs,
    color: VIOLET,
    description: "The Overall Fiscal Deficit (federal and provincial governments consolidated) as budgeted at the start of each fiscal year — the gap between total revenue and total spending.",
    whyItMatters: "This is the Budget Estimate target set at the start of the year, not the final actual outcome (which is typically reported later and often differs). Tracking the BE trend shows how ambitious or conservative each year's fiscal target was.",
    disclaimer: "This is the Budget Estimate (BE) deficit target announced at the start of the fiscal year — not the final, actual outturn, which is reported later and can differ materially.",
    faq: [
      { question: "Is this the actual fiscal deficit or the target?", answer: "This is the Budget Estimate (BE) — the target set when the budget was announced. Pakistan also publishes Revised Estimates and eventual actuals, which this dataset deliberately excludes to keep every year on a consistent, comparable basis." },
      { question: "How is this financed?", answer: "Through a mix of domestic borrowing (T-Bills, Pakistan Investment Bonds, National Savings Schemes) and external borrowing (multilateral lenders, bilateral loans, commercial/Eurobonds)." },
    ],
  },
  {
    id: "provincialTransfer",
    slug: "provincial-transfers",
    title: "Provincial Transfers (NFC Award)",
    shortTitle: "Provincial Transfers",
    unit: "Rs billion",
    getValue: (y) => y.provincialTransfer,
    color: NEON_PURPLE,
    description: "The provinces' share of federally-collected divisible-pool taxes under the National Finance Commission (NFC) Award.",
    whyItMatters: "This is constitutionally the largest deduction from gross federal revenue before the federal government even starts spending — it directly shapes how much fiscal room the federal government has left.",
    faq: [
      { question: "What is the NFC Award?", answer: "The National Finance Commission Award is the constitutional mechanism (Article 160) that sets how federally-collected divisible-pool taxes are split between the federal government and the four provinces. The current 7th NFC Award gives provinces 57.5% of the divisible pool." },
      { question: "Does this include all federal-to-provincial payments?", answer: "This figure is the divisible-pool/NFC share specifically. Supplementary grants and straight transfers to provinces are tracked separately in this dataset as \"Grants and Transfers to Provinces & Others.\"" },
    ],
  },
  {
    id: "federalEducation",
    slug: "education-budget",
    title: "Pakistan's Federal Education Budget",
    shortTitle: "Federal Education",
    unit: "Rs billion",
    getValue: (y) => y.federalEducation,
    color: EMERALD,
    description: "Federal current expenditure on Education Affairs and Services — HEC, federal universities, and federal education institutions.",
    whyItMatters: "Education was devolved to the provinces under the 18th Amendment (2010); the bulk of Pakistan's actual education spending happens in provincial budgets, not here.",
    disclaimer: FEDERAL_PROVINCIAL_DISCLAIMER,
    faq: [
      { question: "Is this Pakistan's total education budget?", answer: "No. This is the federal government's current expenditure on education only — mainly the Higher Education Commission and federal institutions. Education is a provincial subject since the 18th Amendment, and provincial education budgets (Punjab, Sindh, KP, Balochistan) are several times larger than this federal figure, but are tracked in separate provincial budget documents not covered by this dataset." },
      { question: "Does this include PSDP development spending on education?", answer: "No — this is current expenditure only, from Budget in Brief's Function-Wise Expenditure table. Education-tagged PSDP development projects are booked under PSDP, a different classification, and are not added in here to avoid double-counting across two different expenditure classifications." },
    ],
  },
  {
    id: "federalHealth",
    slug: "health-budget",
    title: "Pakistan's Federal Health Budget",
    shortTitle: "Federal Health",
    unit: "Rs billion",
    getValue: (y) => y.federalHealth,
    color: ROSE,
    description: "Federal current expenditure on Health Affairs and Services — federal hospitals, health institutions, and federal health programmes.",
    whyItMatters: "Health was devolved to the provinces under the 18th Amendment (2010); the bulk of Pakistan's actual public health spending happens in provincial budgets, not here.",
    disclaimer: FEDERAL_PROVINCIAL_DISCLAIMER,
    faq: [
      { question: "Is this Pakistan's total health budget?", answer: "No. This is the federal government's current expenditure on health only. Health is a provincial subject since the 18th Amendment, and provincial health budgets are several times larger than this federal figure, but are tracked in separate provincial budget documents not covered by this dataset." },
      { question: "Does this include PSDP development spending on health?", answer: "No — this is current expenditure only. Health-tagged PSDP development projects are booked under PSDP, a different classification, and are not added in here to avoid double-counting." },
    ],
  },
];

/** Label + color for every trendable field on BudgetYearRecord, including the 5 that have no dedicated /budget/[slug] page (totalOutlay, fbrTaxRevenue, nonTaxRevenue, grantsAndTransfersOther) — used by the category multi-select and trend chart. */
export const BUDGET_FIELD_META: Record<string, { label: string; color: string }> = {
  totalOutlay: { label: "Total Outlay", color: "#e2e8f0" },
  fbrTaxRevenue: { label: "FBR Tax Revenue", color: NEON_BLUE },
  nonTaxRevenue: { label: "Non-Tax Revenue", color: "#22d3ee" },
  provincialTransfer: { label: "Provincial Transfers", color: NEON_PURPLE },
  grantsAndTransfersOther: { label: "Grants & Transfers (Other)", color: "#c084fc" },
  federalPsdp: { label: "PSDP", color: EMERALD },
  defence: { label: "Defence", color: NEON_BLUE },
  debtServicing: { label: "Debt Servicing", color: ROSE },
  pension: { label: "Pension", color: VIOLET },
  subsidies: { label: "Subsidies", color: AMBER },
  federalEducation: { label: "Federal Education", color: EMERALD },
  federalHealth: { label: "Federal Health", color: "#f472b6" },
  fiscalDeficitRs: { label: "Fiscal Deficit", color: "#fb923c" },
};

export function getBudgetCategoryBySlug(slug: string): BudgetCategoryDef | undefined {
  return BUDGET_CATEGORIES.find((c) => c.slug === slug);
}

export function getAllBudgetCategorySlugs(): string[] {
  return BUDGET_CATEGORIES.map((c) => c.slug);
}

/** Extra SEO pages that aren't single-category pages (comparisons, pillar pages) — listed here so sitemap.ts has one place to read every /budget/* URL from. */
export const BUDGET_EXTRA_SEO_SLUGS = ["debt-servicing-vs-defence", "where-does-tax-money-go"];
