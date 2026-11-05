// Page header primitive for redesigned pages (PEIC redesign Phase 2).
// Introduced here for later phases; no existing page uses it yet, so it has
// no effect on any current route. Server-compatible (no hooks).
//
// Sans-serif only and deliberately plain: a title, one line of context, and
// a slot for the source / last-updated stamp — the data below it is the
// point of the page, not the header.

import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** Short category line above the title, e.g. "Indicators · Prices". */
  eyebrow?: string;
  description?: ReactNode;
  /** Right-aligned controls (range selector, export, …). */
  actions?: ReactNode;
  /** Source / last-updated stamp. Always pass real values or omit — never a placeholder. */
  meta?: ReactNode;
}

export default function PageHeader({ title, eyebrow, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="border-b border-pe-border pb-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-pe-text-3">{eyebrow}</p>}
          <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.01em] text-pe-text [text-wrap:balance] sm:text-[28px]">{title}</h1>
          {description && <div className="mt-1.5 text-[14px] leading-relaxed text-pe-text-2">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {meta && <div className="mt-3 font-mono text-[12px] text-pe-text-3">{meta}</div>}
    </header>
  );
}
