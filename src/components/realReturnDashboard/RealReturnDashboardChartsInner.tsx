"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";

interface Props {
  startingWealth: number;
  nominalWealth: number;
  afterInflationValue: number;
  realWealth: number;
}

export default function RealReturnDashboardChartsInner({ startingWealth, nominalWealth, afterInflationValue, realWealth }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  // Standard Recharts stacked-bar waterfall (invisible "base" series sets
  // each segment's vertical offset) — Nominal Wealth → Inflation → Taxes
  // → Real Wealth, the exact flow the brief specifies.
  const data = [
    { name: "Nominal Wealth", base: 0, value: nominalWealth, color: "#4d8df7" },
    { name: "Inflation", base: afterInflationValue, value: Math.max(0, nominalWealth - afterInflationValue), color: "#fb7185" },
    { name: "Taxes", base: realWealth, value: Math.max(0, afterInflationValue - realWealth), color: "#f59e0b" },
    { name: "Real Wealth", base: 0, value: realWealth, color: "#9b8afb" },
  ];

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("realReturnDashboard.waterfallTitle")}</h3>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={280}>
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
      <p className="mt-2 text-xs text-white/35 light:text-slate-400">Starting wealth: Rs {Math.round(startingWealth).toLocaleString("en-US")}</p>
    </div>
  );
}
