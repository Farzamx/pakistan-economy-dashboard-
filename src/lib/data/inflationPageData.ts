// Loads everything the upgraded Inflation page needs, through the EXISTING
// providers, and hands it to the pure view-model builder.
//
//   headline / core KPI + history  -> getSbpIndicator / getSbpIndicatorHistory
//                                     (sbpServer: canonical ledger + PBS override,
//                                     so charts and KPI cards share one latest point)
//   urban food history             -> getFoodInflationUrbanHistory (canonical ledger)
//   policy-rate decisions          -> getSbpIndicatorHistory("policyRate")
//   CPI index level                -> getCpiMonthlyIndexSeries (cpi_monthly_index)
//   latest category snapshot       -> getLatestCpiCategoryBreakdown (cpi_category_breakdown)
//   group indices + weights        -> resolveCpiGroupPanel: the PEIC observation LEDGER first,
//                                     PBS's SDMX file (validated) as the fallback — one
//                                     source's whole panel, never a mixture
//                                     (cpiGroupPanelSource.ts / panelSource.ts)
//   ingestion run history          -> getCronRunHistory (cron_run_log), shown as ONE of six
//                                     separate freshness facts (groupSource.ts)
//   international annual inflation -> getWorldBankInflation (World Bank, one indicator)
//
// No new provider, credential, table or RPC. Every source is isolated: one that
// fails is reported as absent (null), and the sections that need it show a
// labelled "unavailable" state. The one deliberate exception is the pair of
// REQUIRED inputs at RUNTIME — the CPI group panel (from EITHER the ledger or PBS)
// and the World Bank: if either has no usable source there, this throws on purpose
// so Next keeps the last good page rather than replacing it with a degraded one.
// Using the PBS fallback is NOT a failure; having neither source is. During
// `next build` (and local development) it degrades instead. See providerFailurePolicy.ts.

import "server-only";
import { getSbpIndicator, getSbpIndicatorHistory, getFoodInflationUrbanHistory } from "@/lib/data/sbpServer";
import { getCpiMonthlyIndexSeries } from "@/lib/data/cpiMonthlyIndex";
import { getLatestCpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import { CPI_INGESTION_JOB_NAME, CPI_RUN_STALE_AFTER_HOURS, resolveCpiGroupPanel } from "@/lib/data/cpiGroupPanelSource";
import { getWorldBankInflation, INFLATION_COUNTRIES } from "@/lib/data/worldBankInflation";
import { enforceProviderPolicy, failureModeFor } from "@/lib/data/providerFailurePolicy";
import { getCronRunHistory } from "@/lib/cronLogging";
import { evaluateCpiRunEvidence } from "@/lib/cpiIngestionMonitor";
import { buildGroupSourceInfo } from "@/lib/inflation/groupSource";
import { evaluateRequiredProviders } from "@/lib/inflation/providerHealth";
import { buildInflationViewModel, type InflationViewModel } from "@/lib/inflation/viewModel";
import type { SbpIndicatorResult } from "@/lib/data/sbp";

export interface InflationPageData {
  /** The existing, unchanged KPI results (value, change, freshness) — never recomputed for presentation. */
  headlineKpi: SbpIndicatorResult;
  coreKpi: SbpIndicatorResult | null;
  model: InflationViewModel;
}

async function settle<T>(label: string, work: Promise<T>): Promise<T | null> {
  try {
    return await work;
  } catch (err) {
    console.error(`[InflationPage] ${label} failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function loadInflationPageData(): Promise<InflationPageData> {
  const [headlineKpi, coreKpi, headlineHist, coreHist, foodHist, policyHist, index, snapshot, selection, runHistory, intl] = await Promise.all([
    getSbpIndicator("cpiInflation"), // the page cannot render without its headline KPI; this has its own fallback chain
    settle("core KPI", getSbpIndicator("coreInflation")),
    settle("headline history", getSbpIndicatorHistory("cpiInflation")),
    settle("core history", getSbpIndicatorHistory("coreInflation")),
    settle("urban food history", getFoodInflationUrbanHistory()),
    settle("policy rate history", getSbpIndicatorHistory("policyRate")),
    settle("CPI index", getCpiMonthlyIndexSeries()),
    settle("category snapshot", getLatestCpiCategoryBreakdown()),
    resolveCpiGroupPanel(), // never throws: the ledger read and the PBS fetch each report failure in their result
    settle("ingestion run history", getCronRunHistory(CPI_INGESTION_JOB_NAME, 50)), // a read failure comes back as an empty list
    getWorldBankInflation(), // never throws
  ]);

  const generatedAt = new Date();
  const groupSource = buildGroupSourceInfo(
    selection.note,
    evaluateCpiRunEvidence(runHistory ?? [], generatedAt, { staleAfterHours: CPI_RUN_STALE_AFTER_HOURS }),
    generatedAt.toISOString(),
  );

  const model = buildInflationViewModel({
    headline: headlineHist?.points ?? null,
    core: coreHist?.points ?? null,
    food: foodHist?.points ?? null,
    index,
    policy: policyHist?.points ?? null,
    panel: selection.panel,
    panelIssues: selection.issues,
    groupSource,
    snapshot,
    intl,
  });

  // The two REQUIRED inputs (the CPI group panel, the World Bank) are decided here, once:
  //   build / dev  -> carry on; the sections render their labelled
  //                   "unavailable" states;
  //   runtime      -> throw, so Next keeps serving the last good page instead of
  //                   replacing it with a degraded one (see providerFailurePolicy.ts).
  // The panel counts as available if EITHER the ledger or PBS supplied a valid one
  // (selection.panel is null only when both could not). The other ledger-backed
  // sources above keep their own fallback chains, and the canonical KPI values and
  // freshness badges still come from them.
  const failures = evaluateRequiredProviders({
    panelLoaded: selection.panel !== null,
    panelIssues: selection.issues,
    groupsBuilt: model.groups !== null,
    intl,
    expectedCountries: INFLATION_COUNTRIES.map((c) => c.code),
  });
  if (failures.length > 0) {
    const mode = failureModeFor();
    console.error(`[InflationPage] required provider unavailable (${mode === "throw" ? "regeneration refused, last good page stays" : "rendering the unavailable state"}): ${failures.map((f) => `${f.provider}: ${f.reason}`).join(" | ")}`);
    enforceProviderPolicy(failures, mode);
  }

  return { headlineKpi, coreKpi, model };
}
