// Decision Support Lab — tool registry. The single source of truth for
// every tool card on the Lab's landing page (src/app/decision-support-lab/
// page.tsx) and, once a tool ships, for its own route metadata. Adding a
// future tool means adding one entry here and building its page under
// src/app/decision-support-lab/<slug> — nothing else in the Lab's shell
// (landing page, nav, tool grid) needs to change.
//
// Phase 3 added `category` — the landing page now renders one section per
// category (ToolGrid.tsx), so "Income & Wealth Intelligence" reads as its
// own part of the Lab rather than getting mixed into the original grid.
import { isToolReady } from "@/lib/decisionSupportLab/toolFieldRegistry";
import type { EconomicProfile } from "@/lib/decisionSupportLab/economicProfile";

export type ToolStatus = "available" | "coming-soon";
export type ToolCategoryId = "core" | "income-wealth" | "time-value" | "investment-intelligence";

export interface ToolDefinition {
  id: string;
  category: ToolCategoryId;
  /** i18n key for the card/page title. */
  titleKey: string;
  /** i18n key for the one-line card description. */
  descriptionKey: string;
  status: ToolStatus;
  /** Route — only set once a tool is actually built. */
  href?: string;
  /** i18n key for the "Est. Q_ 20__" chip on a coming-soon card. */
  estimatedReleaseKey?: string;
}

export interface ToolCategory {
  id: ToolCategoryId;
  titleKey: string;
  subtitleKey: string;
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  { id: "core", titleKey: "decisionSupportLab.toolsTitle", subtitleKey: "decisionSupportLab.toolsSubtitle" },
  { id: "income-wealth", titleKey: "decisionSupportLab.incomeWealthTitle", subtitleKey: "decisionSupportLab.incomeWealthSubtitle" },
  { id: "time-value", titleKey: "decisionSupportLab.timeValueTitle", subtitleKey: "decisionSupportLab.timeValueSubtitle" },
  { id: "investment-intelligence", titleKey: "decisionSupportLab.investmentIntelligenceTitle", subtitleKey: "decisionSupportLab.investmentIntelligenceSubtitle" },
];

