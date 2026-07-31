"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";

interface Props {
  startingWealth: number;
  endingWealth: number;
  realValue: number;
}

export default function InflationDragAnalyzerChartsInner({ startingWealth, endingWealth, realValue }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  // Standard Recharts stacked-bar waterfall: an invisible "base" series
  // sets each visible segment's vertical offset, the same technique
  // PurchasingPowerChartsInner.tsx already established for this Lab.
  const data = [
    { name: "Starting Wealth", base: 0, value: startingWealth, color: "#4d8df7" },
    { name: "Nominal Growth", base: startingWealth, value: Math.max(0, endingWealth - startingWealth), color: "#34d399" },
    { name: "Inflation Loss", base: realValue, value: Math.max(0, endingWealth - realValue), color: "#fb7185" },
    { name: "Real Value", base: 0, value: realValue, color: "#9b8afb" },
  ];

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("inflationDragAnalyzer.decompositionTitle")}</h3>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => (name === "value" ? [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""] : [null, null])} />
            <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={700}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
