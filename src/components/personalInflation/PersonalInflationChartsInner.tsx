"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import SpendingCompositionDonut from "@/components/decisionSupportLab/SpendingCompositionDonut";
import type { PersonalInflationResult } from "@/lib/personalInflation/engine";
import { CPI_GROUP_BY_NO } from "@/lib/personalInflation/cpiGroups";

interface Props {
  result: PersonalInflationResult;
}

export default function PersonalInflationChartsInner({ result }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const comparisonData = [
    { name: t("personalInflation.officialCpiLabel"), value: result.officialCpiPct, color: "#4d8df7" },
    { name: t("personalInflation.yourInflationLabel"), value: result.personalCpiPct, color: result.differencePct > 0.3 ? "#fb7185" : result.differencePct < -0.3 ? "#34d399" : "#9b8afb" },
  ];

  const contributionData = [...result.contributions]
    .sort((a, b) => b.yourContributionPct - a.yourContributionPct)
    .map((c) => ({ name: c.groupName, value: c.yourContributionPct, color: c.yourContributionPct >= 0 ? "#4d8df7" : "#fb7185" }));

  const compositionData = result.contributions
    .filter((c) => c.yourWeightPct > 0.05)
    .map((c) => ({ label: c.groupName, value: c.yourWeightPct, color: CPI_GROUP_BY_NO.get(c.groupNo)?.color ?? "#828282" }));

  return (
    <div ref={containerRef} className="flex flex-col gap-8">
      {/* Comparison bar chart */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("personalInflation.chartComparisonTitle")}</h3>
        {shouldRender && (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={comparisonData} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${v}%`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 12 }} tickLine={false} axisLine={false} width={110} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${typeof v === "number" ? v.toFixed(1) : v}%`, ""]} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={700}>
                {comparisonData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Contribution bar chart */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("personalInflation.chartContributionTitle")}</h3>
        {shouldRender && (
          <ResponsiveContainer width="100%" height={Math.max(220, contributionData.length * 30)}>
            <BarChart data={contributionData} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${v}pp`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={isMobile ? 90 : 170} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${typeof v === "number" ? v.toFixed(2) : v} pp`, ""]} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={700}>
                {contributionData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Spending composition donut */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("personalInflation.chartCompositionTitle")}</h3>
        {shouldRender && <SpendingCompositionDonut data={compositionData} />}
      </div>
    </div>
  );
}
