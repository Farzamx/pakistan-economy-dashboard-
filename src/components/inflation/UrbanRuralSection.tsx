// Section 5: urban vs rural inflation — a documented gap, not a chart.
//
// PEIC holds NO rural inflation series of any kind, so no urban-vs-rural
// comparison can be drawn: every candidate chart (clustered bars, dumbbell,
// divergence line, heatmap) needs both sides. PEIC does hold two URBAN series
// (core and food), which appear in the headline/core/food section — but an urban
// figure beside a national one is not an urban-vs-rural comparison, so it is not
// presented as one. Server component.

import { Callout } from "@/components/analytics/ChartFrame";

export default function UrbanRuralSection() {
  return (
    <div className="flex flex-col gap-4">
      <Callout tone="limit" title="Not available: PEIC holds no rural inflation data">
        PBS publishes urban and rural CPI separately, but PEIC stores only national and urban series. Comparing an urban figure with the national headline would not show an urban–rural gap, so no chart is drawn.
      </Callout>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface-2 p-3">
          <p className="text-[14px] font-medium text-pe-text">Available data</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[14px] leading-relaxed text-pe-text-2">
            <li>National headline CPI (year on year, monthly since July 2016)</li>
            <li>Urban core inflation, NFNE (year on year)</li>
            <li>Urban food inflation (year on year)</li>
            <li>National CPI index and 12 national expenditure groups</li>
          </ul>
        </div>
        <div className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface-2 p-3">
          <p className="text-[14px] font-medium text-pe-text">Data needed</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[14px] leading-relaxed text-pe-text-2">
            <li>Urban and rural headline CPI, year on year</li>
            <li>Rural core (NFNE) and rural food inflation</li>
            <li>Urban and rural expenditure-group series, if wanted</li>
          </ul>
          <p className="mt-2 text-[13px] leading-relaxed text-pe-text-3">Likely source: SBP EasyData&rsquo;s urban and rural splits (not yet ingested).</p>
        </div>
      </div>
    </div>
  );
}
