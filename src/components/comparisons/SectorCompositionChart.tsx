"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";

export interface SectorCompositionPoint {
  year: string;
  agriculture: number | null;
  industry: number | null;
  services: number | null;
}

interface SectorCompositionChartProps {
  data: SectorCompositionPoint[];
}

const COLORS = {
  agriculture: "#34d399",
  industry: "#38bdf8",
  services: "#a855f7",
};

export default function SectorCompositionChart({ data }: SectorCompositionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { theme } = useTheme();
  const shouldRender = isInView || !!prefersReducedMotion;
  const isLight = theme === "light";

  const gridStroke = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.06)";
  const axisTickFill = isLight ? "rgba(0, 0, 0, 0.50)" : "rgba(255, 255, 255, 0.40)";
  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.90)";
  const tooltipBorder = isLight ? "1px solid rgba(0, 0, 0, 0.10)" : "1px solid rgba(255, 255, 255, 0.10)";
  const tooltipLabel = isLight ? "rgba(0, 0, 0, 0.50)" : "rgba(255, 255, 255, 0.50)";
  const cursorStroke = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.15)";
  const legendColor = isLight ? "rgba(0, 0, 0, 0.65)" : "rgba(255, 255, 255, 0.65)";

  return (
    <div ref={containerRef} style={{ minHeight: 320 }}>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="year"
              stroke="transparent"
              tick={{ fill: axisTickFill, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              stroke="transparent"
              tick={{ fill: axisTickFill, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ background: tooltipBg, border: tooltipBorder, borderRadius: "0.75rem", backdropFilter: "blur(16px)" }}
              labelStyle={{ color: tooltipLabel, marginBottom: 4 }}
              cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
              formatter={(value) => `${typeof value === "number" ? value.toFixed(1) : value}%`}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: legendColor }} iconType="line" />
            <Line type="monotone" dataKey="agriculture" name="Agriculture" stroke={COLORS.agriculture} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={!prefersReducedMotion} animationDuration={1400} />
            <Line type="monotone" dataKey="industry" name="Industry" stroke={COLORS.industry} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={!prefersReducedMotion} animationDuration={1400} animationBegin={120} />
            <Line type="monotone" dataKey="services" name="Services" stroke={COLORS.services} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={!prefersReducedMotion} animationDuration={1400} animationBegin={240} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