export const DECISION_SUPPORT_TOOLS: ToolDefinition[] = [
  {
    id: "personal-inflation",
    category: "core",
    titleKey: "nav.personalInflationCalculator",
    descriptionKey: "decisionSupportLab.tool.personalInflation.description",
    status: "available",
    href: "/decision-support-lab/personal-inflation",
  },
  {
    id: "purchasing-power",
    category: "core",
    titleKey: "decisionSupportLab.tool.purchasingPower.title",
    descriptionKey: "decisionSupportLab.tool.purchasingPower.description",
    status: "available",
    href: "/decision-support-lab/purchasing-power",
  },
  {
    id: "budget-allocation",
    category: "core",
    titleKey: "decisionSupportLab.tool.budgetAllocation.title",
    descriptionKey: "decisionSupportLab.tool.budgetAllocation.description",
    status: "available",
    href: "/decision-support-lab/budget-allocation",
  },
  {
    id: "salary-purchasing-power",
    category: "income-wealth",
    titleKey: "decisionSupportLab.tool.salaryPurchasingPower.title",
    descriptionKey: "decisionSupportLab.tool.salaryPurchasingPower.description",
    status: "available",
    href: "/decision-support-lab/salary-purchasing-power",
  },
  {
    id: "raise-reality-check",
    category: "income-wealth",
    titleKey: "decisionSupportLab.tool.raiseRealityCheck.title",
    descriptionKey: "decisionSupportLab.tool.raiseRealityCheck.description",
    status: "available",
    href: "/decision-support-lab/raise-reality-check",
  },
  {
    id: "salary-required",
    category: "income-wealth",
    titleKey: "decisionSupportLab.tool.salaryRequired.title",
    descriptionKey: "decisionSupportLab.tool.salaryRequired.description",
    status: "available",
    href: "/decision-support-lab/salary-required",
  },
  {
    id: "future-salary-projection",
    category: "income-wealth",
    titleKey: "decisionSupportLab.tool.futureSalaryProjection.title",
    descriptionKey: "decisionSupportLab.tool.futureSalaryProjection.description",
    status: "available",
    href: "/decision-support-lab/future-salary-projection",
  },
  {
    id: "savings-erosion",
    category: "income-wealth",
    titleKey: "decisionSupportLab.tool.savingsErosion.title",
    descriptionKey: "decisionSupportLab.tool.savingsErosion.description",
    status: "available",
    href: "/decision-support-lab/savings-erosion",
  },
  {
    id: "health-score",
    category: "income-wealth",
    titleKey: "decisionSupportLab.tool.healthScore.title",
    descriptionKey: "decisionSupportLab.tool.healthScore.description",
    status: "available",
    href: "/decision-support-lab/health-score",
  },
  {
    id: "inflation-impact",
    category: "income-wealth",
    titleKey: "decisionSupportLab.tool.inflationImpact.title",
    descriptionKey: "decisionSupportLab.tool.inflationImpact.description",
    status: "coming-soon",
    estimatedReleaseKey: "decisionSupportLab.estimate.phase3",
  },
  {
    id: "present-value",
    category: "time-value",
    titleKey: "decisionSupportLab.tool.presentValue.title",
    descriptionKey: "decisionSupportLab.tool.presentValue.description",
    status: "available",
    href: "/decision-support-lab/present-value",
  },
  {
    id: "future-value",
    category: "time-value",
    titleKey: "decisionSupportLab.tool.futureValue.title",
    descriptionKey: "decisionSupportLab.tool.futureValue.description",
    status: "available",
    href: "/decision-support-lab/future-value",
  },
  {
    id: "compound-interest",
    category: "time-value",
    titleKey: "decisionSupportLab.tool.compoundInterest.title",
    descriptionKey: "decisionSupportLab.tool.compoundInterest.description",
    status: "available",
    href: "/decision-support-lab/compound-interest",
  },
  {
    id: "loan-emi",
    category: "time-value",
    titleKey: "decisionSupportLab.tool.loanEmi.title",
    descriptionKey: "decisionSupportLab.tool.loanEmi.description",
    status: "available",
    href: "/decision-support-lab/loan-emi",
  },
  {
    id: "annuity",
    category: "time-value",
    titleKey: "decisionSupportLab.tool.annuity.title",
    descriptionKey: "decisionSupportLab.tool.annuity.description",
    status: "available",
    href: "/decision-support-lab/annuity",
  },
  {
    id: "discount-factor-explorer",
    category: "time-value",
    titleKey: "decisionSupportLab.tool.discountFactorExplorer.title",
    descriptionKey: "decisionSupportLab.tool.discountFactorExplorer.description",
    status: "available",
    href: "/decision-support-lab/discount-factor-explorer",
  },
  {
    id: "formula-explorer",
    category: "time-value",
    titleKey: "decisionSupportLab.tool.formulaExplorer.title",
    descriptionKey: "decisionSupportLab.tool.formulaExplorer.description",
    status: "available",
    href: "/decision-support-lab/formula-explorer",
  },
  {
    id: "real-return-dashboard",
    category: "investment-intelligence",
    titleKey: "decisionSupportLab.tool.realReturnDashboard.title",
    descriptionKey: "decisionSupportLab.tool.realReturnDashboard.description",
    status: "available",
    href: "/decision-support-lab/real-return-dashboard",
  },
  {
    id: "real-return-calculator",
    category: "investment-intelligence",
    titleKey: "decisionSupportLab.tool.realReturnCalculator.title",
    descriptionKey: "decisionSupportLab.tool.realReturnCalculator.description",
    status: "available",
    href: "/decision-support-lab/real-return-calculator",
  },
  {
    id: "asset-comparison-lab",
    category: "investment-intelligence",
    titleKey: "decisionSupportLab.tool.assetComparisonLab.title",
    descriptionKey: "decisionSupportLab.tool.assetComparisonLab.description",
    status: "available",
    href: "/decision-support-lab/asset-comparison-lab",
  },
  {
    id: "investment-growth-explorer",
    category: "investment-intelligence",
    titleKey: "decisionSupportLab.tool.investmentGrowthExplorer.title",
    descriptionKey: "decisionSupportLab.tool.investmentGrowthExplorer.description",
    status: "available",
    href: "/decision-support-lab/investment-growth-explorer",
  },
  {
    id: "portfolio-purchasing-power",
    category: "investment-intelligence",
    titleKey: "decisionSupportLab.tool.portfolioPurchasingPower.title",
    descriptionKey: "decisionSupportLab.tool.portfolioPurchasingPower.description",
    status: "available",
    href: "/decision-support-lab/portfolio-purchasing-power",
  },
  {
    id: "inflation-drag-analyzer",
    category: "investment-intelligence",
    titleKey: "decisionSupportLab.tool.inflationDragAnalyzer.title",
    descriptionKey: "decisionSupportLab.tool.inflationDragAnalyzer.description",
    status: "available",
    href: "/decision-support-lab/inflation-drag-analyzer",
  },
  {
    id: "asset-allocation-explorer",
    category: "investment-intelligence",
    titleKey: "decisionSupportLab.tool.assetAllocationExplorer.title",
    descriptionKey: "decisionSupportLab.tool.assetAllocationExplorer.description",
    status: "available",
    href: "/decision-support-lab/asset-allocation-explorer",
  },
  {
    id: "investment-scenario-simulator",
    category: "investment-intelligence",
    titleKey: "decisionSupportLab.tool.investmentScenarioSimulator.title",
    descriptionKey: "decisionSupportLab.tool.investmentScenarioSimulator.description",
    status: "available",
    href: "/decision-support-lab/investment-scenario-simulator",
  },
];

/** Section C4's "Start Here" row — exactly `count` available tools the user's current profile can already support (isToolReady), preferring registry order; pads with any remaining available tools if fewer than `count` are ready yet (e.g. a brand-new guest profile). */
export function getStartHereTools(profile: EconomicProfile, count = 3): ToolDefinition[] {
  const available = DECISION_SUPPORT_TOOLS.filter((t) => t.status === "available");
  const ready = available.filter((t) => isToolReady(t.id, profile));
  if (ready.length >= count) return ready.slice(0, count);
  const readyIds = new Set(ready.map((t) => t.id));
  const padding = available.filter((t) => !readyIds.has(t.id));
  return [...ready, ...padding].slice(0, count);
}
