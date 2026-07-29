// Decision Support Lab — tool registry. The single source of truth for
// every tool card on the Lab's landing page (src/app/decision-support-lab/
// page.tsx) and, once a tool ships, for its own route metadata. Adding a
// future tool (Purchasing Power, Salary Purchasing Power, Budget
// Allocation, Inflation Impact, Savings Erosion, Future Value, Present
// Value) means adding one entry here and building its page under
// src/app/decision-support-lab/<slug> — nothing else in the Lab's shell
// (landing page, nav, tool grid) needs to change.
export type ToolStatus = "available" | "coming-soon";

export interface ToolDefinition {
  id: string;
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

export const DECISION_SUPPORT_TOOLS: ToolDefinition[] = [
  {
    id: "personal-inflation",
    titleKey: "nav.personalInflationCalculator",
    descriptionKey: "decisionSupportLab.tool.personalInflation.description",
    status: "available",
    href: "/decision-support-lab/personal-inflation",
  },
  {
    id: "purchasing-power",
    titleKey: "decisionSupportLab.tool.purchasingPower.title",
    descriptionKey: "decisionSupportLab.tool.purchasingPower.description",
    status: "coming-soon",
    estimatedReleaseKey: "decisionSupportLab.estimate.phase2",
  },
  {
    id: "salary-purchasing-power",
    titleKey: "decisionSupportLab.tool.salaryPurchasingPower.title",
    descriptionKey: "decisionSupportLab.tool.salaryPurchasingPower.description",
    status: "coming-soon",
    estimatedReleaseKey: "decisionSupportLab.estimate.phase2",
  },
  {
    id: "budget-allocation",
    titleKey: "decisionSupportLab.tool.budgetAllocation.title",
    descriptionKey: "decisionSupportLab.tool.budgetAllocation.description",
    status: "coming-soon",
    estimatedReleaseKey: "decisionSupportLab.estimate.phase2",
  },
  {
    id: "inflation-impact",
    titleKey: "decisionSupportLab.tool.inflationImpact.title",
    descriptionKey: "decisionSupportLab.tool.inflationImpact.description",
    status: "coming-soon",
    estimatedReleaseKey: "decisionSupportLab.estimate.phase3",
  },
  {
    id: "savings-erosion",
    titleKey: "decisionSupportLab.tool.savingsErosion.title",
    descriptionKey: "decisionSupportLab.tool.savingsErosion.description",
    status: "coming-soon",
    estimatedReleaseKey: "decisionSupportLab.estimate.phase3",
  },
  {
    id: "future-value",
    titleKey: "decisionSupportLab.tool.futureValue.title",
    descriptionKey: "decisionSupportLab.tool.futureValue.description",
    status: "coming-soon",
    estimatedReleaseKey: "decisionSupportLab.estimate.phase3",
  },
  {
    id: "present-value",
    titleKey: "decisionSupportLab.tool.presentValue.title",
    descriptionKey: "decisionSupportLab.tool.presentValue.description",
    status: "coming-soon",
    estimatedReleaseKey: "decisionSupportLab.estimate.phase3",
  },
];
