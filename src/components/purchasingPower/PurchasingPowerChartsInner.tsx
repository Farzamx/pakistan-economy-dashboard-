"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useLanguage } from "@/components/LanguageProvider";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";
import type { PurchasingPowerResult, TimelinePoint } from "@/lib/decisionSupportLab/purchasingPowerEngine";

interface Props {
  result: PurchasingPowerResult;
  timeline: TimelinePoint[];
}

export default function PurchasingPowerChartsInner({ result, timeline }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { t } = useLanguage();
  const { gridStroke, axisTickFill, tooltipStyle } = useChartTheme();
  const shouldRender = isInView || !!prefersReducedMotion;

  const comparisonData = [
    { name: "Original Amount", value: result.amount, color: "#4d8df7" },
    { name: "Real Value Today", value: result.realValueToday, color: "#fb7185" },
  ];

  // Waterfall: an invisible "base" bar sets each visible segment's vertical
  // offset — the standard Recharts stacked-bar waterfall technique.
  const waterfallData = [
    { name: "Original Amount", base: 0, value: result.amount, color: "#4d8df7" },
    { name: "Purchasing Power Lost", base: result.realValueToday, value: result.purchasingPowerLost, color: "#fb7185" },
    { name: "Real Value Today", base: 0, value: result.realValueToday, color: "#34d399" },
  ];

  const timelineData = timeline.map((p) => ({ date: p.date.slice(0, 7), realValue: p.realValue }));

  return (
    <div ref={containerRef} className="flex flex-col gap-8">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("purchasingPower.comparisonTitle")}</h3>
        {shouldRender && (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={comparisonData} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 12 }} tickLine={false} axisLine={false} width={130} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""]} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={700}>
                {comparisonData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("purchasingPower.waterfallTitle")}</h3>
        {shouldRender && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={waterfallData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => (name === "value" ? [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""] : [null, null])} />
              <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} animationDuration={700}>
                {waterfallData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("purchasingPower.timelineTitle")}</h3>
        {shouldRender && (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timelineData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="pp-real-value-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4d8df7" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4d8df7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} stroke="transparent" tick={{ fill: axisTickFill, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
              <ReferenceLine y={result.amount} stroke={axisTickFill} strokeDasharray="4 4" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`Rs ${typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v}`, ""]} />
              <Area type="monotone" dataKey="realValue" stroke="#4d8df7" strokeWidth={2} fill="url(#pp-real-value-fill)" isAnimationActive={!prefersReducedMotion} animationDuration={700} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
