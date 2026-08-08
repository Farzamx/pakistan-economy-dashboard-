"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";

interface Props {
  successProbabilityPct: number;
}

function colorForProbability(pct: number): string {
  if (pct >= 70) return "#4ade80";
  if (pct >= 40) return "#f59e0b";
  return "#fb7185";
}

/** A semi-circular gauge (RadialBarChart with a background track + one foreground bar) — the Monte Carlo success-probability visual every goal planner shares. */
export default function GoalProbabilityGaugeInner({ successProbabilityPct }: Props) {
  const { isLight } = useChartTheme();
  const color = colorForProbability(successProbabilityPct);
  const trackColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  const data = [{ name: "probability", value: successProbabilityPct, fill: color }];

  return (
    <div className="relative flex flex-col items-center">
      <RadialBarChart
        width={220}
        height={130}
        cx={110}
        cy={110}
        innerRadius={80}
        outerRadius={105}
        barSize={16}
        startAngle={180}
        endAngle={0}
        data={data}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background={{ fill: trackColor }} dataKey="value" cornerRadius={8} isAnimationActive animationDuration={700} />
      </RadialBarChart>
      <div className="absolute top-[64px] flex flex-col items-center">
        <span className="text-mono-num text-3xl font-bold tabular-nums" style={{ color }}>
          {Math.round(successProbabilityPct)}%
        </span>
        <span className="text-xs text-white/50 light:text-slate-500">Probability of Success</span>
      </div>
    </div>
  );
}
