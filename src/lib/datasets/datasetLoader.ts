import "server-only";

// Loads a catalogue entry's observations through the project's EXISTING
// canonical data functions. No new provider, no new fetch path, and no
// bypass of the caches those functions already apply — a download reuses
// exactly the series the corresponding indicator page renders.

import { getSbpIndicatorHistory } from "@/lib/data/sbpServer";
import type { SbpIndicatorKey } from "@/lib/data/sbp";
import { getSpiHistory } from "@/lib/data/spi";
import { getGdpGrowthHistory, type WorldBankCountryCode } from "@/lib/data/worldBank";
import { getFedFundsHistory, getUs10yHistory, getUsCpiInflationHistory } from "@/lib/data/fred";
import type { DatasetDefinition } from "./datasetRegistry";

export interface DatasetRow {
  /** The period label exactly as the source expresses it — never reformatted. */
  period: string;
  value: number;
  /** Extra published columns (e.g. SPI's own WoW/YoY), kept only when the source itself provides them. */
  extra?: Record<string, number>;
}

export interface LoadedDataset {
  definition: DatasetDefinition;
  rows: DatasetRow[];
  unit: string;
  source: string;
  frequency: string;
  /** Column headers for `extra`, in order. */
  extraColumns: string[];
  /** The freshness state this project already computed, when the source carries one. */
  freshnessState?: string;
  /** Set when the series could not be loaded at all. */
  error?: string;
}

/** "2025-06-30" -> "FY2025". Pakistan's fiscal year ends 30 June. */
function toFiscalYearLabel(date: string): string {
  const [year, month] = date.split("-");
  return Number(month) === 6 ? `FY${year}` : date;
}

export async function loadDataset(def: DatasetDefinition): Promise<LoadedDataset> {
  const base: Omit<LoadedDataset, "rows" | "unit" | "source" | "frequency"> = { definition: def, extraColumns: [] };
  try {
    switch (def.kind) {
      case "sbp": {
        const h = await getSbpIndicatorHistory(def.sourceKey as SbpIndicatorKey);
        return {
          ...base,
          rows: h.points.map((p) => ({
            period: def.periodKind === "fiscalYear" ? toFiscalYearLabel(p.date) : p.date,
            value: p.value,
          })),
          // displayUnit, NOT meta.unit: the points above are already
          // unit-converted by the indicator's toTrendValue, while meta.unit
          // is the SOURCE unit SBP reports ("Million USD"). Exporting the
          // converted value under the source unit understated every scaled
          // series by 1000x or 1e6x — a current-account figure of -0.356
          // labelled "Million USD" reads as -$356 thousand rather than
          // -$356 million.
          unit: h.displayUnit,
          source: h.meta.source,
          frequency: h.meta.frequency,
          freshnessState: h.meta.freshness?.state,
        };
      }
      case "spi": {
        const spi = await getSpiHistory();
        if (!spi) return { ...base, rows: [], unit: "Index (2015-16=100)", source: "PBS", frequency: "Weekly", error: "The PBS weekly release could not be read." };
        return {
          ...base,
          rows: spi.points.map((p) => ({ period: p.date, value: p.value, extra: { "WoW %": p.wowPct, "YoY %": p.yoyPct } })),
          unit: "Index (2015-16=100)",
          source: "PBS",
          frequency: "Weekly",
          extraColumns: ["WoW %", "YoY %"],
        };
      }
      case "worldbank-gdp": {
        const h = await getGdpGrowthHistory(def.sourceKey as WorldBankCountryCode);
        if (!h) return { ...base, rows: [], unit: "Percent", source: "World Bank", frequency: "Annual", error: "The World Bank series could not be read." };
        return {
          ...base,
          rows: h.history.map((p) => ({ period: p.month, value: p.value })),
          unit: "Percent",
          source: "World Bank (NY.GDP.MKTP.KD.ZG)",
          frequency: "Annual",
        };
      }
      case "fred": {
        const fn = def.sourceKey === "fedFunds" ? getFedFundsHistory : def.sourceKey === "us10y" ? getUs10yHistory : getUsCpiInflationHistory;
        const h = await fn();
        if (!h) return { ...base, rows: [], unit: "Percent", source: "FRED", frequency: "Monthly", error: "The FRED series could not be read." };
        return {
          ...base,
          rows: h.map((p) => ({ period: p.date, value: p.value })),
          unit: "Percent",
          source: "FRED (St. Louis Fed)",
          frequency: "Monthly",
        };
      }
    }
  } catch (err) {
    return {
      ...base,
      rows: [],
      unit: "—",
      source: "—",
      frequency: "—",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
