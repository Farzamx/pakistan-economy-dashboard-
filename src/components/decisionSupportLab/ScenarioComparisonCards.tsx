"use client";

export interface ScenarioCardData {
  label: "Pessimistic" | "Base Case" | "Optimistic";
  returnPct: number;
  projectedFutureValue: number;
  fundingGapPct: number;
  isOnTrack: boolean;
}

interface Props {
  scenarios: ScenarioCardData[];
}

const TONE: Record<ScenarioCardData["label"], string> = {
  Pessimistic: "border-rose-400/30",
  "Base Case": "border-neon-blue/30",
  Optimistic: "border-emerald-400/30",
};

/** Three fixed-assumption deterministic runs (Best/Base/Worst) — distinct from the probabilistic Monte Carlo gauge, this is "if returns are consistently X%, here's exactly where you land," the classic scenario-comparison view every institutional planning tool shows alongside a probability distribution. */
export default function ScenarioComparisonCards({ scenarios }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {scenarios.map((s) => (
        <div key={s.label} className={`glass-card rounded-xl border p-4 ${TONE[s.label]}`}>
          <p className="text-label text-white/40 light:text-slate-400">{s.label}</p>
          <p className="mt-1 text-xs text-white/50 light:text-slate-500">{s.returnPct.toFixed(1)}% annual return</p>
          <p className="text-mono-num mt-3 text-xl font-bold text-white light:text-slate-900">
            Rs {Math.round(s.projectedFutureValue / 1000).toLocaleString("en-US")}k
          </p>
          <p className="mt-1 text-xs text-white/50 light:text-slate-500">Projected value at target date</p>
          <span className={`mt-3 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${s.isOnTrack ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}>
            {s.isOnTrack ? "On Track" : `${Math.abs(s.fundingGapPct).toFixed(0)}% Short`}
          </span>
        </div>
      ))}
    </div>
  );
}
