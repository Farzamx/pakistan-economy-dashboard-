// System Health diagnostics data (Production Reliability & Institutional
// Upgrade, Part 11) — gathers a real, current snapshot of every external
// dependency this dashboard relies on. Internal/operational use only; see
// src/app/admin/system-health/page.tsx for the access gate.
//
// Honesty constraint: every field here is either (a) a live, just-executed
// check of the real upstream, or (b) genuine in-memory health tracking
// (AI providers). Nothing here is fabricated — services with no persisted
// failure/latency history (the cron jobs, notification worker) say so
// plainly rather than inventing numbers to fill the table.

import { getSbpIndicator } from "@/lib/data/sbp";
import { getSpiHistory } from "@/lib/data/spi";
import { getGoldKpi } from "@/lib/data/metals";
import { getUs10yKpi } from "@/lib/data/fred";
import { getGdpKpi } from "@/lib/data/worldBank";
import { getFxRates } from "@/lib/data/fxRates";
import { getNews } from "@/lib/data/news";
import { getProviderHealthSnapshot, type ProviderHealthSnapshot } from "@/lib/openRouterClient";
import { getLatestWeeklyIntelligenceSnapshot } from "@/lib/data/weeklyIntelligence";

export interface DataSourceCheck {
  name: string;
  status: "ok" | "degraded" | "down" | "unknown";
  detail: string;
  source?: string;
  latestDate?: string;
  checkedAt: string;
}

async function checkSbp(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const result = await getSbpIndicator("cpiInflation");
    const status = result.meta.sourceStatus === "live" || result.meta.sourceStatus === "cache-fresh" ? "ok" : result.meta.sourceStatus === "cache-stale" ? "degraded" : "down";
    return { name: "SBP EasyData", status, detail: `sourceStatus=${result.meta.sourceStatus ?? "unknown"} (checked via CPI Inflation series)`, source: result.kpi.source, latestDate: result.kpi.latestDate, checkedAt };
  } catch (err) {
    return { name: "SBP EasyData", status: "down", detail: err instanceof Error ? err.message : String(err), checkedAt };
  }
}

async function checkPbs(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const result = await getSpiHistory();
    if (!result || result.points.length === 0) return { name: "PBS (SPI + Official Releases)", status: "down", detail: "getSpiHistory() returned null/empty — live fetch or parse failed", checkedAt };
    return { name: "PBS (SPI + Official Releases)", status: "ok", detail: `${result.points.length} SPI points available`, source: result.source, latestDate: result.points.at(-1)?.date, checkedAt };
  } catch (err) {
    return { name: "PBS (SPI + Official Releases)", status: "down", detail: err instanceof Error ? err.message : String(err), checkedAt };
  }
}

async function checkTwelveData(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const kpi = await getGoldKpi();
    const status = kpi.sourceStatus === "live" || kpi.sourceStatus === "cache-fresh" ? "ok" : kpi.sourceStatus === "cache-stale" ? "degraded" : "down";
    return { name: "Twelve Data (+ Yahoo Finance secondary)", status, detail: `sourceStatus=${kpi.sourceStatus ?? "unknown"} (checked via Gold)`, source: kpi.source, latestDate: kpi.latestDate, checkedAt };
  } catch (err) {
    return { name: "Twelve Data (+ Yahoo Finance secondary)", status: "down", detail: err instanceof Error ? err.message : String(err), checkedAt };
  }
}

async function checkFred(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const kpi = await getUs10yKpi();
    const status = kpi.sourceStatus === "live" || kpi.sourceStatus === "cache-fresh" ? "ok" : kpi.sourceStatus === "cache-stale" ? "degraded" : "down";
    return { name: "FRED (+ Yahoo Finance secondary)", status, detail: `sourceStatus=${kpi.sourceStatus ?? "unknown"} (checked via US 10Y)`, source: kpi.source, latestDate: kpi.latestDate, checkedAt };
  } catch (err) {
    return { name: "FRED (+ Yahoo Finance secondary)", status: "down", detail: err instanceof Error ? err.message : String(err), checkedAt };
  }
}

async function checkWorldBank(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const kpi = await getGdpKpi();
    const isFallback = kpi.source?.includes("fallback") ?? false;
    return { name: "World Bank", status: isFallback ? "down" : "ok", detail: isFallback ? "Serving hardcoded fallback" : "Live", source: kpi.source, latestDate: kpi.latestDate, checkedAt };
  } catch (err) {
    return { name: "World Bank", status: "down", detail: err instanceof Error ? err.message : String(err), checkedAt };
  }
}

