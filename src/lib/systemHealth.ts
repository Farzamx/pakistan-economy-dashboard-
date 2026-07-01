// System Health diagnostics data (Production Reliability & Institutional
// Upgrade Part 11; Final Production Hardening Parts 5/6/7) — gathers a
// real, current snapshot of every external dependency this dashboard
// relies on. Internal/operational use only; see
// src/app/admin/system-health/page.tsx for the access gate.
//
// Honesty constraint: every field here is either (a) a live, just-executed
// check of the real upstream (with measured latency), (b) genuine
// in-memory health tracking (AI providers), or (c) genuine persisted run
// history (cron_run_log, written by every cron route — see
// cronLogging.ts). Nothing here is fabricated.

import { getSbpIndicator } from "@/lib/data/sbp";
import { getSpiHistory } from "@/lib/data/spi";
import { getGoldKpi } from "@/lib/data/metals";
import { getUs10yKpi } from "@/lib/data/fred";
import { getGdpKpi } from "@/lib/data/worldBank";
import { getFxRates } from "@/lib/data/fxRates";
import { getNews } from "@/lib/data/news";
import { getProviderHealthSnapshot, type ProviderHealthSnapshot } from "@/lib/openRouterClient";
import { getLatestWeeklyIntelligenceSnapshot } from "@/lib/data/weeklyIntelligence";
import { getCronRunHistory, type CronRunRecord } from "@/lib/cronLogging";
import { checkResendHealth } from "@/lib/email/resend";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { getSourceHealthSummary, type SourceHealthRecord } from "@/lib/economicCalendar/sourceHealthTracker";
import { getSourceBenchmarkStats, getPublicationLeadStats, computeSourceRankings, generateRecommendations, type SourceBenchmarkStats, type PublicationLeadEntry, type SeriesSourceRanking, type Recommendation } from "@/lib/syncBenchmark";
import { getSyncTriggerHistory, type SyncTriggerRecord } from "@/lib/syncTriggerLog";

export type { SourceHealthRecord, SourceBenchmarkStats, PublicationLeadEntry, SeriesSourceRanking, Recommendation, SyncTriggerRecord };

export interface DataSourceCheck {
  name: string;
  status: "ok" | "degraded" | "down" | "unknown";
  detail: string;
  source?: string;
  latestDate?: string;
  latencyMs: number;
  checkedAt: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, latencyMs: Date.now() - start };
}

async function checkSbp(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const { result, latencyMs } = await timed(() => getSbpIndicator("cpiInflation"));
    const status = result.meta.sourceStatus === "live" || result.meta.sourceStatus === "cache-fresh" ? "ok" : result.meta.sourceStatus === "cache-stale" ? "degraded" : "down";
    return { name: "SBP EasyData", status, detail: `sourceStatus=${result.meta.sourceStatus ?? "unknown"} (checked via CPI Inflation series)`, source: result.kpi.source, latestDate: result.kpi.latestDate, latencyMs, checkedAt };
  } catch (err) {
    return { name: "SBP EasyData", status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: -1, checkedAt };
  }
}

async function checkPbs(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const { result, latencyMs } = await timed(() => getSpiHistory());
    if (!result || result.points.length === 0) return { name: "PBS (SPI + Official Releases)", status: "down", detail: "getSpiHistory() returned null/empty — live fetch or parse failed", latencyMs, checkedAt };
    return { name: "PBS (SPI + Official Releases)", status: "ok", detail: `${result.points.length} SPI points available`, source: result.source, latestDate: result.points.at(-1)?.date, latencyMs, checkedAt };
  } catch (err) {
    return { name: "PBS (SPI + Official Releases)", status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: -1, checkedAt };
  }
}

async function checkTwelveData(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const { result: kpi, latencyMs } = await timed(() => getGoldKpi());
    const status = kpi.sourceStatus === "live" || kpi.sourceStatus === "cache-fresh" ? "ok" : kpi.sourceStatus === "cache-stale" ? "degraded" : "down";
    return { name: "Twelve Data (+ Yahoo Finance secondary)", status, detail: `sourceStatus=${kpi.sourceStatus ?? "unknown"} (checked via Gold)`, source: kpi.source, latestDate: kpi.latestDate, latencyMs, checkedAt };
  } catch (err) {
    return { name: "Twelve Data (+ Yahoo Finance secondary)", status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: -1, checkedAt };
  }
}

