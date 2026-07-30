"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import { buildGrowthSeries, COMPOUNDING_PERIODS_PER_YEAR, type CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";

interface Props {
  principal: number;
  ratePct: number;
  years: number;
  frequency: CompoundingFrequency;
}

export default function CompoundInterestChartsInner({ principal, ratePct, years, frequency }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const compoundingsPerYear = frequency === "continuous" ? 365 : COMPOUNDING_PERIODS_PER_YEAR[frequency];
  const series = buildGrowthSeries(principal, ratePct, years, compoundingsPerYear);
  const data = series.filter((_, i) => i % Math.max(1, Math.round(series.length / 40)) === 0 || i === series.length - 1).map((p) => ({ period: (p.period / compoundingsPerYear).toFixed(1), value: p.value }));

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("compoundInterest.growthCurveTitle")}</h3>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="ci-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9b8afb" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#9b8afb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="period" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""]} labelFormatter={(l) => `Year ${l}`} />
            <Area type="monotone" dataKey="value" stroke="#9b8afb" strokeWidth={2} fill="url(#ci-fill)" isAnimationActive={!prefersReducedMotion} animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
