"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useChartTheme } from "@/lib/decisionSupportLab/chartTheme";

export interface CompositionSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: CompositionSlice[];
}

const RADIAN = Math.PI / 180;

function makeRingLabel(fontSize: number) {
  return function RingLabel({
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    percent = 0,
  }: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  }) {
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

/**
 * The Lab's shared spending-composition donut — extracted from the
 * Personal Inflation Calculator's chart (previously the only place this
 * existed) so Budget Allocation and any future allocation-based tool draw
 * the identical chart instead of a re-implemented copy.
 */
export default function SpendingCompositionDonut({ data }: Props) {
  const isMobile = useIsMobile();
  const { axisTickFill, tooltipStyle } = useChartTheme();
  const renderLabel = makeRingLabel(isMobile ? 10 : 12);

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 420 : 320}>
      <PieChart margin={isMobile ? { top: 0, right: 8, bottom: 0, left: 8 } : undefined}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy={isMobile ? "38%" : "50%"}
          innerRadius={isMobile ? 48 : 70}
          outerRadius={isMobile ? 78 : 120}
          paddingAngle={1.5}
          isAnimationActive={false}
          label={renderLabel}
          labelLine={false}
        >
          {data.map((slice) => (
            <Cell key={slice.label} fill={slice.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${typeof v === "number" ? v.toFixed(1) : v}%`, ""]} />
        <Legend
          wrapperStyle={{ fontSize: isMobile ? 11 : 12, color: axisTickFill, lineHeight: isMobile ? "1.6" : undefined }}
          layout="vertical"
          align={isMobile ? "center" : "right"}
          verticalAlign={isMobile ? "bottom" : "middle"}
          iconSize={isMobile ? 9 : 10}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
