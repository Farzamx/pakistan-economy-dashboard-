"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import type { BudgetToolkitContent } from "@/data/budgetEducation";
import { useLanguage } from "@/components/LanguageProvider";
import { Disclosure } from "@/components/shell/Disclosure";

interface BudgetToolkitProps {
  toolkit: BudgetToolkitContent;
  /** Lead with the first paragraph and keep the rest behind a disclosure. For overview pages; explainer pages, where this text is the content, leave it off. */
  compact?: boolean;
}

/** Splits a paragraph on the lightweight [label](href) link syntax used in budgetEducation.ts and renders real <Link> elements in place — same idea as Markdown, scoped to just this one pattern. */
function renderWithLinks(paragraph: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = linkPattern.exec(paragraph)) !== null) {
    if (match.index > lastIndex) parts.push(<Fragment key={key++}>{paragraph.slice(lastIndex, match.index)}</Fragment>);
    parts.push(
      <Link key={key++} href={match[2]} className="text-neon-blue underline-offset-2 hover:underline">
        {match[1]}
      </Link>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < paragraph.length) parts.push(<Fragment key={key++}>{paragraph.slice(lastIndex)}</Fragment>);
  return parts;
}

export default function BudgetToolkit({ toolkit, compact = false }: BudgetToolkitProps) {
  const { t } = useLanguage();
  const [urduVisible, setUrduVisible] = useState(false);
  const englishParagraphs = toolkit.content.split("\n\n");
  const urduParagraphs = toolkit.contentRomanUrdu.split("\n\n");

  return (
    <section className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-white light:text-slate-900">{toolkit.title}</h2>
        <button
          type="button"
          onClick={() => setUrduVisible((v) => !v)}
          aria-pressed={urduVisible}
          className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          {urduVisible ? t("budget.hideRomanUrdu") : t("budget.romanUrdu")}
        </button>
      </div>

      <div className="space-y-3">
        {(compact ? englishParagraphs.slice(0, 1) : englishParagraphs).map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-white/65 light:text-slate-600">
            {renderWithLinks(p)}
          </p>
        ))}
        {compact && englishParagraphs.length > 1 && (
          <Disclosure summary="Read more: how the budget is shared out and spent" testId="budget-toolkit-more">
            <div className="mt-1 space-y-3">
              {englishParagraphs.slice(1).map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-white/65 light:text-slate-600">
                  {renderWithLinks(p)}
                </p>
              ))}
            </div>
          </Disclosure>
        )}
      </div>

      {urduVisible && (
        <div className="mt-2 space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{t("budget.romanUrdu")}</p>
          {urduParagraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-white/70 light:text-slate-600">
              {p}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
