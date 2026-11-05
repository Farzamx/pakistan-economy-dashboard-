// Content section primitive for redesigned pages (PEIC redesign Phase 2).
// Introduced here for later phases; no existing page uses it yet.
// Server-compatible (no hooks).
//
// A bordered white (dark: navy-grey) surface with a compact heading row —
// 6px corners, a hairline border and no shadow, replacing the old
// glass-card / rounded-2xl treatment for data content.

import type { ReactNode } from "react";

interface SectionProps {
  /** Anchor id — also used to label the region for assistive tech. */
  id?: string;
  title?: string;
  description?: ReactNode;
  /** Right side of the heading row, e.g. a "View all →" link. */
  actions?: ReactNode;
  /** Remove inner padding when the child (a full-bleed table) brings its own. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

export default function Section({ id, title, description, actions, flush = false, className = "", children }: SectionProps) {
  const headingId = id && title ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={`rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface text-pe-text ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-pe-border px-4 py-2.5">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="text-[15px] font-semibold text-pe-text">
                {title}
              </h2>
            )}
            {description && <div className="text-[13px] text-pe-text-2">{description}</div>}
          </div>
          {actions && <div className="shrink-0 text-[13px]">{actions}</div>}
        </div>
      )}
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}
