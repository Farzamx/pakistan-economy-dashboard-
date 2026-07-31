"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import { buildRealReturnSeries } from "@/lib/decisionSupportLab/investmentEngine";
import type { InvestmentGrowthResult } from "@/components/investmentGrowthExplorer/InvestmentGrowthExplorerResults";

interface Props {
  results: InvestmentGrowthResult[];
  startingAmount: number;
  inflationPct: number;
  years: number;
}

export default function InvestmentGrowthExplorerChartsInner({ results, startingAmount, inflationPct, years }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const perInvestmentSeries = results.map((r) => ({ id: r.id, name: r.name, color: r.color, series: buildRealReturnSeries(startingAmount, r.nominalReturnPct, inflationPct, years) }));

  const nominalData = Array.from({ length: years + 1 }, (_, year) => {
    const row: Record<string, number | string> = { year: `Y${year}` };
    for (const inv of perInvestmentSeries) row[inv.id] = inv.series[year]?.nominalValue ?? 0;
    return row;
  });

  const realData = Array.from({ length: years + 1 }, (_, year) => {
    const row: Record<string, number | string> = { year: `Y${year}` };
    for (const inv of perInvestmentSeries) row[inv.id] = inv.series[year]?.realValue ?? 0;
    return row;
  });

  const inflationEatenData = results.map((r) => ({ name: r.name, value: r.inflationEaten, color: r.color }));

  return (
    <div ref={containerRef} className="flex flex-col gap-8">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("investmentGrowthExplorer.growthTitle")}</h3>
        {shouldRender && (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={nominalData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="year" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""]} />
              <Legend wrapperStyle={{ fontSize: 12, color: axisTickFill }} />
              {perInvestmentSeries.map((inv) => (
                <Line key={inv.id} type="monotone" dataKey={inv.id} name={inv.name} stroke={inv.color} strokeWidth={2} dot={false} isAnimationActive={!prefersReducedMotion} animationDuration={700} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("investmentGrowthExplorer.realWealthLabel")}</h3>
        {shouldRender && (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={realData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="year" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""]} />
              <Legend wrapperStyle={{ fontSize: 12, color: axisTickFill }} />
              {perInvestmentSeries.map((inv) => (
                <Line key={inv.id} type="monotone" dataKey={inv.id} name={inv.name} stroke={inv.color} strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={!prefersReducedMotion} animationDuration={700} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("investmentGrowthExplorer.inflationContributionTitle")}</h3>
        {shouldRender && (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={inflationEatenData} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 12 }} tickLine={false} axisLine={false} width={110} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""]} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={700}>
                {inflationEatenData.map((d) => (
                  <Cell key={d.name} fill="#fb7185" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
