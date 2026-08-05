// Tool Field Registry — the single mapping between profile fields and the
// tools that consume them. MissingFieldPrompt reads getMissingFields()
// instead of each tool hardcoding its own "if missing X and Y" checks;
// the Tool Dependency Graph (EconomicProfileOnboarding's "affects N
// tools" hints) reads getAffectedTools(), which INVERTS this same table
// rather than maintaining a second, separately-hand-written field→tools
// list that could drift from it.
import type { EconomicProfile } from "@/lib/decisionSupportLab/economicProfile";

export interface ToolFieldRequirement {
  toolName: string;
  required: (keyof EconomicProfile)[];
  optional: (keyof EconomicProfile)[];
}

export const TOOL_FIELD_REGISTRY: Record<string, ToolFieldRequirement> = {
  // required is empty for these — the salary "required" concept is really
  // "currentSalary OR monthlyIncome" (see getEffectiveSalary()), an OR
  // relationship this simple required-list can't express, and monthlyIncome
  // is already one of the 5 global mandatory profile fields anyway. Each
  // Calculator gates on getEffectiveSalary(profile) > 0 directly; the
  // registry here only drives the OPTIONAL refinement prompts.
  "raise-reality-check": { toolName: "Raise Reality Check", required: [], optional: ["lastRaisePct"] },
  "salary-required": { toolName: "Salary Required", required: [], optional: ["expectedAnnualRaisePct"] },
  "future-salary-projection": { toolName: "Future Salary Projection", required: [], optional: ["expectedAnnualRaisePct"] },
  "savings-erosion": { toolName: "Savings Erosion", required: ["currentSavings"], optional: [] },
  "salary-purchasing-power": { toolName: "Salary Purchasing Power", required: [], optional: [] },
  "purchasing-power": { toolName: "Purchasing Power", required: [], optional: ["monthlyIncome"] },
  "real-return-calculator": { toolName: "Real Return Calculator", required: ["currentInvestmentAmount"], optional: [] },
  "real-return-dashboard": { toolName: "Real Return Dashboard", required: ["currentInvestmentAmount"], optional: [] },
  "inflation-drag-analyzer": { toolName: "Inflation Drag Analyzer", required: ["currentInvestmentAmount"], optional: [] },
  "investment-growth-explorer": { toolName: "Investment Growth Explorer", required: ["currentInvestmentAmount"], optional: [] },
  "portfolio-purchasing-power": { toolName: "Portfolio Purchasing Power", required: ["currentInvestmentAmount"], optional: ["investmentAllocation"] },
  "asset-comparison-lab": { toolName: "Asset Comparison Lab", required: [], optional: ["investmentAllocation"] },
  "asset-allocation-explorer": { toolName: "Asset Allocation Explorer", required: [], optional: ["investmentAllocation", "riskTolerance"] },
  "investment-scenario-simulator": { toolName: "Investment Scenario Simulator", required: ["currentInvestmentAmount"], optional: ["investmentAllocation"] },
  "present-value": { toolName: "Present Value", required: [], optional: ["currentSavings"] },
  "future-value": { toolName: "Future Value", required: [], optional: ["currentSavings"] },
  "loan-emi": { toolName: "Loan & EMI", required: [], optional: ["debtAmount", "debtInterestRate"] },
  "budget-allocation": { toolName: "Budget Allocation", required: ["monthlySpending"], optional: ["monthlyHousingCost"] },
  "personal-inflation": { toolName: "Personal Inflation", required: [], optional: ["monthlySpending"] },
  "health-score": { toolName: "Health Score", required: [], optional: ["monthlyIncome", "monthlySpending", "lastRaisePct", "currentSavings"] },
};

/** Fields the given tool needs that the profile doesn't have yet — required fields first, then optional. Used by MissingFieldPrompt to decide what to ask for (and, per the plan's ≤2/≥3 threshold, whether to show the compact prompt at all). */
export function getMissingFields(toolId: string, profile: EconomicProfile): (keyof EconomicProfile)[] {
  const entry = TOOL_FIELD_REGISTRY[toolId];
  if (!entry) return [];
  const isEmpty = (field: keyof EconomicProfile): boolean => {
    const value = profile[field];
    if (typeof value === "number") return value <= 0;
    if (typeof value === "string") return value.trim() === "";
    if (value === null) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  };
  return [...entry.required, ...entry.optional].filter(isEmpty);
}

/** A tool with no registry entry has no profile dependency at all (pure calculators like Compound Interest) and is always ready. Otherwise ready means every REQUIRED field (not optional) is already filled — the bar Section C4's "Start Here" row uses to pick tools the user's current profile can already support. */
export function isToolReady(toolId: string, profile: EconomicProfile): boolean {
  const entry = TOOL_FIELD_REGISTRY[toolId];
  if (!entry || entry.required.length === 0) return true;
  const missing = new Set(getMissingFields(toolId, profile));
  return entry.required.every((field) => !missing.has(field));
}

/** Inverts TOOL_FIELD_REGISTRY at call time — never a second hand-maintained list. Powers "updating this affects N tools" hints in EconomicProfileOnboarding. */
export function getAffectedTools(fieldKey: keyof EconomicProfile): { toolId: string; toolName: string }[] {
  return Object.entries(TOOL_FIELD_REGISTRY)
    .filter(([, entry]) => entry.required.includes(fieldKey) || entry.optional.includes(fieldKey))
    .map(([toolId, entry]) => ({ toolId, toolName: entry.toolName }));
}
