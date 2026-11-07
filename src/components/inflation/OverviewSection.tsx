// Section 1: the opening KPI strip.
//
// The headline and core tiles show the EXISTING canonical KPI (value, change and
// freshness verdict exactly as every other page shows them) — nothing here
// recomputes or restyles those numbers. The urban-food, month-on-month and index
// tiles come from series that have no freshness verdict defined, so each says
// what it is and, if it ends before the headline does, says so plainly rather
// than passing an older reading off as current.
//
// Server component.

import DataQualityBadge from "@/components/DataQualityBadge";
import { KpiTile } from "@/components/analytics/KpiTile";
import type { SbpIndicatorResult } from "@/lib/data/sbp";
import { formatPercent, formatValue } from "@/lib/analytics/scales";
import { monthIndex, monthLabel, type MonthKey, type MonthlyPoint } from "@/lib/inflation/periods";
import type { InflationViewModel } from "@/lib/inflation/viewModel";

function lastTwo(points: readonly MonthlyPoint[]): { latest: MonthlyPoint; previous: MonthlyPoint | null } | null {
  if (points.length === 0) return null;
  const latest = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : null;
  // "Previous" must be the immediately preceding month; across a gap it would not be a month-on-month comparison.
  return { latest, previous: prev && monthIndex(latest.month) - monthIndex(prev.month) === 1 ? prev : null };
}

function lagWarning(period: MonthKey, horizon: MonthKey | null): string | null {
  if (!horizon) return null;
  const behind = monthIndex(horizon) - monthIndex(period);
  if (behind <= 0) return null;
  return `This series ends ${behind} month${behind === 1 ? "" : "s"} before the headline (${monthLabel(horizon)}); its latest reading is for ${monthLabel(period)}.`;
}

export default function OverviewSection({ headlineKpi, coreKpi, model }: { headlineKpi: SbpIndicatorResult; coreKpi: SbpIndicatorResult | null; model: InflationViewModel }) {
  const food = lastTwo(model.food);
  const mom = lastTwo(model.mom);
  const idx = lastTwo(model.index);
  const hk = headlineKpi.kpi;
  const ck = coreKpi?.kpi ?? null;

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <KpiTile
          label="Headline CPI inflation"
          kind="Year on year"
          value={`${hk.value}${hk.unit ?? "%"}`}
          change={hk.change}
          period={model.horizon ? monthLabel(model.horizon) : (hk.latestDate ?? "—")}
          previous={(() => {
            const t = lastTwo(model.headline);
            return t?.previous ? `${formatPercent(t.previous.value)} in ${monthLabel(t.previous.month)}` : null;
          })()}
          source="National CPI · PBS / SBP EasyData"
          badge={hk.freshness ? <DataQualityBadge kpi={hk} freshness={hk.freshness} /> : undefined}
          note="Prices vs the same month a year earlier, national."
        />
        {ck && (
          <KpiTile
            label="Core inflation (NFNE)"
            kind="Year on year"
            value={`${ck.value}${ck.unit ?? "%"}`}
            change={ck.change}
            period={(() => {
              const t = lastTwo(model.core);
              return t ? monthLabel(t.latest.month) : (ck.latestDate ?? "—");
            })()}
            previous={(() => {
              const t = lastTwo(model.core);
              return t?.previous ? `${formatPercent(t.previous.value)} in ${monthLabel(t.previous.month)}` : null;
            })()}
            source="Urban NFNE core · PBS / SBP EasyData"
            badge={ck.freshness ? <DataQualityBadge kpi={ck} freshness={ck.freshness} /> : undefined}
            note="Excludes food and energy. Urban households only."
          />
        )}
        {food && (
          <KpiTile
            label="Food inflation (urban)"
            kind="Year on year"
            value={formatPercent(food.latest.value)}
            change={food.previous ? `${formatValue(food.latest.value - food.previous.value, 1, { signed: true })} pp vs ${monthLabel(food.previous.month)}` : null}
            period={monthLabel(food.latest.month)}
            previous={food.previous ? `${formatPercent(food.previous.value)} in ${monthLabel(food.previous.month)}` : null}
            source="Urban Food CPI · SBP EasyData"
            warning={lagWarning(food.latest.month, model.horizon)}
            note="Urban households only: PBS publishes no national food series."
          />
        )}
        {mom && (
          <KpiTile
            label="Monthly price change"
            kind="Month on month"
            value={formatPercent(mom.latest.value)}
            change={mom.previous ? `${formatValue(mom.latest.value - mom.previous.value, 1, { signed: true })} pp vs ${monthLabel(mom.previous.month)}` : null}
            period={monthLabel(mom.latest.month)}
            previous={mom.previous ? `${formatPercent(mom.previous.value)} in ${monthLabel(mom.previous.month)}` : null}
            source="Derived from the PBS CPI index"
            warning={lagWarning(mom.latest.month, model.horizon)}
            note="This month's index ÷ last month's − 1. Not an annual rate."
          />
        )}
        {idx && (
          <KpiTile
            label="CPI index level"
            kind="Index (2015-16 = 100)"
            value={formatValue(idx.latest.value, 2)}
            change={idx.previous ? `${formatValue(idx.latest.value - idx.previous.value, 2, { signed: true })} index points vs ${monthLabel(idx.previous.month)}` : null}
            period={monthLabel(idx.latest.month)}
            previous={idx.previous ? `${formatValue(idx.previous.value, 2)} in ${monthLabel(idx.previous.month)}` : null}
            source="National CPI index · PBS"
            warning={lagWarning(idx.latest.month, model.horizon)}
            note={`A price level, not an inflation rate: ${formatValue(idx.latest.value, 0)} means prices are ${formatValue(idx.latest.value / 100, 2)} times their 2015-16 level.`}
          />
        )}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-pe-text-3">
        Urban and rural headline inflation are not shown: PEIC does not hold a rural series (see{" "}
        <a href="#urban-rural" className="text-pe-accent underline underline-offset-2">Urban vs rural</a>).
      </p>
    </div>
  );
}