async function checkYahooFinance(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const rates = await getFxRates();
    const isFallback = rates.usdPkr.source?.includes("fallback") ?? false;
    return { name: "Yahoo Finance (Live FX)", status: isFallback ? "down" : "ok", detail: isFallback ? "Serving hardcoded fallback" : "Live", source: rates.usdPkr.source, latestDate: rates.usdPkr.latestDate, checkedAt };
  } catch (err) {
    return { name: "Yahoo Finance (Live FX)", status: "down", detail: err instanceof Error ? err.message : String(err), checkedAt };
  }
}

async function checkNews(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const items = await getNews();
    const sources = new Set(items.map((i) => i.source)).size;
    return { name: "News (9 RSS + PBS sources)", status: items.length > 0 ? "ok" : "down", detail: `${items.length} articles from ${sources} distinct sources`, checkedAt };
  } catch (err) {
    return { name: "News (9 RSS + PBS sources)", status: "down", detail: err instanceof Error ? err.message : String(err), checkedAt };
  }
}

export interface WeeklyIntelligenceHealth {
  status: "ok" | "overdue" | "never-run";
  lastComputedAt: string | null;
  nextDueAt: string | null;
  daysOverdue: number | null;
}

async function checkWeeklyIntelligence(): Promise<WeeklyIntelligenceHealth> {
  const snapshot = await getLatestWeeklyIntelligenceSnapshot();
  if (!snapshot) return { status: "never-run", lastComputedAt: null, nextDueAt: null, daysOverdue: null };

  const computedAt = new Date(snapshot.computedAt);
  const nextDue = new Date(computedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const overdueMs = Date.now() - nextDue.getTime();
  const daysOverdue = overdueMs > 0 ? Math.floor(overdueMs / 86_400_000) : 0;

  return {
    status: overdueMs > 24 * 60 * 60 * 1000 ? "overdue" : "ok", // 1-day grace period past the expected Monday
    lastComputedAt: snapshot.computedAt,
    nextDueAt: nextDue.toISOString(),
    daysOverdue: daysOverdue > 0 ? daysOverdue : null,
  };
}

export interface CronJobInfo {
  path: string;
  schedule: string;
  description: string;
}

// Static — mirrors vercel.json exactly. Not live-checked: this project
// doesn't persist a run-history log for cron invocations, so "last run"/
// "last failure" for these specifically would have to be fabricated. The
// honest version of this row is "here's what's configured to run, check
// Vercel's own cron execution logs for actual run history."
export const CRON_JOBS: CronJobInfo[] = [
  { path: "/api/revalidate-fx", schedule: "0 3 * * *  (daily, 03:00 UTC)", description: "Forces an FX rate cache refresh — a freshness floor, not the main mechanism (15min L2 cache already does most of the work)." },
  { path: "/api/cron/sync-economic-calendar", schedule: "0 18 * * *  (daily, 18:00 UTC)", description: "Syncs SBP/PBS actual values into the Economic Calendar; also drains pending notification jobs inline." },
  { path: "/api/cron/process-notification-jobs", schedule: "0 20 * * *  (daily, 20:00 UTC)", description: "Safety-net sweep for any notification job the calendar sync's inline drain missed." },
  { path: "/api/cron/weekly-intelligence", schedule: "0 6 * * 1  (Mondays, 06:00 UTC)", description: "Computes Health Score + Recession/Default probabilities once, stores the snapshot the homepage reads." },
];

export interface SystemHealthSnapshot {
  dataSources: DataSourceCheck[];
  aiProviders: ProviderHealthSnapshot[];
  weeklyIntelligence: WeeklyIntelligenceHealth;
  cronJobs: CronJobInfo[];
  generatedAt: string;
}

export async function getSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
  const [sbp, pbs, twelveData, fred, worldBank, yahoo, news, weeklyIntelligence] = await Promise.all([
    checkSbp(),
    checkPbs(),
    checkTwelveData(),
    checkFred(),
    checkWorldBank(),
    checkYahooFinance(),
    checkNews(),
    checkWeeklyIntelligence(),
  ]);

  return {
    dataSources: [sbp, pbs, twelveData, fred, worldBank, yahoo, news],
    aiProviders: getProviderHealthSnapshot(),
    weeklyIntelligence,
    cronJobs: CRON_JOBS,
    generatedAt: new Date().toISOString(),
  };
}
