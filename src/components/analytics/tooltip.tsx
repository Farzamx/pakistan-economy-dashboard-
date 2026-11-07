"use client";

// Tooltip plumbing shared by the hand-drawn SVG/HTML charts.
//
// One tooltip at a time, anchored in the chart's own container so it can never
// be clipped by the page. It opens on mouse hover, on a TAP (touch has no
// hover), and on keyboard focus (marks are focusable), and closes when the
// pointer leaves, when a tap lands elsewhere, or on Escape — so a tooltip can
// never get stuck open on a phone.

import { useCallback, useEffect, useState, type ReactNode } from "react";

export interface TipState<T> {
  /** Position inside the container, px. */
  x: number;
  y: number;
  data: T;
}

export interface ChartTooltipApi<T> {
  tip: TipState<T> | null;
  /** Open at a pointer position (mouse move / tap). */
  showAtPointer: (e: { clientX: number; clientY: number }, data: T) => void;
  /** Open anchored to an element (keyboard focus). */
  showAtElement: (el: Element, data: T) => void;
  hide: () => void;
  width: number;
}

/**
 * Returns the tooltip state and, separately, the callback to attach to the chart’s container
 * (`ref={attach}`). `attach` stores the element in state, so no ref OBJECT is read during
 * render; it is kept apart from the state object so that’s evident to the linter too.
 */
export function useChartTooltip<T>(): [ChartTooltipApi<T>, (el: HTMLDivElement | null) => void] {
  const [container, attach] = useState<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<TipState<T> | null>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = container;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el); // reports the initial size straight away, then on every resize
    return () => ro.disconnect();
  }, [container]);

  // A tap outside the chart, or Escape, closes an open tooltip.
  useEffect(() => {
    if (!tip) return;
    const onDown = (e: PointerEvent) => {
      if (container && !container.contains(e.target as Node)) setTip(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTip(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [tip, container]);

  const showAtPointer = useCallback((e: { clientX: number; clientY: number }, data: T) => {
    const r = container?.getBoundingClientRect();
    if (!r) return;
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, data });
  }, [container]);

  const showAtElement = useCallback((el: Element, data: T) => {
    const c = container?.getBoundingClientRect();
    if (!c) return;
    const r = el.getBoundingClientRect();
    setTip({ x: r.left - c.left + r.width / 2, y: r.top - c.top, data });
  }, [container]);

  const hide = useCallback(() => setTip(null), []);
  return [{ tip, showAtPointer, showAtElement, hide, width }, attach];
}

/** The tooltip card. Flips to the left of the pointer in the right half of the chart. */
export function TooltipBox<T>({ api, children }: { api: ChartTooltipApi<T>; children: (data: T) => ReactNode }) {
  const { tip, width } = api;
  if (!tip) return null;
  const flip = tip.x > width * 0.6;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 max-w-[240px] rounded-[var(--pe-radius)] border px-2.5 py-2 text-[12px] leading-snug shadow-[var(--pe-shadow-pop)]"
      style={{
        left: tip.x,
        top: Math.max(4, tip.y),
        transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -50%)`,
        background: "var(--chart-tooltip-bg)",
        borderColor: "var(--chart-tooltip-border)",
        color: "var(--chart-tooltip-value)",
      }}
    >
      {children(tip.data)}
    </div>
  );
}

/** A tooltip row: label on the left, tabular value on the right. */
export function TipRow({ label, value, swatch }: { label: ReactNode; value: ReactNode; swatch?: string }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5" style={{ color: "var(--chart-tooltip-label)" }}>
        {swatch && <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: swatch }} />}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </p>
  );
}

export function TipTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-[11px] font-medium" style={{ color: "var(--chart-tooltip-label)" }}>
      {children}
    </p>
  );
}
