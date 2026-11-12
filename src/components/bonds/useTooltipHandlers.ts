"use client";

// Event handlers for a chart hit area (an SVG rect) that shows a tooltip by mouse, keyboard AND touch.
//
// Why not just onMouseEnter / onMouseLeave: on a touch screen the browser sends those only as synthetic "compatibility" events after a tap, and it can send
// a trailing mouseleave when it re-targets its last pointer position (headless Chrome's touch emulation does exactly this, and the tooltip then closes the
// instant it opens). So touch is handled from the pointer events, which are real, and mouse enter/leave are ignored for a moment after a touch.
//
//   mouse     hover shows, leaving hides                         (unchanged)
//   keyboard  focus shows, blur hides                            (unchanged)
//   touch     a tap shows (on pointerup); a tap on empty chart area hides it (onBlankPointerDown); a tap outside the chart hides it (useChartTooltip)

import { useRef, type FocusEvent, type MouseEvent, type PointerEvent } from "react";
import type { ChartTooltipApi } from "@/components/analytics/tooltip";

const TOUCH_QUIET_MS = 700;

export function useTooltipHandlers<T>(tip: ChartTooltipApi<T>) {
  const lastTouch = useRef(0);
  const recentlyTouched = () => Date.now() - lastTouch.current < TOUCH_QUIET_MS;
  return {
    /** Spread onto the hit area: `<rect {...hit(data)} />`. */
    hit: (data: T) => ({
      onPointerDown: (e: PointerEvent) => {
        if (e.pointerType === "touch") lastTouch.current = Date.now();
      },
      onPointerUp: (e: PointerEvent) => {
        if (e.pointerType === "touch") tip.showAtPointer(e, data);
      },
      onMouseEnter: (e: MouseEvent) => {
        if (!recentlyTouched()) tip.showAtPointer(e, data);
      },
      onMouseMove: (e: MouseEvent) => {
        if (!recentlyTouched()) tip.showAtPointer(e, data);
      },
      onMouseLeave: () => {
        if (!recentlyTouched()) tip.hide();
      },
      onFocus: (e: FocusEvent<SVGElement>) => tip.showAtElement(e.currentTarget, data),
      onBlur: () => {
        if (!recentlyTouched()) tip.hide();
      },
    }),
    /** Put on the chart's <svg>: a touch on anything that is not a hit area closes the tooltip. */
    onBlankPointerDown: (e: PointerEvent) => {
      if (e.pointerType === "touch" && (e.target as Element).getAttribute("role") !== "img") tip.hide();
    },
  };
}
