"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useTheme } from "@/components/ThemeProvider";
import type { AllocationSlice } from "@/lib/budget/budgetData";

interface BudgetAllocationChartProps {
  data: AllocationSlice[];
}

export default function BudgetAllocationChart({ data }: BudgetAllocationChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const shouldRender = isInView || !!prefersReducedMotion;

  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.90)";
  const tooltipBorder = isLight ? "1px solid rgba(0, 0, 0, 0.10)" : "1px solid rgba(255, 255, 255, 0.10)";
  const legendColor = isLight ? "rgba(0, 0, 0, 0.65)" : "rgba(255, 255, 255, 0.65)";

  return (
    <div ref={containerRef} style={{ minHeight: 320 }}>
      {shouldRender && (
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              paddingAngle={1.5}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={1200}
              label={(props) => `${((props.percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((slice) => (
                <Cell key={slice.label} fill={slice.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: tooltipBg, border: tooltipBorder, borderRadius: "0.75rem", backdropFilter: "blur(16px)" }}
              formatter={(value, name) => [`Rs ${typeof value === "number" ? value.toFixed(0) : value}bn`, String(name)]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: legendColor }}
              layout="vertical"
              align="right"
              verticalAlign="middle"
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