async function checkFred(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const { result: kpi, latencyMs } = await timed(() => getUs10yKpi());
    const status = kpi.sourceStatus === "live" || kpi.sourceStatus === "cache-fresh" ? "ok" : kpi.sourceStatus === "cache-stale" ? "degraded" : "down";
    return { name: "FRED (+ Yahoo Finance secondary)", status, detail: `sourceStatus=${kpi.sourceStatus ?? "unknown"} (checked via US 10Y)`, source: kpi.source, latestDate: kpi.latestDate, latencyMs, checkedAt };
  } catch (err) {
    return { name: "FRED (+ Yahoo Finance secondary)", status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: -1, checkedAt };
  }
}

async function checkWorldBank(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const { result: kpi, latencyMs } = await timed(() => getGdpKpi());
    const isFallback = kpi.sourceStatus === "fallback";
    return { name: "World Bank", status: isFallback ? "down" : "ok", detail: isFallback ? "Serving hardcoded fallback" : "Live", source: kpi.source, latestDate: kpi.latestDate, latencyMs, checkedAt };
  } catch (err) {
    return { name: "World Bank", status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: -1, checkedAt };
  }
}

async function checkYahooFinance(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const { result: rates, latencyMs } = await timed(() => getFxRates());
    const isFallback = rates.usdPkr.sourceStatus === "fallback";
    return { name: "Yahoo Finance (Live FX)", status: isFallback ? "down" : "ok", detail: isFallback ? "Serving hardcoded fallback" : `sourceStatus=${rates.usdPkr.sourceStatus ?? "unknown"}`, source: rates.usdPkr.source, latestDate: rates.usdPkr.latestDate, latencyMs, checkedAt };
  } catch (err) {
    return { name: "Yahoo Finance (Live FX)", status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: -1, checkedAt };
  }
}

async function checkNews(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const { result: items, latencyMs } = await timed(() => getNews());
    const sources = new Set(items.map((i) => i.source)).size;
    return { name: "News (9 RSS + PBS sources)", status: items.length > 0 ? "ok" : "down", detail: `${items.length} articles from ${sources} distinct sources`, latencyMs, checkedAt };
  } catch (err) {
    return { name: "News (9 RSS + PBS sources)", status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: -1, checkedAt };
  }
}

/** Reuses the same RPC the Cron History section already needs (p_limit 1) rather than adding a dedicated ping RPC — a successful response proves Supabase/PostgREST is reachable and the anon key is valid. */
async function checkSupabase(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  try {
    const start = Date.now();
    const supabase = createPublicDataClient();
    const { error } = await supabase.rpc("get_cron_run_history", { p_job_name: null, p_limit: 1 });
    const latencyMs = Date.now() - start;
    if (error) return { name: "Supabase", status: "down", detail: error.message, latencyMs, checkedAt };
    return { name: "Supabase", status: "ok", detail: "RPC round-trip succeeded", latencyMs, checkedAt };
  } catch (err) {
    return { name: "Supabase", status: "down", detail: err instanceof Error ? err.message : String(err), latencyMs: -1, checkedAt };
  }
}

async function checkResend(): Promise<DataSourceCheck> {
  const checkedAt = new Date().toISOString();
  if (!process.env.RESEND_API_KEY) {
    return { name: "Resend", status: "down", detail: "RESEND_API_KEY not configured", latencyMs: -1, checkedAt };
  }
  const health = await checkResendHealth();
  const detail = health.scopeRestricted
    ? "Key is scoped to sending-only (by design) — got a real, valid response confirming connectivity; full domain-level status isn't checkable without sending an actual email."
    : health.ok
      ? "domains.list() round-trip succeeded (no email sent)"
      : (health.error ?? "unknown error");
  return { name: "Resend", status: health.ok ? "ok" : "down", detail, latencyMs: health.latencyMs, checkedAt };
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
  /** The job_name(s) logged for this scheduled trigger — see cronLogging.ts call sites. Some routes log more than one logically-distinct job under one HTTP path. */
  jobNames: string[];
  path: string;
  schedule: string;
  description: string;
}

