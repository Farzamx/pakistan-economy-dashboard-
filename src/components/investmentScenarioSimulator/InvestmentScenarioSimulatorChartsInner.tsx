"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";

interface Props {
  data: { name: string; realReturnPct: number; isSelected: boolean }[];
}

export default function InvestmentScenarioSimulatorChartsInner({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("investmentScenarioSimulator.chartTitle")}</h3>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 12 }} tickLine={false} axisLine={false} width={150} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${typeof v === "number" ? v.toFixed(1) : v}%`, ""]} />
            <Bar dataKey="realReturnPct" radius={[0, 6, 6, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={700}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.isSelected ? "#4d8df7" : d.realReturnPct >= 0 ? "#34d399" : "#fb7185"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
