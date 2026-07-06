"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { ALL_GLOSSARY_TERMS, searchTerms } from "@/lib/academy/glossary/registry";

export default function GlossaryPage() {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");

  const results = searchTerms(query);

  const grouped = results.reduce<Record<string, typeof results>>((acc, term) => {
    const first = term.term.en[0].toUpperCase();
    if (!acc[first]) acc[first] = [];
    acc[first].push(term);
    return acc;
  }, {});

  const letters = Object.keys(grouped).sort();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Header */}
      <header className="mb-8 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--neon-blue)]">
          {t("academy.glossaryTitle")}
        </p>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {t("academy.glossarySubtitle")}
        </h1>
      </header>

      {/* Search */}
      <div className="mb-8">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("academy.glossarySearch")}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--neon-blue)] focus:outline-none"
        />
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t("academy.glossaryNoResults")}</p>
      ) : (
        <div className="space-y-10">
          {letters.map((letter) => (
            <section key={letter}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {letter}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped[letter].map((term) => (
                  <Link
                    key={term.slug}
                    href={`/academy/glossary/${term.slug}`}
                    className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--neon-blue)]"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--neon-blue)]">
                        {term.term[language]}
                      </span>
                      {term.abbreviation && (
                        <span className="text-xs text-[var(--neon-blue)]">
                          ({term.abbreviation})
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">
                      {term.definition[language]}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
