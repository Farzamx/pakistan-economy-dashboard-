"use client";

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
}

// Reusable themed area/line chart for monthly trend data.
// Any data source that produces `{ month, value }[]` (mock or live
// from an API) can be passed straight in.
export default function TrendLineChart({
  data,
  color,
  unit,
  gradientId,
}: TrendLineChartProps) {
  return (
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
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
