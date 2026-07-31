"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import type { ReturnSeriesPoint } from "@/lib/decisionSupportLab/investmentEngine";

interface Props {
  series: ReturnSeriesPoint[];
}

export default function RealReturnCalculatorChartsInner({ series }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const data = series.map((p) => ({ year: `Y${p.year}`, nominal: p.nominalValue, real: p.realValue }));

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("realReturnCalculator.chartTitle")}</h3>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="year" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""]} />
            <Legend wrapperStyle={{ fontSize: 12, color: axisTickFill }} />
            <Line type="monotone" dataKey="nominal" name="Nominal Value" stroke="#4d8df7" strokeWidth={2} dot={false} isAnimationActive={!prefersReducedMotion} animationDuration={700} />
            <Line type="monotone" dataKey="real" name="Real Value" stroke="#fb7185" strokeWidth={2} dot={false} isAnimationActive={!prefersReducedMotion} animationDuration={700} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
