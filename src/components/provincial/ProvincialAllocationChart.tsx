"use client";

// Provincial donut chart — same responsive architecture as
// src/components/budget/BudgetAllocationChart.tsx (the Federal Budget
// Workshop's "Where Does the Budget Go?" chart), which was rebuilt for
// mobile after a real audit found fixed pixel radii and a right-docked
// Legend collapsing the donut on narrow screens, and a Recharts animation
// restart bug silently hiding every percentage label. Reusing that same
// fix here rather than reintroducing either bug in a second component.

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTheme } from "@/components/ThemeProvider";
import type { ProvincialAllocationSlice } from "@/lib/provincial/provincialBudgetData";

interface ProvincialAllocationChartProps {
  data: ProvincialAllocationSlice[];
}

const RADIAN = Math.PI / 180;
const MOBILE_LABEL_MIN_PERCENT = 0.05;

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function makeRingLabel(fontSize: number, minPercent: number) {
  return function RingLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: PieLabelProps) {
    if (percent < minPercent) return null;
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

export default function ProvincialAllocationChart({ data }: ProvincialAllocationChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.90)";
  const tooltipBorder = isLight ? "1px solid rgba(0, 0, 0, 0.10)" : "1px solid rgba(255, 255, 255, 0.10)";
  const legendColor = isLight ? "rgba(0, 0, 0, 0.65)" : "rgba(255, 255, 255, 0.65)";

  const innerRadius = isMobile ? 48 : 70;
  const outerRadius = isMobile ? 78 : 120;
  const containerHeight = isMobile ? 420 : 340;
  const labelFontSize = isMobile ? 10 : 12;
  const labelMinPercent = isMobile ? MOBILE_LABEL_MIN_PERCENT : 0;
  const renderLabel = makeRingLabel(labelFontSize, labelMinPercent);

  return (
    <div ref={containerRef} style={{ minHeight: isMobile ? 420 : 320 }} className="w-full overflow-hidden">
      {isInView && (
        <ResponsiveContainer width="100%" height={containerHeight}>
          <PieChart margin={isMobile ? { top: 0, right: 8, bottom: 0, left: 8 } : undefined}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy={isMobile ? "38%" : "50%"}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={1.5}
              isAnimationActive={false}
              label={renderLabel}
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
              wrapperStyle={{ fontSize: isMobile ? 11 : 12, color: legendColor, lineHeight: isMobile ? "1.6" : undefined }}
              layout="vertical"
              align={isMobile ? "center" : "right"}
              verticalAlign={isMobile ? "bottom" : "middle"}
              iconSize={isMobile ? 9 : 10}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
