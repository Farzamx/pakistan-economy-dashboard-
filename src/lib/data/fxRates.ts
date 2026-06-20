// Live interbank exchange rates — PKR cross-pairs.
// Source: ExchangeRate-API v4 free tier (https://api.exchangerate-api.com)
// No API key required. Updates multiple times per day.
//
// USD/PKR is the direct rate; EUR/PKR, GBP/PKR, SAR/PKR are computed as
// cross-rates: rates.PKR / rates.XXX
//
// This is the LIVE market / interbank rate, distinct from the SBP monthly
// average shown in the historical trend chart (sbp.ts → usdPkr series).

import type { Kpi } from "@/data/kpiData";

const ER_API_URL = "https://api.exchangerate-api.com/v4/latest/USD";
const REVALIDATE = 60 * 60; // 1h — API updates multiple times per day

// fetch() has no default timeout — without this, a stalled connection hangs
// for undici's ~5 minute default (or blocks `next build` static generation)
// instead of falling into the existing try/catch error handling.
const FETCH_TIMEOUT_MS = 10_000;

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

interface ExchangeRateResponse {
  base: string;
  date: string;
  time_last_updated: number;
  rates: Record<string, number>;
}

export interface FxRateKpis {
  usdPkr: Kpi;
  eurPkr: Kpi;
  gbpPkr: Kpi;
  sarPkr: Kpi;
}

// Fallback snapshot — 2026-06-16 indicative interbank rates
const FALLBACK_RATES: FxRateKpis = {
  usdPkr: {
    title: "USD / PKR",
    value: "278.38",
    unit: "PKR",
    change: "live rate unavailable",
    trend: "up",
    glow: "blue",
    source: "ExchangeRate-API",
    latestDate: "2026-06-16",
    frequency: "Hourly",
  },
  eurPkr: {
    title: "EUR / PKR",
    value: "322.99",
    unit: "PKR",
    change: "live rate unavailable",
    trend: "up",
    glow: "blue",
    source: "ExchangeRate-API",
    latestDate: "2026-06-16",
    frequency: "Hourly",
  },
  gbpPkr: {
    title: "GBP / PKR",
    value: "373.67",
    unit: "PKR",
    change: "live rate unavailable",
    trend: "up",
    glow: "purple",
    source: "ExchangeRate-API",
    latestDate: "2026-06-16",
    frequency: "Hourly",
  },
  sarPkr: {
    title: "SAR / PKR",
    value: "74.23",
    unit: "PKR",
    change: "live rate unavailable",
    trend: "up",
    glow: "purple",
    source: "ExchangeRate-API",
    latestDate: "2026-06-16",
    frequency: "Hourly",
  },
};

function makeKpi(
  title: string,
  amountPkr: number,
  updatedDate: string,
  glow: Kpi["glow"],
): Kpi {
  const [year, month, day] = updatedDate.split("-");
  const dateLabel = `${MONTH_NAMES[Number(month) - 1]} ${Number(day)}, ${year}`;
  return {
    title,
    value: amountPkr.toFixed(2),
    unit: "PKR",
    change: `interbank · ${dateLabel}`,
    trend: "up",
    glow,
    source: "ExchangeRate-API",
    latestDate: updatedDate,
    frequency: "Hourly",
  };
}

export async function getFxRates(): Promise<FxRateKpis> {
  try {
    const res = await fetch(ER_API_URL, {
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`ExchangeRate-API HTTP ${res.status}`);

    const json = (await res.json()) as ExchangeRateResponse;
    const { rates, date } = json;

    if (!rates.PKR || !rates.EUR || !rates.GBP || !rates.SAR) {
      throw new Error("ExchangeRate-API missing required currency pairs");
    }

    const usdPkr = rates.PKR;
    const eurPkr = rates.PKR / rates.EUR;
    const gbpPkr = rates.PKR / rates.GBP;
    const sarPkr = rates.PKR / rates.SAR;

    return {
      usdPkr: makeKpi("USD / PKR", usdPkr, date, "blue"),
      eurPkr: makeKpi("EUR / PKR", eurPkr, date, "blue"),
      gbpPkr: makeKpi("GBP / PKR", gbpPkr, date, "purple"),
      sarPkr: makeKpi("SAR / PKR", sarPkr, date, "purple"),
    };
  } catch {
    return FALLBACK_RATES;
  }
}
