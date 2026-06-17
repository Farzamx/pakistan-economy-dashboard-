"use client";

import { useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

/**
 * Reusable themed area chart.
 * The Recharts animation is triggered by lazy-mounting the chart on viewport
 * entry — this ensures the draw animation is visible regardless of where the
 * chart sits on the page. With prefers-reduced-motion, the chart renders
 * immediately with animation disabled.
 */
export default function TrendLineChart({
  data,
  color,
  unit,
  gradientId,
  xAxisInterval,
}: TrendLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useReducedMotion();

  // Mount the chart only on viewport entry so Recharts' draw animation fires
  // when the user can actually see it. With reduced motion, mount immediately
  // and disable animation.
  const shouldRender = isInView || !!prefersReducedMotion;

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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="rgba(255, 255, 255, 0.3)"
              tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              {...(xAxisInterval !== undefined ? { interval: xAxisInterval } : {})}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.3)"
              tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(11, 14, 33, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "0.75rem",
                backdropFilter: "blur(16px)",
              }}
              labelStyle={{ color: "rgba(255, 255, 255, 0.5)", marginBottom: 4 }}
              itemStyle={{ color: "#ffffff", fontWeight: 600 }}
              formatter={(value) => `${value}${unit}`}
              cursor={{ stroke: "rgba(255, 255, 255, 0.15)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4, fill: color, stroke: "#05060f", strokeWidth: 2 }}
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
