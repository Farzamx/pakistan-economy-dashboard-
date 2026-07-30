"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import type { AmortizationSchedule } from "@/lib/decisionSupportLab/timeValueEngine";

interface Props {
  schedule: AmortizationSchedule;
}

export default function LoanEmiChartsInner({ schedule }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const step = Math.max(1, Math.round(schedule.rows.length / 60));
  const data = schedule.rows.filter((_, i) => i % step === 0 || i === schedule.rows.length - 1).map((r) => ({ period: r.period, balance: r.remainingBalance }));

  return (
    <div ref={containerRef}>
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("loanEmi.remainingBalanceTitle")}</h3>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="le-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="period" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""]} labelFormatter={(l) => `Period ${l}`} />
            <Area type="monotone" dataKey="balance" stroke="#fb7185" strokeWidth={2} fill="url(#le-fill)" isAnimationActive={!prefersReducedMotion} animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
