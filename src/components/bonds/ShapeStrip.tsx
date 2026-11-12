import { SHAPE_LABEL, dayNumber, type CurveShape, type ShapeRegime } from "@/lib/bonds/analytics";
import { formatDate } from "@/lib/policyRate/format";

const COLOR: Record<CurveShape, string> = { upward: "var(--pe-viz-teal)", flat: "var(--pe-viz-slate)", inverted: "var(--pe-viz-orange)" };

/**
 * One bar from the first to the last auction, coloured by the curve's shape at each auction. Each run is drawn from its first auction to the first
 * auction of the next run, so the strip has no holes; an auction with no slope (a failed tenor) does not split a run. Server-compatible (no hooks).
 */
export default function ShapeStrip({ regimes, height = 26, ariaLabel }: { regimes: readonly ShapeRegime[]; height?: number; ariaLabel: string }) {
  if (regimes.length === 0) return null;
  const start = dayNumber(regimes[0].from);
  const end = dayNumber(regimes[regimes.length - 1].to);
  const span = Math.max(end - start, 1);
  const pct = (d: number) => ((d - start) / span) * 100;
  const years = [...new Set(regimes.flatMap((r) => [r.from.slice(0, 4), r.to.slice(0, 4)]))];
  return (
    <div>
      <svg role="img" aria-label={ariaLabel} viewBox="0 0 100 10" preserveAspectRatio="none" width="100%" height={height} className="block overflow-hidden rounded-[var(--pe-radius-sm)]">
        {regimes.map((r, i) => {
          const x0 = pct(dayNumber(r.from));
          const x1 = i === regimes.length - 1 ? 100 : pct(dayNumber(regimes[i + 1].from));
          return (
            <rect key={`${r.from}-${i}`} x={x0} y={0} width={Math.max(x1 - x0, 0.15)} height={10} fill={COLOR[r.shape]}>
              <title>{`${SHAPE_LABEL[r.shape]}: ${formatDate(r.from)} to ${formatDate(r.to)} (${r.auctions} auction${r.auctions === 1 ? "" : "s"}, average ${r.averageBp > 0 ? "+" : ""}${r.averageBp} bp)`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-pe-text-3" aria-hidden="true">
        <span>{years[0]}</span>
        <span>{years[years.length - 1]}</span>
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-pe-text-2" aria-label="Key">
        {(["upward", "flat", "inverted"] as CurveShape[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: COLOR[s] }} />
            {SHAPE_LABEL[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}
