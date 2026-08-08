import MarketingNav from "@/components/marketing/MarketingNav";
import Hero from "@/components/marketing/Hero";
import HeroBackground from "@/components/marketing/HeroBackground";
import WhatPeicDoes from "@/components/marketing/sections/WhatPeicDoes";
import DecisionSupportLabSection from "@/components/marketing/sections/DecisionSupportLabSection";
import InsidePlatformSection from "@/components/marketing/sections/InsidePlatformSection";
import DataSourcesSection from "@/components/marketing/sections/DataSourcesSection";
import ClosingCta from "@/components/marketing/sections/ClosingCta";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import type { TapeCell } from "@/components/marketing/LiveIndicatorTape";
import { getAllSbpIndicators } from "@/lib/data/sbpServer";
import { getNetLiquidReserves } from "@/lib/data/fxReserves";
import { getFxRates } from "@/lib/data/fxRates";
import { getLastTradingDay } from "@/lib/marketCalendar";
import { marketingFontVariables } from "@/lib/marketingFonts";
import type { Kpi } from "@/data/kpiData";
import type { SbpIndicatorResult } from "@/lib/data/sbp";

/** "DD MMM" (or the bare year for an annual series) — the tape's own honesty anchor, so it's always a real date, never blank or "just now". */
function formatAsOf(dateStr?: string): string {
  if (!dateStr) return "date unavailable";
  if (dateStr.length === 4) return dateStr;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "MMM YYYY" — Remittances' own cadence (monthly) is coarser than the other cells' daily-ish "DD MMM", so its date stamp says so rather than implying a precision the source doesn't have. */
function formatMonthYear(dateStr?: string): string {
  if (!dateStr) return "date unavailable";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatDayMonth(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * The tape's own normalized change-line shape: "<delta> vs <DD MMM>" — no
 * year, no comparison-label clause. Each underlying Kpi.change string
 * already bakes in a human-readable comparison, but the exact date shape
 * differs per source (see the three cell builders below); this extracts the
 * delta portion and rebuilds a consistent "vs DD MMM" suffix. Falls back to
 * the original string untouched when there's no " vs " to split on at all
 * (the underlying builders' own "no prior data" / no-diff case) — never
 * fabricates a delta or a date that isn't there.
 */
function withNormalizedChange(rawChange: string, previousDate: Date | null): string {
  if (!rawChange.includes(" vs ")) return rawChange;
  const deltaPrefix = rawChange.split(" vs ")[0];
  if (!previousDate || Number.isNaN(previousDate.getTime())) return deltaPrefix;
  return `${deltaPrefix} vs ${formatDayMonth(previousDate)}`;
}

/**
 * CPI's own kpi.change (buildCpiInflationKpi in sbp.ts) already compares the
 * latest YoY inflation reading against last month's YoY reading — that IS
 * the correct comparison (confirmed by tracing the builder: not a bug), but
 * its date label (formatMonthLabel: "MMM YYYY") never carried a day, since
 * the underlying series has no day-level date of its own beyond "the
 * reference month." SBP EasyData dates every monthly CPI observation at
 * that month's last calendar day (verified against the live meta endpoint
 * during Phase 6A), so "last day of the month before the latest
 * observation" is a real, derived date — never invented — computed here
 * from meta.observationDate alone, with no change to sbp.ts.
 */
function toCpiTapeCell(cpi: SbpIndicatorResult): TapeCell {
  const { kpi, meta } = cpi;
  const value = parseFloat(kpi.value);
  const decimals = kpi.value.split(".")[1]?.length ?? 1;
  const direction: TapeCell["direction"] = kpi.trend === "up" ? "up" : kpi.trend === "down" ? "down" : "flat";

  const latest = new Date(meta.observationDate);
  const previousMonthEnd = Number.isNaN(latest.getTime())
    ? null
    : new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth(), 0));

  return {
    label: "CPI (YoY)",
    value: Number.isNaN(value) ? 0 : value,
    unit: kpi.unit,
    decimals,
    direction,
    changeLabel: withNormalizedChange(kpi.change, previousMonthEnd),
    asOf: formatAsOf(meta.observationDate),
  };
}

/** Policy Rate's change string is already "<delta> vs DD Mon YYYY" (formatDayMonthLabel) — just the trailing year needs stripping. */
function toPolicyRateTapeCell(kpi: Kpi): TapeCell {
  const value = parseFloat(kpi.value);
  const decimals = kpi.value.split(".")[1]?.length ?? 1;
  const direction: TapeCell["direction"] = kpi.trend === "up" ? "up" : kpi.trend === "down" ? "down" : "flat";
  return {
    label: "SBP Policy Rate",
    value: Number.isNaN(value) ? 0 : value,
    unit: kpi.unit,
    decimals,
    direction,
    changeLabel: kpi.change.replace(/ \d{4}$/, ""),
    asOf: formatAsOf(kpi.latestDate),
  };
}

/** FX Reserves' change string is already "<delta> vs DD Mon 'YY" (formatWeekLabel) — just the trailing apostrophe-year needs stripping. */
function toReservesTapeCell(kpi: Kpi): TapeCell {
  const value = parseFloat(kpi.value);
  const decimals = kpi.value.split(".")[1]?.length ?? 1;
  const direction: TapeCell["direction"] = kpi.trend === "up" ? "up" : kpi.trend === "down" ? "down" : "flat";
  return {
    label: "FX Reserves (SBP)",
    value: Number.isNaN(value) ? 0 : value,
    unit: kpi.unit,
    decimals,
    direction,
    changeLabel: kpi.change.replace(/ '\d{2}$/, ""),
    asOf: formatAsOf(kpi.latestDate),
  };
}

/**
 * PKR/USD's own kpi.change bakes "vs prev close · interbank <date>" into
 * one clause with no comparison delta shown for its date, and a bare
 * number with a "PKR" unit glued on. Rebuilt here: bare number (the label
 * "PKR/USD" already says what it is), the delta against the previous
 * trading day (reusing marketCalendar.ts's own weekend/holiday-aware
 * getLastTradingDay — the same helper the rest of the app already uses for
 * FX/market freshness, not new date math), and "interbank" moved onto the
 * as-of line instead of the change line.
 */
function toUsdPkrTapeCell(kpi: Kpi): TapeCell {
  const value = parseFloat(kpi.value);
  const decimals = kpi.value.split(".")[1]?.length ?? 1;
  const direction: TapeCell["direction"] = kpi.trend === "up" ? "up" : kpi.trend === "down" ? "down" : "flat";

  const latest = kpi.latestDate ? new Date(kpi.latestDate) : null;
  let previousTradingDay: Date | null = null;
  if (latest && !Number.isNaN(latest.getTime())) {
    const dayBefore = new Date(latest);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    previousTradingDay = new Date(getLastTradingDay(dayBefore));
  }

  return {
    label: "PKR/USD",
    value: Number.isNaN(value) ? 0 : value,
    unit: "",
    decimals,
    direction,
    changeLabel: withNormalizedChange(kpi.change, previousTradingDay),
    asOf: `${formatAsOf(kpi.latestDate)} · interbank`,
  };
}

/**
 * Remittances' own kpi.change is a month-over-month comparison (see
 * buildRemittancesKpi in sbp.ts) — the tape cell shows a year-over-year
 * change instead, computed here from the same 24-month trend series every
 * other Remittances chart in the app already reads (sbp.remittances.trend),
 * never a second fetch or a fabricated figure.
 */
function toRemittancesTapeCell(remittances: SbpIndicatorResult): TapeCell {
  const { kpi, trend, meta } = remittances;
  const value = parseFloat(kpi.value);
  const decimals = kpi.value.split(".")[1]?.length ?? 1;

  const latest = trend[trend.length - 1]?.value;
  const yearAgo = trend.length >= 13 ? trend[trend.length - 13].value : undefined;
  const yoyPct = latest !== undefined && yearAgo !== undefined && yearAgo !== 0 ? ((latest - yearAgo) / yearAgo) * 100 : null;
  const direction: TapeCell["direction"] = yoyPct === null ? "flat" : yoyPct > 0 ? "up" : yoyPct < 0 ? "down" : "flat";
  const changeLabel = yoyPct === null ? "YoY unavailable" : `${yoyPct >= 0 ? "+" : ""}${yoyPct.toFixed(1)}% YoY`;

  return {
    // Rendered as "REMITTANCES (MONTHLY)" — LiveIndicatorTape's label span
    // is CSS uppercase, matching every other cell's title-case source string.
    label: "Remittances (Monthly)",
    value: Number.isNaN(value) ? 0 : value,
    unit: kpi.unit,
    decimals,
    direction,
    changeLabel,
    asOf: formatMonthYear(meta.observationDate),
  };
}

/**
 * The marketing landing page's actual content — one component rendered by
 * both "/" (first-time visitors) and "/home" (the permanent, never-redirects
 * link back to it — see the returning-visitor routing in src/proxy.ts).
 * Keeping this as a single shared component, rather than duplicating markup
 * across the two route files, is what keeps them guaranteed identical.
 */
export default async function LandingPage() {
  const [sbp, netLiquidReserves, fxRates] = await Promise.all([
    getAllSbpIndicators(),
    getNetLiquidReserves(),
    getFxRates(),
  ]);

  // Every cell reuses the exact same fetchers the authenticated Overview
  // dashboard and its live ticker already call — no second data path.
  // Remittances replaces the equities cell that used to sit here (a Pakistan
  // ETF proxy, since the real KSE-100 needs a commercial PSX license): that
  // proxy's data was routinely ~7 weeks stale, which defeats the point of a
  // strip whose whole job is proving data currency. Remittances is a
  // genuinely current, official SBP figure with no such gap.
  const tapeCells: TapeCell[] = [
    toCpiTapeCell(sbp.cpiInflation),
    toPolicyRateTapeCell(sbp.policyRate.kpi),
    toUsdPkrTapeCell(fxRates.usdPkr),
    toReservesTapeCell(netLiquidReserves.kpi),
    toRemittancesTapeCell(sbp.remittances),
  ];

  return (
    <div className={`${marketingFontVariables} marketing-theme min-h-screen w-full`}>
      {/* Rendered once here, position:fixed — every section below sits on
          this same living background as the page scrolls, not just the
          hero. See HeroBackground.tsx's header comment for why. */}
      <HeroBackground />
      <div className="relative z-10">
        <MarketingNav />
        <main>
          <Hero tapeCells={tapeCells} />
          <WhatPeicDoes />
          <DecisionSupportLabSection />
          <InsidePlatformSection cpi={sbp.cpiInflation} policyRate={sbp.policyRate} />
          <DataSourcesSection />
          <ClosingCta />
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}
