"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import SpendingCompositionDonut from "@/components/decisionSupportLab/SpendingCompositionDonut";
import { useLanguage } from "@/components/LanguageProvider";
import type { PortfolioContribution } from "@/lib/decisionSupportLab/investmentEngine";
import type { PortfolioAssetRow } from "@/components/portfolioPurchasingPower/PortfolioPurchasingPowerCalculator";

interface Props {
  rows: PortfolioAssetRow[];
  contributions: PortfolioContribution[];
}

export default function PortfolioPurchasingPowerChartsInner({ rows, contributions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const allocationData = rows.filter((r) => r.weightPct > 0).map((r) => ({ label: r.name, value: r.weightPct, color: r.color }));
  const contributionData = contributions.filter((c) => c.weightPct > 0).map((c) => ({ name: c.assetName, value: c.contributionPct }));

  return (
    <div ref={containerRef} className="flex flex-col gap-8">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("assetAllocationExplorer.allocationChartTitle")}</h3>
        <SpendingCompositionDonut data={allocationData} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("portfolioPurchasingPower.assetContributionTitle")}</h3>
        {shouldRender && (
          <ResponsiveContainer width="100%" height={Math.max(160, contributionData.length * 44)}>
            <BarChart data={contributionData} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${v}%`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 12 }} tickLine={false} axisLine={false} width={130} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${typeof v === "number" ? v.toFixed(1) : v}%`, ""]} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={700}>
                {contributionData.map((d) => (
                  <Cell key={d.name} fill="#4d8df7" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
