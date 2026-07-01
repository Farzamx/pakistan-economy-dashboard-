// Source Benchmarking, Rankings & Recommendations — Phase 4 (Parts 4-7)
//
// Reads pre-aggregated metrics from source_health_log (via 0026 RPCs) and
// computes higher-level analytics in TypeScript:
//
//   getSourceBenchmarkStats()  — rolling latency percentiles + success rates
//   getPublicationLeadStats()  — which source published each period first
//   computeSourceRankings()    — per-series source ranking by composite score
//   generateRecommendations()  — deterministic rules engine (no AI invention)
//
// Performance: all data comes from the DB (pre-aggregated during sync).
// Nothing here makes live external HTTP calls — safe to call during dashboard
// rendering without impacting page load time.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";

// ─── Benchmark stats ─────────────────────────────────────────────────────────

export interface SourceBenchmarkStats {
  sourceName: string;
  sourceType: string;
  seriesSlug: string;
  totalAttempts: number;
  totalSucceeded: number;
  totalFailed: number;
  totalFallbacks: number;
  successRatePct: number;
  avgLatencyMs: number | null;
  medianLatencyMs: number | null;
  p95LatencyMs: number | null;
  consecutiveFailures: number;
  lastSucceededAt: string | null;
  lastObservationDate: string | null;
  /** Average days between the observation_date and when we fetched it. Higher = fresher source. */
  avgFreshnessDays: number | null;
}

interface BenchmarkRow {
  source_name: string;
  source_type: string;
  series_slug: string;
  total_attempts: string;
  total_succeeded: string;
  total_failed: string;
  total_fallbacks: string;
  success_rate_pct: number | null;
  avg_latency_ms: string | null;
  median_latency_ms: string | null;
  p95_latency_ms: string | null;
  consecutive_failures: number;
  last_succeeded_at: string | null;
  last_observation_date: string | null;
  avg_freshness_days: string | null;
}