// Static config (mirrors vercel.json) — paired with REAL run history
// (cron_run_log, via getCronRunHistory()) in getSystemHealthSnapshot()
// below. Before Part 5, this list was the only thing this page could show
// for cron jobs at all; "last run"/"last failure" would have had to be
// fabricated since nothing was persisted anywhere.
export const CRON_JOBS: CronJobInfo[] = [
  { jobNames: ["revalidate-fx"], path: "/api/revalidate-fx", schedule: "0 3 * * *  (daily, 03:00 UTC)", description: "Forces an FX rate cache refresh — a freshness floor, not the main mechanism (15min L2 cache already does most of the work)." },
  { jobNames: ["official-calendar-sync", "calendar-gap-detection", "sbp-actual-value-sync", "lsm-yoy-sync", "notification-worker"], path: "/api/cron/sync-economic-calendar", schedule: "*/15 * * * *  (every 15 min, GitHub Actions — primary) + 0 18 * * *  (daily safety net, Vercel)", description: "Scheduler-agnostic sync pipeline: official calendar reconciliation, gap detection, SBP EasyData + LSM YoY actual-value sync, notification drain. Primary trigger: GitHub Actions (.github/workflows/sync-economic-calendar.yml) every 15 minutes — detects new SBP/PBS data within ~15 min of publication. Vercel cron (18:00 UTC daily) is a safety net. Each trigger logs to sync_trigger_log with its scheduler identity." },
  { jobNames: ["notification-worker-safety-net"], path: "/api/cron/process-notification-jobs", schedule: "0 20 * * *  (daily, 20:00 UTC)", description: "Safety-net sweep for any notification job the calendar sync's inline drain missed." },
  { jobNames: ["weekly-intelligence"], path: "/api/cron/weekly-intelligence", schedule: "0 6 * * 1  (Mondays, 06:00 UTC)", description: "Computes Health Score + Recession/Default probabilities once, stores the snapshot the homepage reads. Idempotent — a duplicate invocation in the same ISO week is rejected by a DB constraint and logged as 'skipped', not an error." },
];

export interface CronJobHistory extends CronJobInfo {
  /** Most recent run across all of this job's jobNames, most recent first. */
  recentRuns: CronRunRecord[];
  lastSuccess: CronRunRecord | null;
  lastFailure: CronRunRecord | null;
}

async function getCronJobsWithHistory(): Promise<CronJobHistory[]> {
  return Promise.all(
    CRON_JOBS.map(async (job) => {
      const runsPerName = await Promise.all(job.jobNames.map((name) => getCronRunHistory(name, 10)));
      const recentRuns = runsPerName.flat().sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      return {
        ...job,
        recentRuns,
        lastSuccess: recentRuns.find((r) => r.status === "success") ?? null,
        lastFailure: recentRuns.find((r) => r.status === "failure") ?? null,
      };
    }),
  );
}

export interface SystemHealthSnapshot {
  dataSources: DataSourceCheck[];
  aiProviders: ProviderHealthSnapshot[];
  weeklyIntelligence: WeeklyIntelligenceHealth;
  cronJobs: CronJobHistory[];
  // Phase 4: Source benchmarking & scheduler intelligence
  sourceHealth: SourceHealthRecord[];
  sourceBenchmarks: SourceBenchmarkStats[];
  sourceRankings: SeriesSourceRanking[];
  publicationLeads: PublicationLeadEntry[];
  recommendations: Recommendation[];
  syncTriggers: SyncTriggerRecord[];
  generatedAt: string;
}

export async function getSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
  // Live external checks run in parallel with DB reads — neither group blocks the other.
  const [
    sbp, pbs, twelveData, fred, worldBank, yahoo, news, supabase, resend,
    weeklyIntelligence, cronJobs,
    sourceHealth, sourceBenchmarks, publicationLeads, syncTriggers,
  ] = await Promise.all([
    checkSbp(),
    checkPbs(),
    checkTwelveData(),
    checkFred(),
    checkWorldBank(),
    checkYahooFinance(),
    checkNews(),
    checkSupabase(),
    checkResend(),
    checkWeeklyIntelligence(),
    getCronJobsWithHistory(),
    // Phase 4: DB reads only — no live external HTTP calls
    getSourceHealthSummary(168),          // last 7 days
    getSourceBenchmarkStats(720),         // last 30 days
    getPublicationLeadStats(90),          // last 90 days
    getSyncTriggerHistory(20),
  ]);

  // Pure computations from DB data — no I/O
  const sourceRankings = computeSourceRankings(sourceBenchmarks, publicationLeads);
  const recommendations = generateRecommendations(sourceBenchmarks, publicationLeads);

  return {
    dataSources: [sbp, pbs, twelveData, fred, worldBank, yahoo, news, supabase, resend],
    aiProviders: getProviderHealthSnapshot(),
    weeklyIntelligence,
    cronJobs,
    sourceHealth,
    sourceBenchmarks,
    sourceRankings,
    publicationLeads,
    recommendations,
    syncTriggers,
    generatedAt: new Date().toISOString(),
  };
}
