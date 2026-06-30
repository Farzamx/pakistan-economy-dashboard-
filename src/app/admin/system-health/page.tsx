import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSystemHealthSnapshot } from "@/lib/systemHealth";

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

// Forced — without this, Next.js can statically generate this page at
// build time based on whatever the auth check happens to resolve to in
// that one build's execution (e.g. ADMIN_EMAIL unset locally -> notFound()
// reached before cookies() is ever called -> Next never detects a dynamic
// dependency -> the 404 gets baked in and served to EVERY request,
// including a legitimate admin, forever, until the next deploy). This
// must be evaluated fresh per request, every time.
export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, string> = {
  ok: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-rose-400",
  unknown: "bg-slate-400",
  overdue: "bg-amber-400",
  "never-run": "bg-rose-400",
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) + " PKT";
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
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">System Health</h1>
        <p className="mt-1 text-sm text-slate-400">
          Internal diagnostics — generated {fmt(snapshot.generatedAt)}. Not linked from anywhere public.
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Data Sources &amp; Infrastructure</h2>
          <p className="mt-1 text-xs text-slate-500">Each row is a real, just-executed check against the live dependency, with measured response time — not a cached/historical record. Supabase/Resend checks are read-only (no email sent, no data written).</p>
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

        <section className="mt-8">
          <h2 className="text-lg font-semibold">AI Providers</h2>
          <p className="mt-1 text-xs text-slate-500">
            Process-local health tracking (openRouterClient.ts) — reflects only this serverless instance&apos;s own recent calls, not a global view. Zero attempts means this instance hasn&apos;t handled an AI-feature request yet, not necessarily that the provider is unused.
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

        <section className="mt-8">
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

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Cron History</h2>
          <p className="mt-1 text-xs text-slate-500">
            Real persisted run history (cron_run_log, written by every cron route on completion) — up to 50 runs kept per job. Before this, only the configured schedule was knowable; &quot;last successful run&quot;/&quot;last failure&quot; didn&apos;t exist anywhere.
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
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Last Success</p>
                    {job.lastSuccess ? (
                      <>
                        <p className="mt-1 text-xs text-slate-300">{fmt(job.lastSuccess.startedAt)} · {job.lastSuccess.durationMs}ms</p>
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
                          <span className={`h-1.5 w-1.5 rounded-full ${run.status === "success" ? "bg-emerald-400" : run.status === "skipped" ? "bg-sky-400" : "bg-rose-400"}`} />
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
