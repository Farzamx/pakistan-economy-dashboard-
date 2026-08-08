"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import type { GoalTimelinePoint } from "@/lib/decisionSupportLab/goalEngine";

interface Props {
  points: GoalTimelinePoint[];
}

/** The Financial Planning Intelligence funding-gap chart every goal planner shares — projected balance (area) against the inflation-adjusted target (a rising reference line, since the target itself inflates every year too). Where the two lines cross is the visual answer to "am I on track." */
export default function GoalFundingGapChartInner({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const data = points.map((p) => ({ year: `Y${p.year}`, balance: p.projectedBalance, target: p.inflatedTarget }));

  return (
    <div ref={containerRef}>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="goal-balance-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="year" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => `Rs ${(v / 1_000_000).toFixed(1)}M`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, name === "balance" ? "Projected Balance" : "Inflation-Adjusted Target"]} />
            <Area type="monotone" dataKey="balance" stroke="#4ade80" strokeWidth={2} fill="url(#goal-balance-fill)" isAnimationActive={!prefersReducedMotion} animationDuration={700} />
            <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={!prefersReducedMotion} animationDuration={700} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
