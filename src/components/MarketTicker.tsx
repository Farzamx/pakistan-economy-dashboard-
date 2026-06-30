"use client";

import { useState } from "react";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import InfoTooltip from "@/components/InfoTooltip";
import { DATA_QUALITY_DOT, type DataQualityState } from "@/lib/dataQuality";

export interface TickerItem {
  label: string;
  value: string;
  unit: string;
  changeDisplay: string | null;
  trend: "up" | "down" | "neutral";
  termKey: string;
  /**
   * Production Audit Part 3 fix: the ticker previously carried zero
   * freshness/fallback metadata at all — the least transparent surface on
   * the dashboard, since every other KPI display went through the
   * unified Data Quality badge. Optional so older callers (none remain,
   * but keeps this non-breaking) degrade gracefully with no dot rather
   * than a crash.
   */
  quality?: DataQualityState;
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

      {/* Only shown when degraded — Verified is the normal case and would just be visual noise repeated on every chip. */}
      {item.quality && item.quality !== "Verified" && (
        <span className={`text-[9px] ${DATA_QUALITY_DOT[item.quality]}`} title={item.quality} aria-label={item.quality}>
          &#9679;
        </span>
      )}

      <InfoTooltip termKey={item.termKey} size="xs" />
    </span>
  );
}

interface MarketTickerProps {
  items: TickerItem[];
}

export default function MarketTicker({ items }: MarketTickerProps) {
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useSafeReducedMotion();

  // Duplicate items for the seamless loop: animation moves -50% of the strip's
  // total width, at which point the second copy aligns exactly with where the
  // first started — no jump, no JS timer.
  const doubled = [...items, ...items];

  return (
    <div
      aria-label="Live market data"
      className="mt-6 rounded-xl border border-white/[0.06] light:border-slate-200 bg-white/[0.02] light:bg-white"
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
            // Longhand properties only — mixing the `animation` shorthand
            // with the `animationPlayState` longhand in one style object
            // makes React DOM warn ("conflicting property") on any re-render
            // that changes either value, e.g. when prefersReducedMotion
            // resolves post-mount.
            animationName: prefersReducedMotion ? "none" : "ticker-scroll",
            animationDuration: "40s",
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
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
