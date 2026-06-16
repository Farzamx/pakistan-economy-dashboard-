"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import InfoTooltip from "@/components/InfoTooltip";

export interface TickerItem {
  label: string;
  value: string;
  unit: string;
  changeDisplay: string | null;
  trend: "up" | "down" | "neutral";
  termKey: string;
}

function TickerChip({ item }: { item: TickerItem }) {
  const trendClass =
    item.trend === "up"
      ? "text-emerald-400"
      : item.trend === "down"
        ? "text-rose-400"
        : "text-white/35";

  const arrow =
    item.trend === "up" ? "▲" : item.trend === "down" ? "▼" : "•";

  return (
    <span className="inline-flex items-center gap-2 px-5 border-r border-white/[0.06] last:border-r-0">
      <span className="text-[11px] font-medium tracking-wide text-white/45">
        {item.label}
      </span>

      <span className="text-[13px] font-semibold text-white tabular-nums">
        {item.value}
        {item.unit && (
          <span className="ml-0.5 text-[10px] font-normal text-white/30">
            {item.unit}
          </span>
        )}
      </span>

      <span className={`inline-flex items-center gap-1 text-[11px] font-medium tabular-nums ${trendClass}`}>
        {arrow}
        {item.changeDisplay && (
          <span>{item.changeDisplay}</span>
        )}
      </span>

      <InfoTooltip termKey={item.termKey} size="xs" />
    </span>
  );
}

interface MarketTickerProps {
  items: TickerItem[];
}

export default function MarketTicker({ items }: MarketTickerProps) {
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Duplicate the items so we can animate one full copy offscreen (-50% of
  // the total width), at which point the second copy sits exactly where the
  // first started — seamless visual loop with no JS timers or layout thrash.
  const doubled = [...items, ...items];

  return (
    <div
      aria-label="Live market data"
      className="mt-6 overflow-hidden rounded-xl border border-white/[0.06]"
      style={{ background: "rgba(255, 255, 255, 0.02)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="py-3">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "max-content",
            willChange: "transform",
            animation: prefersReducedMotion
              ? "none"
              : "ticker-scroll 40s linear infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {doubled.map((item, i) => (
            <TickerChip key={`${item.label}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
