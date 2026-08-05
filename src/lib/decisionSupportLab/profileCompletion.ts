// Profile completion — per-section and overall percentages, plus a
// checklist view over the same numbers (Part 9 / round-2 item 5 of the
// Phase 5.5 brief). Pure functions only, no state — consumed by
// EconomicProfileOnboarding (per-section badges) and EconomicDashboard
// (the overall ring + Profile Health Check card).
import { MANDATORY_FIELDS, isMandatoryComplete, type EconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import { getAffectedTools } from "@/lib/decisionSupportLab/toolFieldRegistry";

export type ProfileSectionId = "personal" | "income" | "household" | "housing" | "savings" | "debt" | "investments" | "foreignIncome" | "goals";

interface SectionFieldCheck {
  id: ProfileSectionId;
  /** Each entry is a field name (for the completion %) plus a human label (for the health checklist). */
  fields: { field: keyof EconomicProfile; label: string; filled: (p: EconomicProfile) => boolean }[];
}

const SECTIONS: SectionFieldCheck[] = [
  {
    id: "personal",
    fields: [
      { field: "city", label: "City recorded", filled: (p) => p.city.trim() !== "" },
      { field: "province", label: "Province recorded", filled: (p) => p.province !== null },
      { field: "filerStatus", label: "Filer status recorded", filled: (p) => p.filerStatus !== "unknown" },
    ],
  },
  {
    id: "income",
    fields: [
      { field: "monthlyIncome", label: "Monthly income recorded", filled: (p) => p.monthlyIncome > 0 },
      { field: "incomeType", label: "Income type recorded", filled: (p) => p.incomeType !== null },
      { field: "currentSalary", label: "Salary recorded", filled: (p) => p.currentSalary > 0 },
      { field: "expectedAnnualRaisePct", label: "Expected raise recorded", filled: (p) => p.expectedAnnualRaisePct > 0 },
    ],
  },
  {
    id: "household",
    fields: [
      { field: "householdSize", label: "Household size recorded", filled: (p) => p.householdSize > 0 },
      { field: "monthlySpending", label: "Monthly spending recorded", filled: (p) => p.monthlySpending > 0 },
      { field: "householdAllocation", label: "Budget allocation recorded", filled: (p) => Object.keys(p.householdAllocation.allocation).length > 0 },
    ],
  },
  {
    id: "housing",
    fields: [
      { field: "housingStatus", label: "Housing status recorded", filled: (p) => p.housingStatus !== null },
      { field: "monthlyHousingCost", label: "Housing cost recorded", filled: (p) => p.monthlyHousingCost > 0 },
    ],
  },
  {
    id: "savings",
    fields: [{ field: "currentSavings", label: "Savings recorded", filled: (p) => p.currentSavings > 0 }],
  },
  {
    id: "debt",
    fields: [{ field: "hasDebt", label: "Debt information recorded", filled: (p) => p.hasDebt ? p.debtAmount > 0 : true }],
  },
  {
    id: "investments",
    fields: [
      { field: "currentInvestmentAmount", label: "Investment amount recorded", filled: (p) => p.currentInvestmentAmount > 0 },
      { field: "investmentAllocation", label: "Investment allocation recorded", filled: (p) => Object.keys(p.investmentAllocation).length > 0 },
      { field: "riskTolerance", label: "Risk tolerance recorded", filled: (p) => p.riskTolerance !== null },
    ],
  },
  {
    id: "foreignIncome",
    fields: [{ field: "hasForeignIncome", label: "Foreign income recorded", filled: (p) => (p.hasForeignIncome ? p.foreignIncomeAmount > 0 : true) }],
  },
  {
    id: "goals",
    fields: [{ field: "goals", label: "Financial goals configured", filled: (p) => p.goals.length > 0 }],
  },
];

export function getSectionCompletionPct(sectionId: ProfileSectionId, profile: EconomicProfile): number {
  const section = SECTIONS.find((s) => s.id === sectionId);
  if (!section || section.fields.length === 0) return 0;
  const filledCount = section.fields.filter((f) => f.filled(profile)).length;
  return Math.round((filledCount / section.fields.length) * 100);
}

export function getAllSectionCompletionPct(profile: EconomicProfile): Record<ProfileSectionId, number> {
  return Object.fromEntries(SECTIONS.map((s) => [s.id, getSectionCompletionPct(s.id, profile)])) as Record<ProfileSectionId, number>;
}

/** Overall completion, weighted by the 5 mandatory fields plus every optional field across every section — mandatory fields count double, so completing the base 5-field set alone already shows meaningful progress. */
export function getOverallCompletionPct(profile: EconomicProfile): number {
  const allFields = SECTIONS.flatMap((s) => s.fields);
  let earned = 0;
  let total = 0;
  for (const f of allFields) {
    const weight = (MANDATORY_FIELDS as string[]).includes(f.field as string) ? 2 : 1;
    total += weight;
    if (f.filled(profile)) earned += weight;
  }
  return total > 0 ? Math.round((earned / total) * 100) : 0;
}

export interface SectionOutcome {
  complete: boolean;
  /** Distinct tools reading any of this section's still-missing fields — "Unlocks N tools" framing for Section B1, replacing a bare percentage. */
  unlocksToolCount: number;
}

/** Outcome framing instead of a raw percentage (Section B1): a section is either done (green check) or tells you what finishing it actually unlocks, reusing the same Tool Field Registry getAffectedTools() already powers the "affects N tools" hints — never a second hand-kept mapping. */
export function getSectionOutcome(sectionId: ProfileSectionId, profile: EconomicProfile): SectionOutcome {
  const section = SECTIONS.find((s) => s.id === sectionId);
  if (!section) return { complete: true, unlocksToolCount: 0 };
  const missing = section.fields.filter((f) => !f.filled(profile));
  if (missing.length === 0) return { complete: true, unlocksToolCount: 0 };
  const toolIds = new Set<string>();
  for (const f of missing) {
    for (const tool of getAffectedTools(f.field)) toolIds.add(tool.toolId);
  }
  return { complete: false, unlocksToolCount: toolIds.size };
}

export interface ProfileHealthChecklistItem {
  label: string;
  status: "complete" | "missing";
}

/** A ✓/⚠ checklist view over the same per-field completion data computed above — no second calculation, just a different presentation of it. */
export function getProfileHealthChecklist(profile: EconomicProfile): ProfileHealthChecklistItem[] {
  return SECTIONS.flatMap((s) => s.fields).map((f) => ({ label: f.label, status: f.filled(profile) ? "complete" : "missing" }));
}

export { isMandatoryComplete };
