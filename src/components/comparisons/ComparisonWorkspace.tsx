"use client";

import { useMemo, useState } from "react";
import ComparisonCard from "./ComparisonCard";
import ComingSoonCard from "./ComingSoonCard";
import ComparisonControls from "./ComparisonControls";
import CustomComparisonBuilder from "./CustomComparisonBuilder";
import PerformanceCalculator from "./PerformanceCalculator";
import SectorCompositionChart, { type SectorCompositionPoint } from "./SectorCompositionChart";
import type { ChartMode, ComparisonChartBundle, TimeRange } from "@/lib/comparisons/comparisonData";
import { applyTimeRange } from "@/lib/comparisons/comparisonData";
import {
  COMPARISON_GROUPS,
  COMING_SOON_COMPARISONS,
  SECTOR_COMPOSITION,
  type ComparisonGroupId,
} from "@/lib/comparisons/comparisonRegistry";
import type { AssetTimelinePoint } from "@/lib/comparisons/performanceCalculator";

interface ComparisonWorkspaceProps {
  bundles: ComparisonChartBundle[];
  sectorComposition: SectorCompositionPoint[] | null;
  performanceTimeline: AssetTimelinePoint[] | null;
}

export default function ComparisonWorkspace({
  bundles,
  sectorComposition,
  performanceTimeline,
}: ComparisonWorkspaceProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("5y");
  const [chartMode, setChartMode] = useState<ChartMode>("raw");

  const bundlesByGroup = useMemo(() => {
    const map = new Map<ComparisonGroupId, ComparisonChartBundle[]>();
    for (const bundle of bundles) {
      const list = map.get(bundle.def.group) ?? [];
      list.push(bundle);
      map.set(bundle.def.group, list);
    }
    return map;
  }, [bundles]);

  const comingSoonByGroup = useMemo(() => {
    const map = new Map<ComparisonGroupId, typeof COMING_SOON_COMPARISONS>();
    for (const item of COMING_SOON_COMPARISONS) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, []);

  const sectorWindowed = useMemo(() => {
    if (!sectorComposition) return null;
    const merged = sectorComposition.map((p) => ({ key: p.year, a: p.agriculture, b: p.industry }));
    const windowed = applyTimeRange(merged, timeRange);
    const windowedKeys = new Set(windowed.map((p) => p.key));
    return sectorComposition.filter((p) => windowedKeys.has(p.year));
  }, [sectorComposition, timeRange]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Comparisons</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Live, source-attributed comparisons between Pakistan&apos;s key indicators, international peers, and investable assets — every chart traces back to a real data source, with no estimated or fabricated values.
          </p>
        </div>
        <ComparisonControls
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          chartMode={chartMode}
          onChartModeChange={setChartMode}
        />
      </div>

      {COMPARISON_GROUPS.map((group) => {
        const groupBundles = bundlesByGroup.get(group.id) ?? [];
        const groupComingSoon = comingSoonByGroup.get(group.id) ?? [];
        const isSectorGroup = group.id === "economic-structure";

        if (groupBundles.length === 0 && groupComingSoon.length === 0 && !isSectorGroup) return null;

        return (
          <section key={group.id} id={`comparisons-${group.id}`} className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{group.label}</h2>
              <p className="text-sm text-[var(--text-muted)]">{group.description}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {groupBundles.map((bundle) => (
                <ComparisonCard
                  key={bundle.def.slug}
                  def={bundle.def}
                  merged={bundle.merged}
                  sourceA={bundle.sourceA}
                  sourceB={bundle.sourceB}
                  hasError={bundle.hasError}
                  timeRange={timeRange}
                  chartMode={chartMode}
                />
              ))}
              {groupComingSoon.map((item) => (
                <ComingSoonCard key={item.title} item={item} />
              ))}
              {isSectorGroup && sectorWindowed && (
                <div className="glass-card flex flex-col gap-4 rounded-2xl p-5 sm:col-span-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{SECTOR_COMPOSITION.title}</h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{SECTOR_COMPOSITION.description}</p>
                  </div>
                  <SectorCompositionChart data={sectorWindowed} />
                  <p className="text-[11px] text-[var(--text-muted)]">Source: World Bank</p>
                </div>
              )}
              {isSectorGroup && !sectorWindowed && (
                <div className="glass-card flex h-[280px] items-center justify-center rounded-2xl p-5 text-center sm:col-span-2">
                  <p className="text-sm text-[var(--text-muted)]">GDP sector composition data is unavailable right now.</p>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {performanceTimeline && performanceTimeline.length > 0 && (
        <section className="flex flex-col gap-4">
          <PerformanceCalculator timeline={performanceTimeline} />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <CustomComparisonBuilder />
      </section>
    </div>
  );
}
