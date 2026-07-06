import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/T";
import { CATEGORY_META, ALL_LESSONS, getCategoryColors } from "@/lib/academy/registry";
import { LEARNING_PATHS } from "@/lib/academy/paths";

export const metadata: Metadata = {
  title: "Economic Academy — Learn Pakistan Economics | Pakistan Economy Dashboard",
  description:
    "Free multilingual economics education — beginner to advanced, Pakistan-focused. Inflation, GDP, monetary policy, fiscal policy, Islamic finance, and 30+ categories.",
  openGraph: {
    title: "Economic Academy",
    description: "Learn economics through Pakistan's real data — free, multilingual, and comprehensive.",
  },
};

export default function AcademyPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <section className="mb-12 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--neon-blue)]">
          <T tKey="academy.heroEyebrow" />
        </p>
        <h1 className="text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">
          <T tKey="academy.heroTitle" />
        </h1>
        <p className="max-w-2xl text-lg text-[var(--text-muted)]">
          <T tKey="academy.heroSubtitle" />
        </p>
        <div className="flex flex-wrap gap-6 pt-2 text-sm text-[var(--text-muted)]">
          <span>
            <strong className="text-[var(--text-primary)]">{ALL_LESSONS.length}+</strong>{" "}
            <T tKey="academy.statLessons" />
          </span>
          <span>
            <strong className="text-[var(--text-primary)]">{CATEGORY_META.length}</strong>{" "}
            <T tKey="academy.statCategories" />
          </span>
          <span>
            <strong className="text-[var(--text-primary)]">11+</strong>{" "}
            <T tKey="academy.statTerms" />
          </span>
        </div>
      </section>

      {/* Learning Paths */}
      <section className="mb-14">
        <h2 className="mb-6 text-xl font-bold text-[var(--text-primary)]">
          <T tKey="academy.pathsTitle" />
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {LEARNING_PATHS.map((path) => (
            <Link
              key={path.slug}
              href={`/academy/paths#${path.slug}`}
              className="glass-card group rounded-2xl border border-[var(--border)] p-5 transition-colors hover:border-[var(--neon-blue)]"
            >
              <p className="text-xs text-[var(--text-muted)] capitalize">{path.level}</p>
              <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--neon-blue)]">
                {path.title.en}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">
                {path.description.en}
              </p>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                {path.lessonRefs.length} lessons · {path.estimatedHours}h
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-14">
        <h2 className="mb-6 text-xl font-bold text-[var(--text-primary)]">
          <T tKey="academy.categoriesTitle" />
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_META.map((cat) => {
            const colors = getCategoryColors(cat.color);
            const lessonCount = ALL_LESSONS.filter((l) => l.category === cat.slug).length;
            return (
              <Link
                key={cat.slug}
                href={`/academy/${cat.slug}`}
                className={`group rounded-2xl border p-5 transition-colors hover:shadow-md ${colors.border} ${colors.bg}`}
              >
                <div className="mb-3 text-2xl">{cat.icon}</div>
                <h3 className={`text-sm font-bold ${colors.text}`}>{cat.title.en}</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">
                  {cat.description.en}
                </p>
                {lessonCount > 0 && (
                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Glossary CTA */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--neon-blue)]">
          <T tKey="academy.glossaryTitle" />
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
          <T tKey="academy.glossarySubtitle" />
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          CPI, GDP, Inflation, KIBOR, T-Bills, PIBs, SBP, PBS, IMF, Remittances, Fiscal Deficit — and more.
        </p>
        <Link
          href="/academy/glossary"
          className="mt-5 inline-block rounded-lg bg-[var(--neon-blue)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          <T tKey="academy.glossaryBrowseAll" />
        </Link>
      </section>
    </main>
  );
}
