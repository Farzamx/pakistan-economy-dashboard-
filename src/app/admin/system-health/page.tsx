import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSystemHealthSnapshot } from "@/lib/systemHealth";
import type { SeriesSourceRanking, Recommendation, SyncTriggerRecord } from "@/lib/systemHealth";

// Internal operational diagnostics — NOT a public page (Production
// Reliability & Institutional Upgrade, Part 11). Gated on the signed-in
// user's email matching ADMIN_EMAIL exactly; fails closed (renders a plain
// 404, not a "you're not authorized" message, so its existence isn't
// advertised to anyone who stumbles onto the URL) if that env var is
// unset or the session doesn't match. robots noindex is a secondary,
// best-effort signal only — the real gate is the auth check below.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, string> = {
  ok: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-rose-400",
  unknown: "bg-slate-400",
  overdue: "bg-amber-400",
  "never-run": "bg-rose-400",
};

const SEVERITY_COLOR: Record<Recommendation["severity"], string> = {
  critical: "border-rose-500/40 bg-rose-950/30",
  warning: "border-amber-500/40 bg-amber-950/30",
  info: "border-sky-500/40 bg-sky-950/30",
};

const SEVERITY_TAG: Record<Recommendation["severity"], string> = {
  critical: "text-rose-400",
  warning: "text-amber-400",
  info: "text-sky-400",
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) + " PKT";
}

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

/**
 * Production Readiness Audit (Phase 6A.3) finding: a run where SOME
 * indicators fail (e.g. "18 unchanged | 0 updated | 3 failed") still logs
 * overall status "success" (see scripts/ingestSbp.ts — one bad indicator
 * must never abort the others, so the JOB itself did succeed). But a green
 * dot next to that run, with the failure count buried inside a detail
 * string, is exactly the "misleading healthy status" this audit warned
 * against. This parses the "N failed" count back out of that same detail
 * string (no schema change) purely to pick the dot color — it never
 * changes the underlying status value.
 */
function hasReportedFailures(detail: string | null): boolean {
  if (!detail) return false;
  const match = detail.match(/(\d+)\s+failed/);
  return !!match && Number(match[1]) > 0;
}

function rankBadge(rank: number): string {
  if (rank === 1) return "text-emerald-400 font-bold";
  if (rank === 2) return "text-sky-400";
  return "text-slate-400";
}

