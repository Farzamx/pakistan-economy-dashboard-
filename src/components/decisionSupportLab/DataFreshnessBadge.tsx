"use client";

interface Props {
  sourceName: string;
  lastUpdated: string;
  dataFrequency: string;
}

/** A second, more prominent render of the same three values every tool already threads into ExplainTheMath — placed near the results instead of only inside the collapsed methodology panel. No new data fetching. */
export default function DataFreshnessBadge({ sourceName, lastUpdated, dataFrequency }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45 light:text-slate-400">
      <span className="flex items-center gap-1">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {sourceName}
      </span>
      {lastUpdated && <span>Last updated {lastUpdated}</span>}
      <span>Updates {dataFrequency.toLowerCase()}</span>
    </div>
  );
}
