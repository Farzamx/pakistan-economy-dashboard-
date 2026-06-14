"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

// Wraps the app so every Framer Motion animation automatically respects
// the visitor's OS-level "Reduce motion" accessibility setting.
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
