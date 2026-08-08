"use client";

// Shared below-the-fold reveal for every marketing landing section — exactly
// the spec: IntersectionObserver at threshold 0.15, opacity + 16px rise,
// 400ms, fires once then unobserve()s. CSS (see .mkt-reveal in globals.css)
// owns the actual transition and the prefers-reduced-motion override, so a
// reduced-motion visitor always sees content at its final state regardless
// of what this component's own state does.
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export default function SectionReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`mkt-reveal${visible ? " mkt-reveal--visible" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
