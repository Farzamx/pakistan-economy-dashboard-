// Single source of truth for the Provincial Budget Workshop's per-province
// and per-category metadata — mirrors src/lib/budget/budgetRegistry.ts's
// role for the Federal Budget Workshop.

import type { ProvinceId } from "@/data/provincialBudgetHistorical";

export interface ProvinceMeta {
  id: ProvinceId;
  name: string;
  slug: string;
  capital: string;
  color: string;
}

export const PROVINCES: ProvinceMeta[] = [
  { id: "punjab", name: "Punjab", slug: "punjab", capital: "Lahore", color: "#38bdf8" },
  { id: "sindh", name: "Sindh", slug: "sindh", capital: "Karachi", color: "#34d399" },
  { id: "kp", name: "Khyber Pakhtunkhwa", slug: "kp", capital: "Peshawar", color: "#f59e0b" },
  { id: "balochistan", name: "Balochistan", slug: "balochistan", capital: "Quetta", color: "#a855f7" },
];

export function getProvinceMeta(province: ProvinceId): ProvinceMeta {
  const meta = PROVINCES.find((p) => p.id === province);
  if (!meta) throw new Error(`Unknown province: ${province}`);
  return meta;
}

export function getProvinceBySlug(slug: string): ProvinceMeta | undefined {
  return PROVINCES.find((p) => p.slug === slug);
}

export type ProvincialCategoryId =
  | "totalOutlay"
  | "developmentBudget"
  | "education"
  | "health"
  | "agriculture"
  | "debtServicing"
  | "federalTransfers"
  | "ownRevenue";

export interface ProvincialCategoryDef {
  id: ProvincialCategoryId;
  label: string;
  shortLabel: string;
  unit: "Rs billion";
  color: string;
}

export const PROVINCIAL_CATEGORIES: ProvincialCategoryDef[] = [
  { id: "totalOutlay", label: "Total Budget Outlay", shortLabel: "Total Budget", unit: "Rs billion", color: "#e2e8f0" },
  { id: "developmentBudget", label: "Development Budget (ADP/PSDP)", shortLabel: "Development", unit: "Rs billion", color: "#34d399" },
  { id: "education", label: "Education Allocation", shortLabel: "Education", unit: "Rs billion", color: "#34d399" },
  { id: "health", label: "Health Allocation", shortLabel: "Health", unit: "Rs billion", color: "#fb7185" },
  { id: "agriculture", label: "Agriculture Allocation", shortLabel: "Agriculture", unit: "Rs billion", color: "#f59e0b" },
  { id: "debtServicing", label: "Debt Servicing", shortLabel: "Debt Servicing", unit: "Rs billion", color: "#818cf8" },
  { id: "federalTransfers", label: "Federal Transfers (NFC Award)", shortLabel: "Federal Transfers", unit: "Rs billion", color: "#a855f7" },
  { id: "ownRevenue", label: "Own Revenue", shortLabel: "Own Revenue", unit: "Rs billion", color: "#38bdf8" },
];

/** Extra SEO slugs (topic pages, comparisons) that aren't a plain province/category page — listed here so sitemap.ts has one place to read every /provincial-budget/* URL from. */
export const PROVINCIAL_SEO_SLUGS = [
  "punjab-budget",
  "sindh-budget",
  "kp-budget",
  "balochistan-budget",
  "punjab-education-budget",
  "sindh-health-budget",
  "kp-development-budget",
  "balochistan-budget-analysis",
  "provincial-debt-comparison",
  "provincial-education-comparison",
  "provincial-health-comparison",
  "growth-explorer",
  "rankings",
  "debt-burden-rankings",
  "development-spending-rankings",
  "own-revenue-rankings",
];
