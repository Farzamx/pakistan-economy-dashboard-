"use client";

import { useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";

interface Props {
  value: string;
}

interface Parsed {
  numeric: number;
  decimals: number;
  negative: boolean;
}

function parseNumeric(raw: string): Parsed | null {
  const cleaned = raw.replace(/,/g, "");
  const numeric = parseFloat(cleaned);
  if (!isFinite(numeric)) return null;
  const dotIdx = cleaned.indexOf(".");
  const decimals = dotIdx >= 0 ? cleaned.length - dotIdx - 1 : 0;
  return { numeric: Math.abs(numeric), decimals, negative: numeric < 0 };
}

function formatNumeric(num: number, decimals: number, negative: boolean): string {
  const sign = negative ? "-" : "";
  return (
    sign +
    num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/**
 * Animates a numeric string from 0 → value when the element enters the
 * viewport (once). Falls back to showing the value directly if:
 *   - the value is non-numeric (e.g. "—")
 *   - prefers-reduced-motion is active
 *   - JavaScript is disabled (SSR / hydration: shows real value throughout)
 */
export default function AnimatedValue({ value }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();

  const parsed = parseNumeric(value);
  const shouldPlay = isInView && !prefersReducedMotion && parsed !== null;

  const animated = useCountUp(parsed?.numeric ?? 0, 1200, shouldPlay);

  const displayValue =
    parsed === null || prefersReducedMotion || !isInView
      ? value
      : formatNumeric(animated, parsed.decimals, parsed.negative);

  return (
    <span ref={ref} suppressHydrationWarning>
      {displayValue}
    </span>
  );
}
