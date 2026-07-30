"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import type { ProjectionYearPoint } from "@/lib/decisionSupportLab/purchasingPowerEngine";

interface Props {
  series: ProjectionYearPoint[];
  savingsAmount: number;
}

export default function SavingsErosionChartsInner({ series, savingsAmount }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const data = series.map((p) => ({ year: `Y${p.year}`, realValue: p.realValue }));

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("savingsErosion.chartTitle")}</h3>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="se-real-value-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="year" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
            <ReferenceLine y={savingsAmount} stroke={axisTickFill} strokeDasharray="4 4" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""]} />
            <Area type="monotone" dataKey="realValue" stroke="#fb7185" strokeWidth={2} fill="url(#se-real-value-fill)" isAnimationActive={!prefersReducedMotion} animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