export default async function SystemHealthPage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== adminEmail) notFound();

  const snapshot = await getSystemHealthSnapshot();

  return (
    <main className="min-h-screen bg-[#05060f] px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="mt-1 text-sm text-slate-400">
            Internal diagnostics — generated {fmt(snapshot.generatedAt)}. Not linked from anywhere public.
          </p>
        </div>

        {/* ── Recommendations ────────────────────────────────────────────── */}
        {snapshot.recommendations.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold">Recommendations</h2>
            <p className="mt-1 text-xs text-slate-500">Deterministic rules engine — every insight is derived from measured historical data, no AI invention.</p>
            <div className="mt-3 space-y-2">
              {snapshot.recommendations.map((r, i) => (
                <div key={i} className={`rounded-xl border p-3 ${SEVERITY_COLOR[r.severity]}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 text-[10px] font-semibold uppercase ${SEVERITY_TAG[r.severity]}`}>{r.severity}</span>
                    <div>
                      <p className="text-sm text-white">{r.message}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{r.evidence}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Data Sources ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold">Data Sources &amp; Infrastructure</h2>
          <p className="mt-1 text-xs text-slate-500">Each row is a real, just-executed check against the live dependency, with measured response time — not a cached/historical record.</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Detail</th>
                  <th className="px-4 py-2">Response Time</th>
                  <th className="px-4 py-2">Latest Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {snapshot.dataSources.map((s) => (
                  <tr key={s.name}>
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s.status]}`} />
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{s.detail}</td>
                    <td className="px-4 py-2.5 text-slate-400">{s.latencyMs >= 0 ? `${s.latencyMs}ms` : "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{s.latestDate ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Canonical SBP Freshness (Institutional Data Core Wave 1) ──── */}
        <section>
          <h2 className="text-lg font-semibold">Canonical SBP Freshness</h2>
          <p className="mt-1 text-xs text-slate-500">
            What canonical_observations actually has for each of the 20 SBP indicators, and how old that is vs. each indicator&apos;s own declared cadence — never a re-query of SBP itself (which is Cloudflare-blocked from every shared cloud/CI network this platform has tested). Populated by the local ingestion runner (<code>npm run ingest:sbp</code>).
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Indicator</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Why</th>
                  <th className="px-4 py-2">Latest Period</th>
                  <th className="px-4 py-2">Age</th>
                  <th className="px-4 py-2">SLA Grace</th>
                  <th className="px-4 py-2">Ingested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {snapshot.canonicalSbpFreshness.map((f) => (
                  <tr key={f.indicatorKey}>
                    <td className="px-4 py-2.5 font-medium">{f.indicatorKey}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[f.status === "fresh" ? "ok" : f.status === "overdue" ? "overdue" : "never-run"]}`} />
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {f.status !== "overdue" ? (
                        <span className="text-slate-500">—</span>
                      ) : f.ingestionStatus === "failing" ? (
                        <span className="text-rose-400" title={f.lastIngestionError ?? undefined}>ingestion failing</span>
                      ) : f.ingestionStatus === "ok" ? (
                        <span className="text-amber-400">SBP hasn&apos;t published newer data</span>
                      ) : (
                        <span className="text-slate-500">no recent ingestion attempt recorded</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{f.latestObservationPeriod ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{f.ageDays !== null ? `${f.ageDays}d` : "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{f.slaGraceDays}d ({f.frequency})</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{fmt(f.vintage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Source Health (Phase 3 live data) ─────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold">Source Health — Last 7 Days</h2>
          <p className="mt-1 text-xs text-slate-500">Per-source attempt outcomes recorded by the sync pipeline (source_health_log). Populates after cron runs.</p>
          {snapshot.sourceHealth.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No source health data yet — runs after the first cron execution post-Phase 3 deployment.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Source</th>
                    <th className="px-4 py-2">Series</th>
                    <th className="px-4 py-2">Success Rate</th>
                    <th className="px-4 py-2">Consec. Failures</th>
                    <th className="px-4 py-2">Last Success</th>
                    <th className="px-4 py-2">Last Obs Date</th>
                    <th className="px-4 py-2">Last Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {snapshot.sourceHealth.map((h, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-medium">{h.sourceName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{h.seriesSlug}</td>
                      <td className="px-4 py-2.5">
                        <span className={h.successRatePct >= 90 ? "text-emerald-400" : h.successRatePct >= 70 ? "text-amber-400" : "text-rose-400"}>
                          {h.successRatePct}%
                        </span>
                        <span className="ml-1 text-slate-500 text-xs">({h.totalAttempts})</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={h.consecutiveFailures >= 3 ? "text-rose-400 font-semibold" : h.consecutiveFailures > 0 ? "text-amber-400" : "text-slate-500"}>
                          {h.consecutiveFailures}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{fmt(h.lastSucceededAt)}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{h.lastObservationDate ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">{h.lastError ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Source Benchmarks (Phase 4) ────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold">Source Benchmarks — Last 30 Days</h2>
          <p className="mt-1 text-xs text-slate-500">Latency percentiles (avg / median / p95), success rate, fallback rate, and observation freshness per source. Computed from source_health_log during sync — not at render time.</p>
          {snapshot.sourceBenchmarks.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No benchmark data yet — accumulates after cron runs.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Source</th>
                    <th className="px-4 py-2">Series</th>
                    <th className="px-4 py-2">Attempts</th>
                    <th className="px-4 py-2">Success</th>
                    <th className="px-4 py-2">Fallbacks</th>
                    <th className="px-4 py-2">Avg Lat</th>
                    <th className="px-4 py-2">Median</th>
                    <th className="px-4 py-2">p95</th>
                    <th className="px-4 py-2">Freshness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {snapshot.sourceBenchmarks.map((b, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-medium text-xs">{b.sourceName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{b.seriesSlug}</td>
                      <td className="px-4 py-2.5 text-slate-400">{b.totalAttempts}</td>
                      <td className="px-4 py-2.5">
                        <span className={b.successRatePct >= 90 ? "text-emerald-400" : b.successRatePct >= 70 ? "text-amber-400" : "text-rose-400"}>
                          {b.successRatePct}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{b.totalFallbacks > 0 ? <span className="text-amber-400">{b.totalFallbacks}</span> : "0"}</td>
                      <td className="px-4 py-2.5 text-slate-400">{fmtMs(b.avgLatencyMs)}</td>
                      <td className="px-4 py-2.5 text-slate-400">{fmtMs(b.medianLatencyMs)}</td>
                      <td className="px-4 py-2.5 text-slate-400">{fmtMs(b.p95LatencyMs)}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">
                        {b.avgFreshnessDays !== null ? `${b.avgFreshnessDays}d lag` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Source Rankings (Phase 4) ──────────────────────────────────── */}
        {snapshot.sourceRankings.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold">Source Rankings</h2>
            <p className="mt-1 text-xs text-slate-500">
              Composite score: reliability 50% + latency efficiency 20% + publication lead 30%.
              Ranking updates automatically as data accumulates. Sources with insufficient data show equal weighting defaults.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {snapshot.sourceRankings.map((sr: SeriesSourceRanking) => (
                <div key={sr.seriesSlug} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="font-mono text-xs text-slate-400 mb-2">{sr.seriesSlug}</p>
                  <div className="space-y-1.5">
                    {sr.rankings.map((r) => (
                      <div key={r.sourceName} className="flex items-center gap-2 text-xs">
                        <span className={`w-4 text-center font-mono ${rankBadge(r.rank)}`}>#{r.rank}</span>
                        <span className="flex-1 truncate text-slate-300">{r.sourceName}</span>
                        <span className={`${r.reliabilityPct >= 90 ? "text-emerald-400" : "text-amber-400"}`}>{r.reliabilityPct}%</span>
                        {r.avgLatencyMs !== null && <span className="text-slate-500">{fmtMs(r.avgLatencyMs)}</span>}
                        {r.avgLeadHours !== null && r.avgLeadHours > 0 && <span className="text-sky-400">+{r.avgLeadHours}h</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Publication Lead Analysis (Phase 4) ───────────────────────── */}
        {snapshot.publicationLeads.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold">Publication Lead Analysis</h2>
            <p className="mt-1 text-xs text-slate-500">
              Which source had each data period first? Lead is measured vs. the slowest source that also observed the same period.
              Rank #1 = fastest. Requires multiple sources per series to show meaningful comparisons.
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Series</th>
                    <th className="px-4 py-2">Obs Period</th>
                    <th className="px-4 py-2">Rank</th>
                    <th className="px-4 py-2">Source</th>
                    <th className="px-4 py-2">First Seen</th>
                    <th className="px-4 py-2">Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {snapshot.publicationLeads.map((l, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{l.seriesSlug}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{l.observationDate}</td>
                      <td className={`px-4 py-2.5 font-mono ${rankBadge(l.pubRank)}`}>#{l.pubRank}</td>
                      <td className="px-4 py-2.5 text-xs">{l.sourceName}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{fmt(l.firstSeenAt)}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {l.leadHoursVsSlowest > 0
                          ? <span className="text-emerald-400">+{l.leadHoursVsSlowest}h</span>
                          : <span className="text-slate-500">baseline</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Sync Trigger History (Phase 4) ─────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold">Sync Trigger History</h2>
          <p className="mt-1 text-xs text-slate-500">
            One row per HTTP invocation of the sync endpoint. Scheduler-agnostic: any caller that provides the CRON_SECRET bearer token is logged here with its identity.
          </p>
          {snapshot.syncTriggers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No trigger history yet — populates after the first cron run post-Phase 4 deployment.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {snapshot.syncTriggers.map((t: SyncTriggerRecord) => (
                <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-sm capitalize">{t.schedulerName}</span>
                    <span className="text-xs text-slate-400">{fmt(t.triggeredAt)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-400">
                    <span>Duration: <span className="text-white">{fmtMs(t.totalDurationMs)}</span></span>
                    <span>Type: <span className="text-white">{t.triggerType}</span></span>
                    <span>Synced: <span className="text-emerald-400">{t.totalSynced}</span></span>
                    {t.totalFailed > 0 && <span>Failed: <span className="text-rose-400">{t.totalFailed}</span></span>}
                    {t.schedulerVersion && <span>Version: <span className="font-mono text-white">{t.schedulerVersion.slice(0, 20)}</span></span>}
                    {t.requestId && <span>ReqID: <span className="font-mono text-white">{t.requestId.slice(0, 12)}</span></span>}
                  </div>
                  {t.jobsSummary.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] text-slate-500">Jobs ({t.jobsSummary.length})</summary>
                      <div className="mt-1 space-y-0.5">
                        {t.jobsSummary.map((j, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${j.status === "success" ? "bg-emerald-400" : j.status === "skipped" ? "bg-sky-400" : "bg-rose-400"}`} />
                            <span className="font-mono">{j.jobName}</span>
                            <span className="text-slate-600">·</span>
                            <span>{j.status}</span>
                            <span className="text-slate-600">·</span>
                            <span>{fmtMs(j.durationMs)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── AI Providers ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold">AI Providers</h2>
          <p className="mt-1 text-xs text-slate-500">
            Process-local health tracking — reflects only this serverless instance&apos;s recent calls, not a global view.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Provider / Model</th>
                  <th className="px-4 py-2">Attempts</th>
                  <th className="px-4 py-2">Success Rate</th>
                  <th className="px-4 py-2">Avg Latency</th>
                  <th className="px-4 py-2">Consecutive Failures</th>
                  <th className="px-4 py-2">Cooldown</th>
                  <th className="px-4 py-2">Last Failure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {snapshot.aiProviders.map((p) => (
                  <tr key={p.step}>
                    <td className="px-4 py-2.5 font-medium">{p.provider} — {p.model}</td>
                    <td className="px-4 py-2.5 text-slate-400">{p.totalAttempts} ({p.totalSuccesses} ok)</td>
                    <td className="px-4 py-2.5 text-slate-400">{p.successRatePct !== null ? `${p.successRatePct}%` : "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{p.avgLatencyMs !== null ? `${p.avgLatencyMs}ms` : "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{p.consecutiveFailures}</td>
                    <td className="px-4 py-2.5">
                      {p.inCooldown ? <span className="text-amber-400">Until {fmt(p.cooldownUntil)}</span> : <span className="text-slate-500">No</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{p.lastFailureReason ? `${p.lastFailureReason} (${fmt(p.lastFailureAt)})` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Weekly Intelligence Engine ─────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold">Weekly Intelligence Engine</h2>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[snapshot.weeklyIntelligence.status]}`} />
              Status: <span className="font-medium">{snapshot.weeklyIntelligence.status}</span>
              {snapshot.weeklyIntelligence.daysOverdue && <span className="text-amber-400">({snapshot.weeklyIntelligence.daysOverdue}d overdue)</span>}
            </p>
            <p className="mt-2 text-sm text-slate-400">Last computed: {fmt(snapshot.weeklyIntelligence.lastComputedAt)}</p>
            <p className="text-sm text-slate-400">Next due: {fmt(snapshot.weeklyIntelligence.nextDueAt)}</p>
          </div>
        </section>

        {/* ── Cron History ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold">Cron History</h2>
          <p className="mt-1 text-xs text-slate-500">
            Persisted run history (cron_run_log) — up to 50 runs per job. The sync endpoint is scheduler-agnostic: any external scheduler calling it with the CRON_SECRET appears in Sync Trigger History above.
          </p>
          <div className="mt-3 space-y-3">
            {snapshot.cronJobs.map((job) => (
              <div key={job.path + job.jobNames.join(",")} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-sm">{job.path}</p>
                  <p className="text-xs text-sky-400">{job.schedule}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">{job.description}</p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/[0.02] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      Last Success{job.lastSuccess && hasReportedFailures(job.lastSuccess.detail) && (
                        <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-amber-400 normal-case tracking-normal">partial failures</span>
                      )}
                    </p>
                    {job.lastSuccess ? (
                      <>
                        <p className={`mt-1 text-xs ${hasReportedFailures(job.lastSuccess.detail) ? "text-amber-300" : "text-slate-300"}`}>{fmt(job.lastSuccess.startedAt)} · {job.lastSuccess.durationMs}ms</p>
                        <p className="text-[11px] text-slate-500">{job.lastSuccess.jobName}{job.lastSuccess.detail ? ` — ${job.lastSuccess.detail}` : ""}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">No successful run recorded yet</p>
                    )}
                  </div>
                  <div className="rounded-lg bg-white/[0.02] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Last Failure</p>
                    {job.lastFailure ? (
                      <>
                        <p className="mt-1 text-xs text-rose-400">{fmt(job.lastFailure.startedAt)} · {job.lastFailure.durationMs}ms</p>
                        <p className="text-[11px] text-slate-500">{job.lastFailure.jobName}{job.lastFailure.detail ? ` — ${job.lastFailure.detail}` : ""}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-emerald-400">None recorded</p>
                    )}
                  </div>
                </div>

                {job.recentRuns.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[11px] text-slate-500">Recent runs ({job.recentRuns.length})</summary>
                    <div className="mt-2 space-y-1">
                      {job.recentRuns.slice(0, 10).map((run, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className={`h-1.5 w-1.5 rounded-full ${run.status !== "success" ? (run.status === "skipped" ? "bg-sky-400" : "bg-rose-400") : hasReportedFailures(run.detail) ? "bg-amber-400" : "bg-emerald-400"}`} />
                          <span>{fmt(run.startedAt)}</span>
                          <span className="text-slate-600">·</span>
                          <span>{run.jobName}</span>
                          <span className="text-slate-600">·</span>
                          <span>{run.status}</span>
                          <span className="text-slate-600">·</span>
                          <span>{run.durationMs}ms</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
