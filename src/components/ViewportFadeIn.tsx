"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** y-offset to slide from. Default 40px. */
  y?: number;
}

/**
 * Wraps children in a Framer Motion div that fades + slides up once the
 * element enters the viewport. Immediately shows content if the user has
 * prefers-reduced-motion enabled.
 */
export default function ViewportFadeIn({ children, delay = 0, className, y = 40 }: Props) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