export async function getSourceBenchmarkStats(sinceHours = 720): Promise<SourceBenchmarkStats[]> {
  try {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.rpc("get_source_benchmark_stats", { p_since_hours: sinceHours });
    if (error) {
      console.error(`[Benchmark] get_source_benchmark_stats failed: ${error.message}`);
      return [];
    }
    return ((data ?? []) as BenchmarkRow[]).map((r) => ({
      sourceName: r.source_name,
      sourceType: r.source_type,
      seriesSlug: r.series_slug,
      totalAttempts: Number(r.total_attempts),
      totalSucceeded: Number(r.total_succeeded),
      totalFailed: Number(r.total_failed),
      totalFallbacks: Number(r.total_fallbacks),
      successRatePct: r.success_rate_pct ?? 0,
      avgLatencyMs: r.avg_latency_ms !== null ? Number(r.avg_latency_ms) : null,
      medianLatencyMs: r.median_latency_ms !== null ? Number(r.median_latency_ms) : null,
      p95LatencyMs: r.p95_latency_ms !== null ? Number(r.p95_latency_ms) : null,
      consecutiveFailures: r.consecutive_failures,
      lastSucceededAt: r.last_succeeded_at,
      lastObservationDate: r.last_observation_date,
      avgFreshnessDays: r.avg_freshness_days !== null ? Number(r.avg_freshness_days) : null,
    }));
  } catch (err) {
    console.error(`[Benchmark] get_source_benchmark_stats threw: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

// ─── Publication lead stats ──────────────────────────────────────────────────

export interface PublicationLeadEntry {
  seriesSlug: string;
  observationDate: string;
  sourceName: string;
  sourceType: string;
  firstSeenAt: string;
  pubRank: number;
  leadHoursVsSlowest: number;
}

interface LeadRow {
  series_slug: string;
  observation_date: string;
  source_name: string;
  source_type: string;
  first_seen_at: string;
  pub_rank: number;
  lead_hours_vs_slowest: string;
}

export async function getPublicationLeadStats(sinceDays = 90): Promise<PublicationLeadEntry[]> {
  try {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.rpc("get_publication_lead_stats", { p_since_days: sinceDays });
    if (error) {
      console.error(`[Benchmark] get_publication_lead_stats failed: ${error.message}`);
      return [];
    }
    return ((data ?? []) as LeadRow[]).map((r) => ({
      seriesSlug: r.series_slug,
      observationDate: r.observation_date,
      sourceName: r.source_name,
      sourceType: r.source_type,
      firstSeenAt: r.first_seen_at,
      pubRank: r.pub_rank,
      leadHoursVsSlowest: Number(r.lead_hours_vs_slowest),
    }));
  } catch (err) {
    console.error(`[Benchmark] get_publication_lead_stats threw: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

// ─── Source rankings ─────────────────────────────────────────────────────────

export interface SourceRankEntry {
  rank: number;
  sourceName: string;
  sourceType: string;
  reliabilityPct: number;
  avgLatencyMs: number | null;
  /** Average hours ahead of the slowest observed source, across all periods tracked. */
  avgLeadHours: number | null;
  compositeScore: number;
}

export interface SeriesSourceRanking {
  seriesSlug: string;
  rankings: SourceRankEntry[];
}

/**
 * Ranks sources per series using a composite score:
 *   reliability 50% + latency 20% + publication lead 30%
 *
 * All weights are documented and deterministic — no AI, no estimation.
 * With limited data (few cron runs), lead may be null for many sources;
 * the ranking degrades gracefully to reliability + latency only.
 */
export function computeSourceRankings(
  benchmarks: SourceBenchmarkStats[],
  leads: PublicationLeadEntry[],
): SeriesSourceRanking[] {
  // Group benchmarks by series
  const bySeriesMap = new Map<string, SourceBenchmarkStats[]>();
  for (const b of benchmarks) {
    if (!bySeriesMap.has(b.seriesSlug)) bySeriesMap.set(b.seriesSlug, []);
    bySeriesMap.get(b.seriesSlug)!.push(b);
  }

  // Compute average lead hours per (series, source) from lead stats
  const avgLeadMap = new Map<string, number>(); // key: `${series}::${source}`
  const leadBySeries = new Map<string, PublicationLeadEntry[]>();
  for (const l of leads) {
    if (!leadBySeries.has(l.seriesSlug)) leadBySeries.set(l.seriesSlug, []);
    leadBySeries.get(l.seriesSlug)!.push(l);
  }
  for (const [slug, entries] of leadBySeries) {
    const sourceLeads = new Map<string, number[]>();
    for (const e of entries) {
      if (!sourceLeads.has(e.sourceName)) sourceLeads.set(e.sourceName, []);
      sourceLeads.get(e.sourceName)!.push(e.leadHoursVsSlowest);
    }
    for (const [src, vals] of sourceLeads) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      avgLeadMap.set(`${slug}::${src}`, avg);
    }
  }

  const rankings: SeriesSourceRanking[] = [];

  for (const [slug, sources] of bySeriesMap) {
    if (sources.length === 0) continue;

    // Normalize latency: 0 = slowest among this series' sources, 1 = fastest
    const latencies = sources.map((s) => s.avgLatencyMs).filter((v): v is number => v !== null);
    const maxLat = latencies.length > 0 ? Math.max(...latencies) : 1;
    const minLat = latencies.length > 0 ? Math.min(...latencies) : 0;
    const latRange = maxLat - minLat || 1;

    // Normalize lead: 0 = slowest, 1 = fastest
    const leadValues = sources
      .map((s) => avgLeadMap.get(`${slug}::${s.sourceName}`))
      .filter((v): v is number => v !== undefined);
    const maxLead = leadValues.length > 0 ? Math.max(...leadValues) : 0;
    const leadRange = maxLead || 1;

    const scored = sources.map((s) => {
      const reliability = s.successRatePct / 100;

      const latMs = s.avgLatencyMs;
      const latScore = latMs !== null ? 1 - (latMs - minLat) / latRange : 0.5;

      const lead = avgLeadMap.get(`${slug}::${s.sourceName}`);
      const leadScore = lead !== undefined ? lead / leadRange : 0.5;

      const composite = reliability * 0.5 + latScore * 0.2 + leadScore * 0.3;

      return {
        sourceName: s.sourceName,
        sourceType: s.sourceType,
        reliabilityPct: s.successRatePct,
        avgLatencyMs: s.avgLatencyMs,
        avgLeadHours: lead !== undefined ? Math.round(lead * 10) / 10 : null,
        compositeScore: Math.round(composite * 1000) / 1000,
      };
    });

    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    rankings.push({
      seriesSlug: slug,
      rankings: scored.map((s, i) => ({ rank: i + 1, ...s })),
    });
  }

  return rankings.sort((a, b) => a.seriesSlug.localeCompare(b.seriesSlug));
}

// ─── Deterministic recommendations ──────────────────────────────────────────

export interface Recommendation {
  severity: "info" | "warning" | "critical";
  category: "reliability" | "latency" | "publication-lead" | "fallback-rate" | "data-freshness";
  seriesSlug: string | null;
  sourceName: string | null;
  message: string;
  evidence: string;
}

/**
 * Generates deterministic recommendations from benchmark and lead data.
 * Rules are objective threshold-based — no AI, no estimation.
 * AI may optionally summarize them (same pattern as weekly intelligence),
 * but the facts and thresholds are fixed in code.
 */
export function generateRecommendations(
  benchmarks: SourceBenchmarkStats[],
  leads: PublicationLeadEntry[],
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Rule 1: Consecutive failures ≥ 3 → critical
  for (const b of benchmarks) {
    if (b.consecutiveFailures >= 3) {
      recs.push({
        severity: "critical",
        category: "reliability",
        seriesSlug: b.seriesSlug,
        sourceName: b.sourceName,
        message: `${b.sourceName} has failed ${b.consecutiveFailures} consecutive times for ${b.seriesSlug}.`,
        evidence: `${b.totalFailed} failures / ${b.totalAttempts} attempts in the tracked window. Last success: ${b.lastSucceededAt ?? "never"}.`,
      });
    }
  }

  // Rule 2: Success rate < 80% → warning
  for (const b of benchmarks) {
    if (b.consecutiveFailures < 3 && b.successRatePct < 80 && b.totalAttempts >= 5) {
      recs.push({
        severity: "warning",
        category: "reliability",
        seriesSlug: b.seriesSlug,
        sourceName: b.sourceName,
        message: `${b.sourceName} reliability for ${b.seriesSlug} is below threshold (${b.successRatePct}%).`,
        evidence: `${b.totalSucceeded} successes / ${b.totalAttempts} attempts over tracked window.`,
      });
    }
  }

  // Rule 3: Fallback rate > 20% → warning
  for (const b of benchmarks) {
    if (b.totalAttempts >= 5) {
      const fallbackRate = (b.totalFallbacks / b.totalAttempts) * 100;
      if (fallbackRate > 20) {
        recs.push({
          severity: "warning",
          category: "fallback-rate",
          seriesSlug: b.seriesSlug,
          sourceName: b.sourceName,
          message: `${b.sourceName} served fallback/stale data ${Math.round(fallbackRate)}% of the time for ${b.seriesSlug}.`,
          evidence: `${b.totalFallbacks} fallbacks out of ${b.totalAttempts} attempts.`,
        });
      }
    }
  }

  // Rule 4: p95 latency > 5000ms → warning
  for (const b of benchmarks) {
    if (b.p95LatencyMs !== null && b.p95LatencyMs > 5000) {
      recs.push({
        severity: "warning",
        category: "latency",
        seriesSlug: b.seriesSlug,
        sourceName: b.sourceName,
        message: `${b.sourceName} p95 latency for ${b.seriesSlug} is high (${Math.round(b.p95LatencyMs)}ms).`,
        evidence: `avg=${b.avgLatencyMs !== null ? Math.round(b.avgLatencyMs) : "?"}ms, median=${b.medianLatencyMs !== null ? Math.round(b.medianLatencyMs) : "?"}ms, p95=${Math.round(b.p95LatencyMs)}ms.`,
      });
    }
  }

  // Rule 5: Data freshness > 60 days → warning (observation is very old when fetched)
  for (const b of benchmarks) {
    if (b.avgFreshnessDays !== null && b.avgFreshnessDays > 60) {
      recs.push({
        severity: "warning",
        category: "data-freshness",
        seriesSlug: b.seriesSlug,
        sourceName: b.sourceName,
        message: `${b.sourceName} data for ${b.seriesSlug} averages ${Math.round(b.avgFreshnessDays)} days old at fetch time.`,
        evidence: `avg_freshness_days=${b.avgFreshnessDays} across succeeded non-fallback fetches.`,
      });
    }
  }

  // Rule 6: Publication lead — source consistently slower than another for same series
  const leadBySeries = new Map<string, PublicationLeadEntry[]>();
  for (const l of leads) {
    if (!leadBySeries.has(l.seriesSlug)) leadBySeries.set(l.seriesSlug, []);
    leadBySeries.get(l.seriesSlug)!.push(l);
  }

  for (const [slug, entries] of leadBySeries) {
    // Find the fastest and slowest source across all observation periods
    const rank1Entries = entries.filter((e) => e.pubRank === 1);
    const lastPlaceEntries = entries.filter((e) => e.leadHoursVsSlowest === 0 && e.pubRank > 1);

    if (rank1Entries.length >= 3) {
      // Find which source holds rank 1 most often
      const rank1Counts = new Map<string, number>();
      for (const e of rank1Entries) {
        rank1Counts.set(e.sourceName, (rank1Counts.get(e.sourceName) ?? 0) + 1);
      }
      const [topSource, topCount] = [...rank1Counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const totalPeriods = new Set(entries.map((e) => e.observationDate)).size;
      if (topCount >= 3 && topCount >= Math.ceil(totalPeriods * 0.6)) {
        const avgLead = rank1Entries
          .filter((e) => e.sourceName === topSource)
          .map((e) => {
            const worstForPeriod = entries.filter((x) => x.observationDate === e.observationDate && x.leadHoursVsSlowest === 0)[0];
            const slowestEntry = entries.filter((x) => x.observationDate === e.observationDate).sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt))[0];
            if (!slowestEntry) return 0;
            const lead = (new Date(slowestEntry.firstSeenAt).getTime() - new Date(e.firstSeenAt).getTime()) / 3_600_000;
            return lead;
          });
        const avgLeadHours = avgLead.length > 0 ? avgLead.reduce((a, b) => a + b, 0) / avgLead.length : 0;
        recs.push({
          severity: "info",
          category: "publication-lead",
          seriesSlug: slug,
          sourceName: topSource,
          message: `${topSource} has published ${slug} data first for ${topCount}/${totalPeriods} observed periods.`,
          evidence: `Average lead over other sources: ${Math.round(avgLeadHours * 10) / 10}h. Consider prioritising this source in the source hierarchy.`,
        });
      }
    }
  }

  // Deduplicate and sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return recs.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
