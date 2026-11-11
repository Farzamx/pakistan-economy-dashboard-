// Loads everything the upgraded Interest Rate page needs, through the EXISTING providers, and hands it to the pure view-model builder.
//
//   policy-rate KPI (value, change, freshness)  -> getSbpIndicator("policyRate")        the existing canonical KPI, unchanged
//   policy-rate history (every observation)     -> getSbpIndicatorHistory("policyRate") the PEIC canonical ledger (SBP EasyData series)
//   headline and core inflation (for real rates)-> getSbpIndicatorHistory("cpiInflation" | "coreInflation")
//   3M T-bill and 3Y PIB auction yields         -> getSbpIndicatorHistory("tbillYield3m" | "pibYield3y")      market rates, kept apart
//   US effective federal funds rate (monthly)   -> getFedFundsHistory                    the one comparable international series held
//
// No new provider, credential, table or RPC. Every OPTIONAL source is isolated: one that fails is reported as absent (null) and the
// section that needs it says so. The one REQUIRED input is the policy-rate history itself, and it follows the same last-good-page
// rule as the Inflation page (src/lib/data/providerFailurePolicy.ts):
//   - the history loader falls back to a short static snapshot (monthly points, not decision dates) when the ledger has no rows; that
//     snapshot cannot support change, cycle or real-rate analysis, so it counts as "the required source is unavailable";
//   - at production runtime that REFUSES to regenerate, so Next keeps serving the previous good page;
//   - during `next build` and local development it degrades to a labelled "unavailable" state instead of failing the deploy.

import "server-only";
import { getSbpIndicator, getSbpIndicatorHistory } from "@/lib/data/sbpServer";
import { getFedFundsHistory } from "@/lib/data/fred";
import { enforceProviderPolicy, failureModeFor } from "@/lib/data/providerFailurePolicy";
import type { ProviderFailure } from "@/lib/inflation/providerHealth";
import { buildPolicyRateViewModel, type PolicyRateViewModel, type PolicySourceInfo } from "@/lib/policyRate/viewModel";
import type { SbpIndicatorHistory, SbpIndicatorResult } from "@/lib/data/sbp";

export const POLICY_RATE_PAGE_NAME = "Interest Rate page";

export interface PolicyRatePageData {
  /** The existing, unchanged KPI result (value, change, freshness): never recomputed for presentation. */
  kpi: SbpIndicatorResult;
  model: PolicyRateViewModel;
  /** ISO timestamp of this render: shown as "page generated"; the page is regenerated at most hourly. */
  generatedAt: string;
}

async function settle<T>(label: string, work: Promise<T>): Promise<T | null> {
  try {
    return await work;
  } catch (err) {
    console.error(`[InterestRatePage] ${label} failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** What the history's meta says about where it came from. Pure; exported for tests. */
export function sourceInfoFrom(history: SbpIndicatorHistory | null): PolicySourceInfo {
  if (!history || history.points.length === 0) {
    return { status: "unavailable", seriesKey: null, seriesName: null, latestObservation: null, lastStoredAt: null, observations: 0 };
  }
  const meta = history.meta;
  return {
    status: meta.sourceStatus === "fallback" ? "fallback" : "ledger",
    seriesKey: meta.seriesKey ?? null,
    seriesName: meta.seriesName ?? null,
    latestObservation: meta.observationDate ?? null,
    lastStoredAt: meta.lastUpdated ?? null,
    observations: history.points.length,
  };
}

export async function loadPolicyRatePageData(): Promise<PolicyRatePageData> {
  const [kpi, policyHist, headlineHist, coreHist, tbillHist, pibHist, fedFunds] = await Promise.all([
    getSbpIndicator("policyRate"), // the page cannot render without its headline KPI; it has its own fallback chain
    settle("policy-rate history", getSbpIndicatorHistory("policyRate")),
    settle("headline inflation history", getSbpIndicatorHistory("cpiInflation")),
    settle("core inflation history", getSbpIndicatorHistory("coreInflation")),
    settle("T-bill yield history", getSbpIndicatorHistory("tbillYield3m")),
    settle("PIB yield history", getSbpIndicatorHistory("pibYield3y")),
    settle("federal funds history", getFedFundsHistory("2016-01-01")), // returns null on failure
  ]);

  const generatedAt = new Date().toISOString();
  const source = sourceInfoFrom(policyHist);
  const kpiNumber = Number(kpi.kpi.value);

  const model = buildPolicyRateViewModel({
    // The static fallback snapshot is NOT analysed: it is monthly points, not rate-change dates.
    policy: source.status === "ledger" ? (policyHist?.points ?? null) : null,
    headline: headlineHist?.points ?? null,
    core: coreHist?.points ?? null,
    tbill: tbillHist?.points ?? null,
    pib: pibHist?.points ?? null,
    fedFunds,
    kpiValue: Number.isFinite(kpiNumber) ? kpiNumber : null,
    asOf: generatedAt.slice(0, 10),
    source,
  });

  const failures: ProviderFailure[] = [];
  if (source.status !== "ledger" || model.stats === null) {
    failures.push({
      provider: "SBP policy-rate ledger",
      reason: source.status === "fallback" ? "The ledger returned no observations, so only the static fallback snapshot was available." : "No policy-rate observations were returned.",
    });
  }
  if (failures.length > 0) {
    const mode = failureModeFor();
    console.error(`[InterestRatePage] required source unavailable (${mode === "throw" ? "regeneration refused, last good page stays" : "rendering the unavailable state"}): ${failures.map((f) => `${f.provider}: ${f.reason}`).join(" | ")}`);
    enforceProviderPolicy(failures, mode, POLICY_RATE_PAGE_NAME);
  }

  return { kpi, model, generatedAt };
}
