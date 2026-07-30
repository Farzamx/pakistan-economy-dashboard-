"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import type { DiscountSeriesPoint } from "@/lib/decisionSupportLab/timeValueEngine";

interface Props {
  series: DiscountSeriesPoint[];
  selectedYears: number;
}

export default function DiscountFactorExplorerChartsInner({ series, selectedYears }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const data = series.map((p) => ({ year: p.period, discountFactorValue: p.discountFactorValue }));
  const selectedPoint = data.find((d) => d.year === selectedYears);

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("discountFactorExplorer.chartTitle")}</h3>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="dfe-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4d8df7" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4d8df7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="year" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [typeof v === "number" ? v.toFixed(4) : v, ""]} labelFormatter={(l) => `Year ${l}`} />
            <Area type="monotone" dataKey="discountFactorValue" stroke="#4d8df7" strokeWidth={2} fill="url(#dfe-fill)" isAnimationActive={!prefersReducedMotion} animationDuration={700} />
            {selectedPoint && <ReferenceDot x={selectedPoint.year} y={selectedPoint.discountFactorValue} r={5} fill="#fb7185" stroke="none" />}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
