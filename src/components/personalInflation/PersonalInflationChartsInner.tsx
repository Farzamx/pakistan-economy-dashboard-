"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/components/LanguageProvider";
import type { PersonalInflationResult } from "@/lib/personalInflation/engine";
import { CPI_GROUP_BY_NO } from "@/lib/personalInflation/cpiGroups";

interface Props {
  result: PersonalInflationResult;
}

const RADIAN = Math.PI / 180;

function makeRingLabel(fontSize: number) {
  return function RingLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number }) {
    if (percent < 0.03) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={700} fill="#fff" stroke="rgba(0,0,0,0.45)" strokeWidth={3} paintOrder="stroke">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
}

export default function PersonalInflationChartsInner({ result }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === "light";
  const shouldRender = isInView || !!prefersReducedMotion;

  const gridStroke = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.06)";
  const axisTickFill = isLight ? "rgba(0, 0, 0, 0.50)" : "rgba(255, 255, 255, 0.40)";
  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.90)";
  const tooltipBorder = isLight ? "1px solid rgba(0, 0, 0, 0.10)" : "1px solid rgba(255, 255, 255, 0.10)";

  const comparisonData = [
    { name: t("personalInflation.officialCpiLabel"), value: result.officialCpiPct, color: "#4d8df7" },
    { name: t("personalInflation.yourInflationLabel"), value: result.personalCpiPct, color: result.differencePct > 0.3 ? "#fb7185" : result.differencePct < -0.3 ? "#34d399" : "#9b8afb" },
  ];

  const contributionData = [...result.contributions]
    .sort((a, b) => b.yourContributionPct - a.yourContributionPct)
    .map((c) => ({ name: c.groupName, value: c.yourContributionPct, color: c.yourContributionPct >= 0 ? "#4d8df7" : "#fb7185" }));

  const compositionData = result.contributions
    .filter((c) => c.yourWeightPct > 0.05)
    .map((c) => ({ label: c.groupName, value: c.yourWeightPct, color: colorForGroup(c.groupNo) }));

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
              <Tooltip contentStyle={{ background: tooltipBg, border: tooltipBorder, borderRadius: "0.75rem" }} formatter={(v) => [`${typeof v === "number" ? v.toFixed(1) : v}%`, ""]} />
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
              <Tooltip contentStyle={{ background: tooltipBg, border: tooltipBorder, borderRadius: "0.75rem" }} formatter={(v) => [`${typeof v === "number" ? v.toFixed(2) : v} pp`, ""]} />
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
        {shouldRender && (
          <ResponsiveContainer width="100%" height={isMobile ? 420 : 320}>
            <PieChart margin={isMobile ? { top: 0, right: 8, bottom: 0, left: 8 } : undefined}>
              <Pie
                data={compositionData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy={isMobile ? "38%" : "50%"}
                innerRadius={isMobile ? 48 : 70}
                outerRadius={isMobile ? 78 : 120}
                paddingAngle={1.5}
                isAnimationActive={false}
                label={makeRingLabel(isMobile ? 10 : 12)}
                labelLine={false}
              >
                {compositionData.map((slice) => (
                  <Cell key={slice.label} fill={slice.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: tooltipBg, border: tooltipBorder, borderRadius: "0.75rem" }} formatter={(v) => [`${typeof v === "number" ? v.toFixed(1) : v}%`, ""]} />
              <Legend
                wrapperStyle={{ fontSize: isMobile ? 11 : 12, color: axisTickFill, lineHeight: isMobile ? "1.6" : undefined }}
                layout="vertical"
                align={isMobile ? "center" : "right"}
                verticalAlign={isMobile ? "bottom" : "middle"}
                iconSize={isMobile ? 9 : 10}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function colorForGroup(groupNo: number): string {
  return CPI_GROUP_BY_NO.get(groupNo)?.color ?? "#828282";
}
