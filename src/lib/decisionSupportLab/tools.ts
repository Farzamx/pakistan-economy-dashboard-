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
export type ToolStatus = "available" | "coming-soon";
export type ToolCategoryId = "core" | "income-wealth";

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
    id: "future-value",
    category: "income-wealth",
    titleKey: "decisionSupportLab.tool.futureValue.title",
    descriptionKey: "decisionSupportLab.tool.futureValue.description",
    status: "coming-soon",
    estimatedReleaseKey: "decisionSupportLab.estimate.phase3",
  },
  {
    id: "present-value",
    category: "income-wealth",
    titleKey: "decisionSupportLab.tool.presentValue.title",
    descriptionKey: "decisionSupportLab.tool.presentValue.description",
    status: "coming-soon",
    estimatedReleaseKey: "decisionSupportLab.estimate.phase3",
  },
];
