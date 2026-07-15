"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** y-offset to slide from. Default 40px. */
  y?: number;
  /** Position within a sequenced group (e.g. a card grid) — when set, adds `index * staggerStep` on top of `delay` so callers don't have to compute the stagger offset themselves. */
  index?: number;
  /** Delay step per index, in seconds. Default 0.06. Ignored if `index` is omitted. */
  staggerStep?: number;
}

/**
 * Wraps children in a Framer Motion div that fades + slides up once the
 * element enters the viewport. Immediately shows content if the user has
 * prefers-reduced-motion enabled.
 */
export default function ViewportFadeIn({ children, delay = 0, className, y = 40, index, staggerStep = 0.06 }: Props) {
  const prefersReducedMotion = useSafeReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const effectiveDelay = index !== undefined ? delay + index * staggerStep : delay;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: effectiveDelay }}
    >
      {children}
    </motion.div>
  );
}
