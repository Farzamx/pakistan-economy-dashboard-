// The 26 PBS CPI ledger series, as plain constants — and nothing else.
//
// This is the single definition of which ledger keys exist, which SDMX code each carries, and what kind it is.
// It was moved out of pbsCpiGroupsAdapter.ts (Phase F.2f), which re-exports every name here unchanged, so that the
// freshness registry and the ingestion monitor can name the keys WITHOUT importing the adapter (an XML parser, the
// validation code and the orchestrator types). The registry sits in a module chain that reaches client bundles
// (sbp.ts -> seriesRegistry.ts); it must stay light. A test pins that the adapter's exports ARE these objects.
//
// No behaviour here; no I/O; no dependency.

export const PBS_SDMX_PROVIDER_ID = "pbs-sdmx";

/** PBS publishes 12 expenditure groups. (pbsGroups.ts's CPI_GROUP_COUNT is the same number; a test pins that.) */
export const PBS_CPI_GROUP_COUNT = 12;

export type PbsSeriesKind = "headlineIndex" | "groupIndex" | "groupWeight" | "weightTotal";

export interface PbsSeriesDefinition {
  /** Ledger key, e.g. "pbs:cpiGroupIndex07". */
  indicatorKey: string;
  /** The SDMX INDICATOR code in the file, e.g. "PCPI_CP_07_IX". */
  sdmxIndicator: string;
  kind: PbsSeriesKind;
  /** 1–12 for group series. */
  groupNo?: number;
}

const nn = (n: number) => String(n).padStart(2, "0");

/** The 26 series, in a fixed order. */
export const PBS_CPI_SERIES: readonly PbsSeriesDefinition[] = [
  { indicatorKey: "pbs:cpiIndexNational", sdmxIndicator: "PCPI_IX", kind: "headlineIndex" },
  ...Array.from({ length: PBS_CPI_GROUP_COUNT }, (_, i): PbsSeriesDefinition => ({ indicatorKey: `pbs:cpiGroupIndex${nn(i + 1)}`, sdmxIndicator: `PCPI_CP_${nn(i + 1)}_IX`, kind: "groupIndex", groupNo: i + 1 })),
  ...Array.from({ length: PBS_CPI_GROUP_COUNT }, (_, i): PbsSeriesDefinition => ({ indicatorKey: `pbs:cpiGroupWeight${nn(i + 1)}`, sdmxIndicator: `PCPI_CP_${nn(i + 1)}_WT`, kind: "groupWeight", groupNo: i + 1 })),
  { indicatorKey: "pbs:cpiWeightTotal", sdmxIndicator: "PCPI_WT", kind: "weightTotal" },
];

export const PBS_CPI_INDICATOR_KEYS: readonly string[] = PBS_CPI_SERIES.map((s) => s.indicatorKey);
