"use client";

import { useState } from "react";
import ComparisonCard from "./ComparisonCard";
import ComparisonControls from "./ComparisonControls";
import type { ChartMode, ComparisonChartBundle, TimeRange } from "@/lib/comparisons/comparisonData";

interface ComparisonDetailViewProps {
  bundle: ComparisonChartBundle;
}

export default function ComparisonDetailView({ bundle }: ComparisonDetailViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("5y");
  const [chartMode, setChartMode] = useState<ChartMode>("raw");

  return (
    <div className="flex flex-col gap-4">
      <ComparisonControls
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        chartMode={chartMode}
        onChartModeChange={setChartMode}
      />
      <ComparisonCard
        def={bundle.def}
        merged={bundle.merged}
        sourceA={bundle.sourceA}
        sourceB={bundle.sourceB}
        hasError={bundle.hasError}
        timeRange={timeRange}
        chartMode={chartMode}
      />
    </div>
  );
}
