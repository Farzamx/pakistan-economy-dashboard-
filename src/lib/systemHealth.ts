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

import { getSbpIndicator } from "@/lib/data/sbpServer";
import { getAllSbpIndicatorKeys, getSbpIndicatorFrequency, type SbpIndicatorKey, type Frequency } from "@/lib/data/sbp";
import { getCanonicalFreshnessSummary } from "@/lib/data/sbpCanonicalStore";
import { canonicalIndicatorKey } from "@/lib/data/canonicalResolutionConfig";
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

// ── Canonical SBP Freshness (Institutional Data Core, Wave 1) ──────────────
//
// Provider-independent by design: this NEVER re-queries SBP EasyData itself
// (which is Cloudflare-blocked from every shared cloud/CI network tested —
// sbpFreshnessAudit.ts's own /meta-based check is blind for exactly this
// reason, confirmed reporting "meta-unavailable" for all 20 indicators). It
// only reports what canonical_observations (migration 0050) actually has,
// and how old that is relative to each indicator's own declared cadence —
// so staleness is detectable even if SBP itself is completely unreachable
// from every network this platform's own infrastructure touches.
const SLA_GRACE_DAYS: Record<Frequency, number> = {
  "Monthly": 40,     // one release cycle + ~10 day buffer
  "Weekly": 14,       // a few days' post-week-end publication lag is normal, not a fault
  "As-Needed": 45,    // fine for indicators whose real cadence is genuinely near-fortnightly (T-Bill auctions) — see per-indicator overrides below for the ones that aren't
  "Annual": 450,      // >1 full cycle + a generous buffer for annual fiscal-year finalization lag
};

// Production Readiness Audit (Phase 6A.3) finding: a single "As-Needed"
// grace period is wrong for this category — it lumps together indicators
// with very different real cadences. Computed directly from this
// project's own backfilled history (p95 gap between consecutive periods,
// migration 0050's canonical_observations):
//   policyRate:  p95 gap 452 days, max 616 — SBP holds rates unchanged for
//                months at a time; that is normal monetary policy, not a
//                pipeline failure. A flat 45-day grace would flag "overdue"
//                during almost every ordinary hold period.
//   lsm:         age 69 days when checked, well inside Pakistan's
//                well-documented ~2-month LSM publication lag (this is a
//                Monthly-frequency indicator, but 40 days is too tight for
//                this specific series).
//   pibYield3y:  p95 gap 56 days, max 294 — less frequent than T-Bill
//                auctions; 45 days is too tight.
// tbillYield3m (p95 gap 16, max 30) is NOT overridden — the "As-Needed"
// default already covers it with room to spare.
const SLA_GRACE_OVERRIDE_DAYS: Partial<Record<SbpIndicatorKey, number>> = {
  policyRate: 120,
  pibYield3y: 90,
  lsm: 75,
};

export interface CanonicalIndicatorFreshness {
  indicatorKey: SbpIndicatorKey;
  latestObservationPeriod: string | null;
  vintage: string | null;
  ageDays: number | null;
  frequency: Frequency;
  slaGraceDays: number;
  status: "fresh" | "overdue" | "never-ingested";
  /**
   * Post-deployment hardening audit finding: an "overdue" status alone
   * doesn't tell an operator WHY — "SBP genuinely hasn't published a newer
   * observation yet" (ingestion is running fine, there's just nothing new)
   * and "our ingestion pipeline is broken" look identical from
   * canonical_observations alone. This cross-references source_health_log
   * (already recorded per-indicator by scripts/ingestSbp.ts) so the two
   * cases render differently instead of requiring an operator to manually
   * check a separate table.
   */
  ingestionStatus: "ok" | "failing" | "unknown";
  lastIngestionError: string | null;
}

async function getCanonicalSbpFreshness(): Promise<CanonicalIndicatorFreshness[]> {
  const [summary, keys, sourceHealth] = await Promise.all([
    getCanonicalFreshnessSummary(),
    Promise.resolve(getAllSbpIndicatorKeys()),
    getSourceHealthSummary(72), // last 3 days — enough margin for a once-daily local runner
  ]);
  const byKey = new Map(summary.map((s) => [s.indicatorKey, s]));
  const healthByKey = new Map(
    sourceHealth.filter((h) => h.sourceName === "sbp-easydata").map((h) => [h.seriesSlug, h]),
  );
  const now = Date.now();

  return keys.map((key): CanonicalIndicatorFreshness => {
    const frequency = getSbpIndicatorFrequency(key);
    const slaGraceDays = SLA_GRACE_OVERRIDE_DAYS[key] ?? SLA_GRACE_DAYS[frequency];
    const row = byKey.get(canonicalIndicatorKey(key));
    const health = healthByKey.get(key);
    const ingestionStatus: CanonicalIndicatorFreshness["ingestionStatus"] = !health
      ? "unknown"
      : health.consecutiveFailures > 0
        ? "failing"
        : "ok";
    const lastIngestionError = health?.consecutiveFailures ? health.lastError : null;

    if (!row) {
      return { indicatorKey: key, latestObservationPeriod: null, vintage: null, ageDays: null, frequency, slaGraceDays, status: "never-ingested", ingestionStatus, lastIngestionError };
    }

    const ageDays = Math.floor((now - new Date(row.latestObservationPeriod).getTime()) / 86_400_000);
    return {
      indicatorKey: key,
      latestObservationPeriod: row.latestObservationPeriod,
      vintage: row.vintage,
      ageDays,
      frequency,
      slaGraceDays,
      status: ageDays > slaGraceDays ? "overdue" : "fresh",
      ingestionStatus,
      lastIngestionError,
    };
  });
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
  { jobNames: ["weekly-intelligence"], path: "/api/cron/weekly-intelligence", schedule: "0 6 * * 1  (Mondays, 06:00 UTC, Vercel — primary) + 0 12 * * 1  (Mondays, 12:00 UTC, GitHub Actions — safety net)", description: "Computes Health Score + Recession/Default probabilities once, stores the snapshot the homepage reads. Idempotent — a duplicate invocation in the same ISO week is rejected by a DB constraint and logged as 'skipped', not an error. GitHub Actions safety net (.github/workflows/weekly-intelligence.yml) added by PEIC v2.3 after the audit found this was the only cron job without GitHub Actions redundancy." },
  { jobNames: ["sbp-local-ingestion"], path: "npm run ingest:sbp (scripts/ingestSbp.ts)", schedule: "Local machine, Windows Task Scheduler — see docs/local-ingestion-setup.md", description: "Institutional Data Core Wave 1: SBP EasyData is Cloudflare-blocked from Vercel/GitHub Actions/Supabase Edge Functions (confirmed by direct testing), so ingestion runs from a machine that can actually reach it, writing to raw_observations/canonical_observations (migration 0050). The dashboard's render path reads only from canonical_observations — never SBP EasyData directly. Execution environment is explicitly temporary; the command and its logic are unchanged when it moves to a VPS/cron later." },
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
  canonicalSbpFreshness: CanonicalIndicatorFreshness[];
  generatedAt: string;
}

export async function getSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
  // Live external checks run in parallel with DB reads — neither group blocks the other.
  const [
    sbp, pbs, twelveData, fred, worldBank, yahoo, news, supabase, resend,
    weeklyIntelligence, cronJobs,
    sourceHealth, sourceBenchmarks, publicationLeads, syncTriggers,
    canonicalSbpFreshness,
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
    getCanonicalSbpFreshness(),           // Institutional Data Core Wave 1
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
    canonicalSbpFreshness,
    generatedAt: new Date().toISOString(),
  };
}
