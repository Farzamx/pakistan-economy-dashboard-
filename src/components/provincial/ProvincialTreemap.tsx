"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import type { ProvincialAllocationSlice } from "@/lib/provincial/provincialBudgetData";

interface ProvincialTreemapProps {
  data: ProvincialAllocationSlice[];
}

interface TreemapCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  color?: string;
  value?: number;
}

function TreemapCell({ x = 0, y = 0, width = 0, height = 0, name = "", color = "#64748b", value = 0 }: TreemapCellProps) {
  const canShowLabel = width > 56 && height > 32;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="rgba(5,7,18,0.5)" strokeWidth={2} rx={4} />
      {canShowLabel && (
        <text x={x + 8} y={y + 18} fontSize={11} fontWeight={700} fill="#fff" stroke="rgba(0,0,0,0.4)" strokeWidth={2} paintOrder="stroke">
          {name}
        </text>
      )}
      {canShowLabel && height > 48 && (
        <text x={x + 8} y={y + 34} fontSize={10} fill="rgba(255,255,255,0.85)" stroke="rgba(0,0,0,0.4)" strokeWidth={2} paintOrder="stroke">
          {`Rs ${value.toFixed(0)}bn`}
        </text>
      )}
    </g>
  );
}

export default function ProvincialTreemap({ data }: ProvincialTreemapProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 33, 0.90)";
  const tooltipBorder = isLight ? "1px solid rgba(0, 0, 0, 0.10)" : "1px solid rgba(255, 255, 255, 0.10)";

  const treeData = data.map((s) => ({ name: s.label, value: s.value, color: s.color }));

  return (
    <div className="w-full overflow-hidden" style={{ minHeight: 260 }}>
      <ResponsiveContainer width="100%" height={260}>
        <Treemap
          data={treeData}
          dataKey="value"
          nameKey="name"
          stroke="rgba(5,7,18,0.5)"
          isAnimationActive={false}
          content={(props) => <TreemapCell {...(props as TreemapCellProps)} />}
        >
          <Tooltip
            contentStyle={{ background: tooltipBg, border: tooltipBorder, borderRadius: "0.75rem", backdropFilter: "blur(16px)" }}
            formatter={(value) => [`Rs ${typeof value === "number" ? value.toFixed(0) : value}bn`, ""]}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
