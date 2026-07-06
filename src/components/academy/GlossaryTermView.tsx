"use client";

import Link from "next/link";
import type { GlossaryTerm } from "@/lib/academy/glossary/types";
import { useLanguage } from "@/components/LanguageProvider";

interface GlossaryTermViewProps {
  term: GlossaryTerm;
}

export default function GlossaryTermView({ term }: GlossaryTermViewProps) {
  const { t, language } = useLanguage();

  return (
    <article className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-2">
        {term.abbreviation && (
          <p className="text-sm font-semibold tracking-wider text-[var(--neon-blue)] uppercase">
            {term.abbreviation}
          </p>
        )}
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {term.term[language]}
        </h1>
      </header>

      <Section label={t("academy.termDefinition")}>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {term.definition[language]}
        </p>
      </Section>

      <Section label={t("academy.termExplanation")}>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {term.beginnerExplanation[language]}
        </p>
      </Section>

      <Section label={t("academy.termPakistanContext")}>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {term.pakistanContext[language]}
        </p>
      </Section>

      <Section label={t("academy.termExample")}>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {term.example[language]}
          </p>
        </div>
      </Section>

      {term.faq.length > 0 && (
        <Section label={t("academy.faq")}>
          <div className="space-y-4">
            {term.faq.map((item, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                  {item.question[language]}
                </p>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {item.answer[language]}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {term.relatedTermSlugs.length > 0 && (
        <Section label={t("academy.termRelated")}>
          <div className="flex flex-wrap gap-2">
            {term.relatedTermSlugs.map((slug) => (
              <Link
                key={slug}
                href={`/academy/glossary/${slug}`}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--neon-blue)] hover:text-[var(--neon-blue)]"
              >
                {slug}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {term.relatedLessonSlugs.length > 0 && (
        <Section label={t("academy.relatedLessons")}>
          <div className="flex flex-col gap-2">
            {term.relatedLessonSlugs.map(({ category, slug }) => (
              <Link
                key={`${category}/${slug}`}
                href={`/academy/${category}/${slug}`}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--neon-blue)]"
              >
                <span className="text-[var(--neon-blue)]">→</span>
                {slug}
              </Link>
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </h2>
      {children}
    </section>
  );
}
