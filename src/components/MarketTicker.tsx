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
      ? "text-emerald-400 light:text-emerald-700"
      : item.trend === "down"
        ? "text-rose-400 light:text-rose-700"
        : "text-white/35 light:text-slate-400";

  const arrow =
    item.trend === "up" ? "▲" : item.trend === "down" ? "▼" : "•";

  return (
    <span className="inline-flex items-center gap-2 px-5 border-r border-white/[0.06] light:border-slate-200">
      <span className="text-[11px] font-medium tracking-wide text-white/45 light:text-slate-400">
        {item.label}
      </span>

      <span className="text-[13px] font-semibold text-white light:text-slate-800 tabular-nums">
        {item.value}
        {item.unit && (
          <span className="ml-0.5 text-[10px] font-normal text-white/30 light:text-slate-400">
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

  // Duplicate items for the seamless loop: animation moves -50% of the strip's
  // total width, at which point the second copy aligns exactly with where the
  // first started — no jump, no JS timer.
  const doubled = [...items, ...items];

  return (
    <div
      aria-label="Live market data"
      className="mt-6 rounded-xl border border-white/[0.06] light:border-slate-200 light:bg-white"
      style={{ background: "rgba(255, 255, 255, 0.02)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/*
        Clip container: position:relative + overflow:hidden creates the visible
        window. Explicit height reserves this space in document flow.

        ROOT CAUSE FIX: The animated strip must be position:absolute so it is
        excluded from the scroll container's overflow area calculation (per the
        CSS Overflow spec). When the strip was in-flow with width:max-content,
        the overflow:hidden container's min-content size became ~3000px, which
        propagated to <main>'s min-width and forced the page wider than the
        viewport, causing the horizontal scrollbar. Absolute positioning removes
        the strip from that calculation entirely.
      */}
      <div
        className="relative overflow-hidden"
        style={{ height: "46px" }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
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
