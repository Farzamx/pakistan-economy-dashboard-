// Phase M1 §4 — collapses a group of secondary sections behind a "View
// more" toggle on mobile only, always fully expanded on desktop
// regardless of the <details> element's own open state. Pure CSS, zero
// JavaScript, zero hydration risk: the <summary> toggle is hidden above
// the nav breakpoint (`min-[800px]:hidden`), and the content wrapper is
// `hidden` unless the <details> is open (Tailwind's `group-open:`
// variant, itself just a CSS :is()/sibling-state selector) OR the
// viewport is at `min-[800px]`, where it's forced visible unconditionally.
// No `open` attribute is set server-side, so every visitor — mobile or
// desktop — gets the exact same server-rendered HTML; only the CSS cascade
// differs per breakpoint.
import type { ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

export default function MobileCollapsibleGroup({ label, children }: Props) {
  return (
    <details className="group">
      <summary className="mt-6 flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-white/70 light:text-slate-600 min-[800px]:hidden">
        {label}
        <span aria-hidden="true" className="text-white/40 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="hidden group-open:block min-[800px]:block">{children}</div>
    </details>
  );
}
