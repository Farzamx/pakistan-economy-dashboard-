import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { getDataIntegrityAlerts } from "@/lib/economicCalendar/dataIntegrityAlerts";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  }) + " PKT";
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  released: "text-emerald-400",
  scheduled: "text-sky-400",
  postponed: "text-amber-400",
  cancelled: "text-slate-500",
};

interface SeriesRow {
  id: string;
  slug: string;
  title: string;
  cadence: string;
  automation_tier: string;
}

interface EventRow {
  series_id: string;
  event_date: string;
  actual_value: string | null;
  status: string;
  updated_at: string;
}

interface SeriesSyncState {
  series: SeriesRow;
  lastReleased: EventRow | null;
  nextScheduled: EventRow | null;
}

export default async function SyncStatusPage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== adminEmail) notFound();

  const db = createPublicDataClient();
  const today = new Date().toISOString().slice(0, 10);

  // Fetch all automated series
  const { data: seriesData, error: seriesErr } = await db
    .from("economic_event_series")
    .select("id, slug, title, cadence, automation_tier")
    .eq("automation_tier", "automated")
    .order("title");

  if (seriesErr || !seriesData) {
    return (
      <main className="min-h-screen bg-[#05060f] px-6 py-10 text-white">
        <p className="text-rose-400">Error loading series: {seriesErr?.message ?? "unknown"}</p>
      </main>
    );
  }

  const seriesList = seriesData as SeriesRow[];
  const seriesIds = seriesList.map((s) => s.id);

  // Fetch last released events for each automated series
  const { data: releasedData } = await db
    .from("economic_events")
    .select("series_id, event_date, actual_value, status, updated_at")
    .in("series_id", seriesIds)
    .eq("status", "released")
    .order("event_date", { ascending: false })
    .limit(seriesIds.length * 3);

  // Fetch next scheduled events
  const { data: scheduledData } = await db
    .from("economic_events")
    .select("series_id, event_date, actual_value, status, updated_at")
    .in("series_id", seriesIds)
    .eq("status", "scheduled")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(seriesIds.length * 3);

  // Build per-series map
  const releasedBySeriesId = new Map<string, EventRow>();
  for (const e of (releasedData ?? []) as EventRow[]) {
    if (!releasedBySeriesId.has(e.series_id)) {
      releasedBySeriesId.set(e.series_id, e);
    }
  }
  const scheduledBySeriesId = new Map<string, EventRow>();
  for (const e of (scheduledData ?? []) as EventRow[]) {
    if (!scheduledBySeriesId.has(e.series_id)) {
      scheduledBySeriesId.set(e.series_id, e);
    }
  }

  const rows: SeriesSyncState[] = seriesList.map((s) => ({
    series: s,
    lastReleased: releasedBySeriesId.get(s.id) ?? null,
    nextScheduled: scheduledBySeriesId.get(s.id) ?? null,
  }));

  const overdue = rows.filter(
    (r) => !r.nextScheduled || r.nextScheduled.event_date < today,
  );

  // Post-release verification alerts (migration 0041) — surfaced here rather
  // than a new page so there is one internal monitoring surface, not two.
  const integrityAlerts = await getDataIntegrityAlerts("open", 50);

  return (
    <main className="min-h-screen bg-[#05060f] px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <div>
          <h1 className="text-2xl font-bold">Sync Status</h1>
          <p className="mt-1 text-sm text-slate-400">
            Last released and next scheduled event per automated series. Generated at {fmt(new Date().toISOString())}.
          </p>
        </div>

        {/* ── Overdue banner ──────────────────────────────────────────────── */}
        {overdue.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-4 py-3">
            <p className="text-sm font-semibold text-amber-400">
              {overdue.length} series {overdue.length === 1 ? "has" : "have"} no upcoming scheduled event
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {overdue.map((r) => r.series.slug).join(", ")}
            </p>
          </div>
        )}

        {/* ── Data integrity alerts (post-release verification, migration 0041) ── */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Data Integrity Alerts ({integrityAlerts.length} open)
          </h2>
          {integrityAlerts.length === 0 ? (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-4 py-3 text-sm text-emerald-400">
              No open alerts — every event released in the last 48 hours that could be re-verified still matches its official source.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-rose-500/30">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-rose-950/20 text-left text-xs uppercase text-slate-400">
                    <th className="px-4 py-3 font-medium">Series / Event</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Released Value</th>
                    <th className="px-4 py-3 font-medium">Fresh Value</th>
                    <th className="px-4 py-3 font-medium">Detected</th>
                    <th className="px-4 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {integrityAlerts.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.02] align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{a.seriesSlug}</p>
                        <p className="text-[11px] text-slate-500">{fmtDate(a.eventDate)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase text-rose-400">{a.mismatchType}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-400">{a.releasedActualValue}</td>
                      <td className="px-4 py-3 font-mono text-amber-400">{a.freshValue ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fmt(a.detectedAt)}</td>
                      <td className="px-4 py-3 max-w-md text-xs text-slate-300">{a.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-600">
            Never auto-corrected — the released value shown above remains authoritative until a maintainer reviews and calls resolve_data_integrity_alert().
          </p>
        </section>

        {/* ── Series table ────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Automated Series ({seriesList.length})</h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3 font-medium">Series</th>
                  <th className="px-4 py-3 font-medium">Cadence</th>
                  <th className="px-4 py-3 font-medium">Last Released</th>
                  <th className="px-4 py-3 font-medium">Actual Value</th>
                  <th className="px-4 py-3 font-medium">Released At</th>
                  <th className="px-4 py-3 font-medium">Next Scheduled</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map(({ series, lastReleased, nextScheduled }) => {
                  const isOverdue = !nextScheduled || nextScheduled.event_date < today;
                  return (
                    <tr key={series.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{series.title}</p>
                        <p className="text-[11px] text-slate-500">{series.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{series.cadence}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {lastReleased ? fmtDate(lastReleased.event_date) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {lastReleased?.actual_value
                          ? <span className="font-mono text-emerald-400">{lastReleased.actual_value}</span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {lastReleased ? fmt(lastReleased.updated_at) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {nextScheduled
                          ? <span className={isOverdue ? "text-amber-400" : "text-sky-400"}>{fmtDate(nextScheduled.event_date)}</span>
                          : <span className="text-rose-500">None</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isOverdue
                          ? <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-400">OVERDUE</span>
                          : <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">OK</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <p className="text-xs text-slate-600">
          Internal — not indexed. Auth: {user.email}. Data from{" "}
          <code className="text-slate-500">economic_events</code> and{" "}
          <code className="text-slate-500">economic_event_series</code>.
        </p>
      </div>
    </main>
  );
}
