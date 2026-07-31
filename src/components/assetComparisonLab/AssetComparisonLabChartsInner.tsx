"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import type { AssetComparisonResult } from "@/lib/decisionSupportLab/investmentEngine";

interface Props {
  results: AssetComparisonResult[];
}

export default function AssetComparisonLabChartsInner({ results }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const data = [...results]
    .sort((a, b) => a.rank - b.rank)
    .map((r) => ({ name: r.name, nominal: r.nominalReturnPct, real: r.realReturnPct }));

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("assetComparisonLab.chartTitle")}</h3>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={Math.max(240, data.length * 44)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 12 }} tickLine={false} axisLine={false} width={130} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${typeof v === "number" ? v.toFixed(1) : v}%`, ""]} />
            <Legend wrapperStyle={{ fontSize: 12, color: axisTickFill }} />
            <Bar dataKey="nominal" name="Nominal Return" fill="#4d8df7" radius={[0, 4, 4, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={700} />
            <Bar dataKey="real" name="Real Return" fill="#34d399" radius={[0, 4, 4, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
