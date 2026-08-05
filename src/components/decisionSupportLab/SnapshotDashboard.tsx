"use client";

// Section E — /decision-support-lab/snapshot. Assembles every tool result
// the user has explicitly saved (via SaveToSnapshotButton.tsx / D3) into
// one scannable view, grouped by tool, most-recent first. Reads
// calculation_snapshots generically rather than hardcoding a fixed set of
// tool cards — it shows whatever the user has actually saved, and grows
// automatically as more tools wire up snapshotPayload.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { getCalculationSnapshots, type CalculationSnapshot } from "@/lib/supabase/calculationSnapshots";
import { DECISION_SUPPORT_TOOLS } from "@/lib/decisionSupportLab/tools";

function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function formatOutputValue(value: unknown): string {
  if (typeof value === "number") {
    return Math.abs(value) >= 1000 || Math.abs(value) < 1 ? value.toLocaleString("en-US", { maximumFractionDigits: 1 }) : value.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface ToolGroup {
  toolId: string;
  titleKey: string | null;
  href: string;
  latest: CalculationSnapshot;
}

function groupLatestPerTool(snapshots: CalculationSnapshot[]): ToolGroup[] {
  const byTool = new Map<string, CalculationSnapshot>();
  for (const snap of snapshots) {
    const existing = byTool.get(snap.toolId);
    if (!existing || snap.createdAt > existing.createdAt) byTool.set(snap.toolId, snap);
  }
  return Array.from(byTool.entries())
    .map(([toolId, latest]) => {
      const tool = DECISION_SUPPORT_TOOLS.find((t) => t.id === toolId);
      return { toolId, titleKey: tool?.titleKey ?? null, href: tool?.href ?? `/decision-support-lab/${toolId}`, latest };
    })
    .sort((a, b) => (a.latest.createdAt < b.latest.createdAt ? 1 : -1));
}

export default function SnapshotDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [snapshots, setSnapshots] = useState<CalculationSnapshot[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getCalculationSnapshots(undefined, 100)
      .then((rows) => {
        if (!cancelled) setSnapshots(rows);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="glass-card rounded-xl p-6 text-center sm:p-8">
        <p className="text-sm font-semibold text-white light:text-slate-900">Sign in to see your saved results</p>
        <p className="mt-1.5 text-sm text-white/55 light:text-slate-500">Your snapshot collects every result you&apos;ve saved from tools across the Lab, in one place.</p>
        <Link href="/login" className="mt-4 inline-flex rounded-lg bg-neon-blue px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]">
          Sign in
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="glass-card rounded-xl border border-rose-400/20 p-6 text-center sm:p-8">
        <p className="text-sm font-semibold text-white light:text-slate-900">Couldn&apos;t load your snapshot</p>
        <p className="mt-1.5 text-sm text-white/55 light:text-slate-500">Something went wrong fetching your saved results — try refreshing the page.</p>
      </div>
    );
  }

  if (snapshots === null) {
    return <div className="glass-card h-32 animate-pulse rounded-xl motion-reduce:animate-none" aria-hidden="true" />;
  }

  if (snapshots.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center sm:p-8">
        <p className="text-sm font-semibold text-white light:text-slate-900">Your snapshot is empty</p>
        <p className="mt-1.5 max-w-md mx-auto text-sm text-white/55 light:text-slate-500">
          Open any tool, compute a result, and click &ldquo;Save this result to my snapshot&rdquo; — it&apos;ll show up here, with a link back to where it came from.
        </p>
        <Link href="/decision-support-lab" className="mt-4 inline-flex rounded-lg border border-[var(--border-subtle)] px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue">
          Browse tools
        </Link>
      </div>
    );
  }

  const groups = groupLatestPerTool(snapshots);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <div key={g.toolId} className="glass-card flex flex-col gap-3 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white light:text-slate-900">{g.titleKey ? t(g.titleKey) : g.toolId.replace(/-/g, " ")}</p>
            <span className="text-[11px] text-white/40 light:text-slate-400">{formatDate(g.latest.createdAt)}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {Object.entries(g.latest.outputs)
              .slice(0, 3)
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-white/50 light:text-slate-500">{humanizeKey(key)}</span>
                  <span className="text-mono-num font-semibold tabular-nums text-white light:text-slate-800">{formatOutputValue(value)}</span>
                </div>
              ))}
          </div>
          <Link href={g.href} className="mt-1 text-xs font-medium text-neon-blue hover:underline">
            Open in tool →
          </Link>
        </div>
      ))}
    </div>
  );
}
