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
import { getQuarterlyGdpKpi } from "@/lib/data/quarterlyGdp";
import type { DatasetDefinition } from "./datasetRegistry";
import { FREQUENCY_LABEL, quarterLabelToEndDate, resolveFrequency, sortChronologically } from "./datasetFrequency";

export interface DatasetRow {
  /** The period label exactly as the source expresses it — never reformatted. */
  period: string;
  value: number;
  /** The source's own wording for the period where it differs from `period` (a quarterly series: period "2026-03-31", label "Q3 FY26"). */
  label?: string;
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
  /** Set when the declared frequency was corrected because the observation dates show another cadence (so a file never labels a row with a frequency its dates contradict). */
  frequencyNote?: string;
  /** Set when the series could not be loaded at all. */
  error?: string;
  /** Present only when a date range was applied (see applyDateRange): what was asked for and what the series holds in full. */
  selection?: { from?: string; to?: string; fullCoverage: string | null; fullObservations: number };
}

/** "2025-06-30" -> "FY2025". Pakistan's fiscal year ends 30 June. */
function toFiscalYearLabel(date: string): string {
  const [year, month] = date.split("-");
  return Number(month) === 6 ? `FY${year}` : date;
}

/**
 * A series as the source publishes it, in chronological order. Order is normalised here, once, so every consumer (page, workbook, CSV) agrees; the
 * values and periods themselves are never touched.
 */
export async function loadDataset(def: DatasetDefinition): Promise<LoadedDataset> {
  const loaded = await loadRaw(def);
  const rows = sortChronologically(loaded.rows);
  // A declared frequency is a claim; the observation dates are the evidence. If they clearly disagree (e.g. a series declared weekly that holds one point
  // a month, as a stored snapshot can), the series is filed, labelled and exported under the cadence it actually has, and the file says why.
  const resolved = resolveFrequency(loaded.frequency, rows.map((r) => r.period));
  if (resolved.mismatch && resolved.observed && resolved.declared) {
    const note = `The source declares this series as ${FREQUENCY_LABEL[resolved.declared].toLowerCase()}, but its observations are spaced ${FREQUENCY_LABEL[resolved.observed].toLowerCase()}, so it is filed and labelled as ${FREQUENCY_LABEL[resolved.observed].toLowerCase()}.`;
    return { ...loaded, rows, frequency: FREQUENCY_LABEL[resolved.observed], frequencyNote: note };
  }
  return { ...loaded, rows };
}

async function loadRaw(def: DatasetDefinition): Promise<LoadedDataset> {
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
      case "qgdp": {
        const q = await getQuarterlyGdpKpi();
        const rows: DatasetRow[] = [];
        for (const point of q.trend) {
          // The source's own quarter label ("Q3 FY26") becomes its quarter-END date; the label is kept beside it.
          const end = quarterLabelToEndDate(point.month);
          if (end) rows.push({ period: end, value: point.value, label: point.month });
        }
        return {
          ...base,
          rows,
          unit: "Percent (YoY)",
          source: "SBP / PBS (QGDP.xlsx)",
          frequency: "Quarterly",
          // The loader falls back to a stored snapshot when SBP's file cannot be read; the file says so rather than passing it off as live.
          freshnessState: q.isFallback ? "Stored snapshot (live SBP file unavailable)" : undefined,
          ...(rows.length === 0 ? { error: "The quarterly GDP series could not be read." } : {}),
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
