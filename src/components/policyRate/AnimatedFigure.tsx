"use client";

// A number that counts up the first time it scrolls into view, for the KPI tiles.
//
// It animates only the digits: "12.00%", "+0.39 pp" and "−1.20%" keep their sign and unit exactly as given. The server (and the first client
// render, and anyone with JavaScript off or prefers-reduced-motion set) shows the finished value, so the count-up is decoration on top of
// a figure that is always present. The animated value always ends on the exact string it was given.

import { useRef } from "react";
import { useInView } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";

const PARSE = /^([+−-]?)(\d+(?:\.\d+)?)([\s\S]*)$/;

export interface FigureParts {
  sign: string;
  number: number;
  decimals: number;
  suffix: string;
}

/** Splits "−1.20%" into its sign, number, decimals and unit. null when the text does not start with a number (it is then shown as given). */
export function parseFigure(value: string): FigureParts | null {
  const m = PARSE.exec(value);
  return m ? { sign: m[1], number: Number(m[2]), decimals: (m[2].split(".")[1] ?? "").length, suffix: m[3] } : null;
}

/** The text at an intermediate count: same sign, decimals and unit, only the digits change. */
export function figureAt(parts: FigureParts, current: number): string {
  return `${parts.sign}${current.toFixed(parts.decimals)}${parts.suffix}`;
}

export default function AnimatedFigure({ value, duration = 1100 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useSafeReducedMotion();
  const parts = parseFigure(value);
  const play = inView && !reduced && parts !== null;
  const current = useCountUp(parts?.number ?? 0, duration, play);
  const shown = play && parts ? figureAt(parts, current) : value;
  return (
    <span ref={ref} suppressHydrationWarning>
      {shown}
    </span>
  );
}
