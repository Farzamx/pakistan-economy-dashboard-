"use client";

// The hero's signature live indicator tape. Values arrive pre-fetched from
// the server (see src/app/page.tsx) — this component only formats, counts
// up, and lays them out; it never fetches anything itself, so there is no
// spinner state and no placeholder: a value is either the real last-known
// number with its real date, or (if a fetch genuinely failed upstream)
// simply omitted from the array this component receives.
import { useEffect, useState } from "react";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";

export interface TapeCell {
  label: string;
  value: number;
  unit: string;
  decimals: number;
  direction: "up" | "down" | "flat";
  changeLabel: string;
  asOf: string;
}

const COUNT_UP_DURATION_MS = 600;
const STAGGER_MS = 50;
/** Matches the hero's overall entrance choreography — the tape begins after the trust line finishes (see Hero.tsx). */
const TAPE_START_DELAY_MS = 700;

function formatValue(n: number, decimals: number, unit: string): string {
  return `${n.toFixed(decimals)}${unit}`;
}

function DirectionGlyph({ direction }: { direction: TapeCell["direction"] }) {
  if (direction === "flat") return <span style={{ color: "var(--muted)" }}>→</span>;
  const isUp = direction === "up";
  return (
    <span aria-hidden="true" style={{ color: isUp ? "var(--up)" : "var(--down)" }}>
      {isUp ? "▲" : "▼"}
    </span>
  );
}

function Cell({ cell, index, animate }: { cell: TapeCell; index: number; animate: boolean }) {
  const [displayed, setDisplayed] = useState(animate ? 0 : cell.value);

  // No "already started" ref guard here on purpose: React Strict Mode's dev-only
  // mount→cleanup→remount double-invoke would set such a guard true on the first
  // (discarded) pass, then the real second pass would see it already true and
  // skip scheduling entirely — leaving displayed stuck at its initial 0 forever
  // (the exact "all values render as zero" bug this replaced). The cleanup
  // below already cancels any in-flight timer/frame, which is all that's
  // needed to make the double-invoke safe.
  useEffect(() => {
    if (!animate) return;
    const delay = TAPE_START_DELAY_MS + index * STAGGER_MS;
    let rafId: number | undefined;
    const startTimer = window.setTimeout(() => {
      const start = performance.now();
      function tick(now: number) {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / COUNT_UP_DURATION_MS);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayed(cell.value * eased);
        if (t < 1) rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(startTimer);
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  }, [animate, index, cell.value]);

  return (
    <div className="mkt-tape-cell flex min-w-[177px] shrink-0 snap-start flex-col gap-1 px-5 py-4 min-[1024px]:min-w-0 min-[1024px]:flex-1 min-[1024px]:px-6">
      <span className="text-[11px] uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
        {cell.label}
      </span>
      <span className="text-[18px] font-medium min-[1024px]:text-[20px]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--paper)" }}>
        {formatValue(displayed, cell.decimals, cell.unit)}
      </span>
      <span className="flex items-center gap-1 text-[12px]" style={{ fontFamily: "var(--font-marketing-data)" }}>
        <DirectionGlyph direction={cell.direction} />
        <span style={{ color: cell.direction === "up" ? "var(--up)" : cell.direction === "down" ? "var(--down)" : "var(--muted)" }}>{cell.changeLabel}</span>
      </span>
      <span className="text-[11px]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
        as of {cell.asOf}
      </span>
    </div>
  );
}

export default function LiveIndicatorTape({ cells }: { cells: TapeCell[] }) {
  const prefersReducedMotion = useSafeReducedMotion();
  const animate = !prefersReducedMotion;

  return (
    <div
      className="mkt-tape hide-scrollbar w-full overflow-x-auto min-[1024px]:overflow-visible"
      style={{ borderTop: "1px solid var(--ink-raised)", background: "rgba(18, 24, 41, 0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div className="mkt-tape-track flex snap-x snap-mandatory min-[1024px]:snap-none">
        {cells.map((cell, i) => (
          <div key={cell.label} className="flex min-[1024px]:flex-1" style={{ borderLeft: i === 0 ? "none" : "1px solid var(--ink-raised)" }}>
            <Cell cell={cell} index={i} animate={animate} />
          </div>
        ))}
      </div>
    </div>
  );
}
