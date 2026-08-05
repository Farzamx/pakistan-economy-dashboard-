// Data Provenance — a small typed record of where each input to a
// calculation came from. Two consumers of the same array, never two
// systems: ExplainTheMath renders it as a sourced-values table, and
// confidenceEngine.ts derives usesOfficialData/manualEstimateCount from
// it automatically instead of each tool computing those flags by hand.
// Complementary to DataFreshnessBadge (answers *when*/*how often*) —
// this answers *where each number came from*.
export type ProvenanceSource = "profile" | "official-cpi" | "sbp" | "yahoo-finance" | "manual-estimate" | "assumption";

export interface ProvenanceEntry {
  label: string;
  value: string;
  source: ProvenanceSource;
}

export const PROVENANCE_SOURCE_LABEL: Record<ProvenanceSource, string> = {
  profile: "Economic Profile",
  "official-cpi": "PBS CPI",
  sbp: "SBP",
  "yahoo-finance": "Yahoo Finance",
  "manual-estimate": "Manual Estimate",
  assumption: "Assumption",
};
