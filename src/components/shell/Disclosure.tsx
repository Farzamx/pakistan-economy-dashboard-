// Progressive-disclosure primitives: a native <details>, so the content is in the page (readable, searchable, crawlable, usable without JavaScript) but
// out of the way until asked for. Server-compatible (no hooks).
//
// The rule these exist to serve: essential information (units, source, coverage, freshness, the limits that change how a number is read) stays visible;
// the explanation behind it goes behind a short, honest label. Nothing is removed.

import type { ReactNode } from "react";

const SUMMARY =
  "inline-flex cursor-pointer select-none items-center gap-1.5 rounded-[var(--pe-radius-sm)] py-1 text-[13px] font-medium text-pe-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pe-focus)] [&::-webkit-details-marker]:hidden";

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-90">
      <path d="M3 1.5L7 5L3 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A single collapsible block with a short label. */
export function Disclosure({ summary, children, defaultOpen = false, className = "", testId }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string; testId?: string }) {
  return (
    <details className={`group ${className}`} open={defaultOpen} data-testid={testId}>
      <summary className={SUMMARY}>
        <Chevron />
        {summary}
      </summary>
      <div className="mt-1 text-[13px] leading-relaxed text-pe-text-2">{children}</div>
    </details>
  );
}

/**
 * Splits a plain-text explanation into its first sentence and the rest, so a block leads with the point and keeps the detail one click away.
 * Only splits when the first sentence is a real sentence (not an abbreviation such as "e.g." or "vs.") and something follows it.
 */
export function splitLead(text: string): { lead: string; rest: string | null } {
  const m = /^([\s\S]{24,}?[.!?])\s+(\S[\s\S]*)$/.exec(text.trim());
  if (!m || /\b(e\.g|i\.e|vs|approx|incl|no|rs|st|dr)\.$/i.test(m[1])) return { lead: text, rest: null };
  return { lead: m[1], rest: m[2] };
}

/**
 * A paragraph that leads with its first sentence; any further sentences sit behind a small "More" disclosure (still in the markup). A non-string child is
 * shown as is. `leadClassName` styles the always-visible sentence.
 */
export function LeadMore({ children, className = "", leadClassName = "", moreLabel = "More" }: { children: ReactNode; className?: string; leadClassName?: string; moreLabel?: string }) {
  const parts = typeof children === "string" ? splitLead(children) : { lead: children, rest: null };
  return (
    <div className={className}>
      <p className={leadClassName}>{parts.lead}</p>
      {parts.rest && (
        <details className="group">
          <summary className="inline-flex cursor-pointer select-none items-center gap-1 rounded-[var(--pe-radius-sm)] py-0.5 text-[12px] font-medium text-pe-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pe-focus)] [&::-webkit-details-marker]:hidden">
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-90">
              <path d="M3 1.5L7 5L3 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {moreLabel}
          </summary>
          <p className={`mt-0.5 ${leadClassName}`}>{parts.rest}</p>
        </details>
      )}
    </div>
  );
}

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

/** Questions as an accordion: the question is always visible, the answer opens on demand. Pair it with the FAQ structured data, which carries every answer. */
export function FaqAccordion({ items, className = "" }: { items: readonly FaqItem[]; className?: string }) {
  return (
    <div className={`divide-y divide-pe-border ${className}`} data-testid="faq-accordion">
      {items.map((item, i) => (
        <details key={i} className="group px-4 py-2.5">
          <summary className="flex cursor-pointer select-none items-center gap-2 rounded-[var(--pe-radius-sm)] text-[14px] font-medium text-pe-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pe-focus)] [&::-webkit-details-marker]:hidden">
            <Chevron />
            {item.question}
          </summary>
          <div className="mt-1.5 ps-[18px] text-[14px] leading-relaxed text-pe-text-2">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
