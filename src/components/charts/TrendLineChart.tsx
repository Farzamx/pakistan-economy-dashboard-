"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";

export interface TrendPoint {
  month: string;
  value: number;
}

interface TrendLineChartProps {
  data: TrendPoint[];
  color: string;
  unit: string;
  gradientId: string;
  /** Recharts XAxis interval. Default auto. Pass a number to show every Nth label. */
  xAxisInterval?: number | "preserveStart" | "preserveEnd" | "preserveStartEnd";
}

export default function TrendLineChart({
  data,
  color,
  unit,
  gradientId,
  xAxisInterval,
}: TrendLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { theme } = useTheme();

  const shouldRender = isInView || !!prefersReducedMotion;
  const isLight = theme === "light";

  const gridStroke     = isLight ? "rgba(0, 0, 0, 0.08)"   : "rgba(255, 255, 255, 0.06)";
  const axisTickFill   = isLight ? "rgba(0, 0, 0, 0.50)"   : "rgba(255, 255, 255, 0.40)";
  const tooltipBg      = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.90)";
  const tooltipBorder  = isLight ? "1px solid rgba(0, 0, 0, 0.10)"  : "1px solid rgba(255, 255, 255, 0.10)";
  const tooltipLabel   = isLight ? "rgba(0, 0, 0, 0.50)"   : "rgba(255, 255, 255, 0.50)";
  const tooltipItem    = isLight ? "rgba(0, 0, 0, 0.80)"   : "#ffffff";
  const cursorStroke   = isLight ? "rgba(0, 0, 0, 0.12)"   : "rgba(255, 255, 255, 0.15)";
  const dotStroke      = isLight ? "#ffffff"                : "#05060f";

  return (
    <div ref={containerRef} style={{ minHeight: 240 }}>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="month"
              stroke="transparent"
              tick={{ fill: axisTickFill, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              {...(xAxisInterval !== undefined ? { interval: xAxisInterval } : {})}
            />
            <YAxis
              stroke="transparent"
              tick={{ fill: axisTickFill, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip
              contentStyle={{
                background: tooltipBg,
                border: tooltipBorder,
                borderRadius: "0.75rem",
                backdropFilter: "blur(16px)",
              }}
              labelStyle={{ color: tooltipLabel, marginBottom: 4 }}
              itemStyle={{ color: tooltipItem, fontWeight: 600 }}
              formatter={(value) => `${value}${unit}`}
              cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4, fill: color, stroke: dotStroke, strokeWidth: 2 }}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={1800}
              animationBegin={0}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
