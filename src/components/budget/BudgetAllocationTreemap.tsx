"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import { useTheme } from "@/components/ThemeProvider";
import type { AllocationSlice } from "@/lib/budget/budgetData";

interface BudgetAllocationTreemapProps {
  data: AllocationSlice[];
}

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  pct?: number;
  fill?: string;
}

/** Cell with its own label, drawn only when the rectangle is big enough to hold it (a tiny cell keeps its colour and tooltip, not an overflowing label). */
function Cell({ x = 0, y = 0, width = 0, height = 0, name, value = 0, pct = 0, fill }: CellProps) {
  const roomForName = width > 70 && height > 34;
  const roomForAmount = width > 70 && height > 54;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--surface, #0b0e21)" strokeWidth={2} rx={4} />
      {roomForName && (
        <text x={x + 8} y={y + 18} fontSize={12} fontWeight={700} fill="#fff" stroke="rgba(0,0,0,0.4)" strokeWidth={2.5} paintOrder="stroke">
          {name} · {pct.toFixed(1)}%
        </text>
      )}
      {roomForAmount && (
        <text x={x + 8} y={y + 35} fontSize={11} fill="#fff" stroke="rgba(0,0,0,0.4)" strokeWidth={2.5} paintOrder="stroke">
          Rs {value.toLocaleString("en-US", { maximumFractionDigits: 0 })}bn
        </text>
      )}
    </g>
  );
}

export default function BudgetAllocationTreemap({ data }: BudgetAllocationTreemapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useSafeReducedMotion();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const shouldRender = inView || !!reduced;
  const tree = data.map((s) => ({ name: s.label, value: s.value, pct: s.pct, fill: s.color }));

  return (
    <div data-testid="budget-allocation-treemap">
      <div ref={ref} style={{ minHeight: 340 }} role="img" aria-label="Treemap of the budget envelope: rectangle area is proportional to each allocation">
        {shouldRender && (
          <ResponsiveContainer width="100%" height={340}>
            <Treemap data={tree} dataKey="value" nameKey="name" content={<Cell />} isAnimationActive={!reduced} animationDuration={700}>
              <Tooltip
                contentStyle={{
                  background: isLight ? "rgba(255,255,255,0.97)" : "rgba(11,14,33,0.92)",
                  border: isLight ? "1px solid rgba(0,0,0,0.10)" : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "0.75rem",
                }}
                formatter={(value, name, item) => [`Rs ${typeof value === "number" ? value.toLocaleString("en-US", { maximumFractionDigits: 0 }) : value}bn · ${((item?.payload as { pct?: number } | undefined)?.pct ?? 0).toFixed(1)}%`, String(name)]}
              />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]" aria-label="Treemap legend">
        {data.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            {s.label} · {s.pct.toFixed(1)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
