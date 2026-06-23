"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTheme } from "@/components/ThemeProvider";
import type { AllocationSlice } from "@/lib/budget/budgetData";

interface BudgetAllocationChartProps {
  data: AllocationSlice[];
}

const RADIAN = Math.PI / 180;

// Below this slice share, a percentage label has too little room to sit
// inside its own wedge without colliding with its neighbors once the donut
// is shrunk down for mobile — so it's dropped rather than rendered
// overlapping. Desktop has enough radius to show every label regardless.
const MOBILE_LABEL_MIN_PERCENT = 0.05;

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

/** Renders the percentage label inside the donut's own ring band (between innerRadius and outerRadius) instead of outside it — so it can never spill past the chart's outer edge regardless of how small the radius gets. A dark stroke (paintOrder="stroke") keeps it legible over every slice color without per-color tuning. */
function makeRingLabel(fontSize: number, minPercent: number) {
  return function RingLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: PieLabelProps) {
    if (percent < minPercent) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={700}
        fill="#fff"
        stroke="rgba(0,0,0,0.45)"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
}

export default function BudgetAllocationChart({ data }: BudgetAllocationChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });
  const prefersReducedMotion = useSafeReducedMotion();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const shouldRender = isInView || !!prefersReducedMotion;

  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.90)";
  const tooltipBorder = isLight ? "1px solid rgba(0, 0, 0, 0.10)" : "1px solid rgba(255, 255, 255, 0.10)";
  const legendColor = isLight ? "rgba(0, 0, 0, 0.65)" : "rgba(255, 255, 255, 0.65)";

  // Fixed pixel radii don't shrink with the container, and a legend docked
  // to the right competes with the donut for the same limited width — the
  // two root causes of the donut collapsing to a sliver on narrow screens.
  // Below 768px: smaller radii so the full donut fits well inside a
  // ~280-366px card, the legend moves below (vertical layout, bottom-
  // docked) so it no longer shares horizontal space with the donut, and
  // the container grows taller to fit both stacked instead of side by side.
  const innerRadius = isMobile ? 48 : 70;
  const outerRadius = isMobile ? 78 : 120;
  const containerHeight = isMobile ? 420 : 340;
  const labelFontSize = isMobile ? 10 : 12;
  const labelMinPercent = isMobile ? MOBILE_LABEL_MIN_PERCENT : 0;
  const renderLabel = makeRingLabel(labelFontSize, labelMinPercent);

  return (
    <div ref={containerRef} style={{ minHeight: isMobile ? 420 : 320 }} className="w-full overflow-hidden">
      {shouldRender && (
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
