import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { T } from "@/components/T";
import {
  CATEGORY_META,
  getLessonsByCategory,
  getCategoryMeta,
  getCategoryColors,
} from "@/lib/academy/registry";
import type { AcademyCategory } from "@/lib/academy/types";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return CATEGORY_META.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const meta = getCategoryMeta(category as AcademyCategory);
  if (!meta) return {};
  return {
    title: `${meta.title.en} | Economic Academy`,
    description: meta.description.en,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const meta = getCategoryMeta(category as AcademyCategory);
  if (!meta) notFound();

  const lessons = getLessonsByCategory(category as AcademyCategory);
  const colors = getCategoryColors(meta.color);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Link href="/academy" className="hover:text-[var(--text-primary)]">
          <T tKey="academy.title" />
        </Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">{meta.title.en}</span>
      </nav>

      {/* Header */}
      <header className="mb-10 space-y-3">
        <div className="text-3xl">{meta.icon}</div>
        <h1 className={`text-3xl font-bold ${colors.text}`}>{meta.title.en}</h1>
        <p className="max-w-xl text-base text-[var(--text-muted)]">{meta.description.en}</p>
      </header>

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            <T tKey="academy.lessons" /> coming soon.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <Link
              key={lesson.slug}
              href={`/academy/${lesson.category}/${lesson.slug}`}
              className="group flex items-start gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--neon-blue)]"
            >
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs capitalize text-[var(--text-muted)]">
                    {lesson.level}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">·</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {lesson.readMinutes} min
                  </span>
                  {lesson.isPremium && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                      <T tKey="academy.premiumBadge" />
                    </span>
                  )}
                </div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--neon-blue)]">
                  {lesson.title.en}
                </h2>
                <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                  {lesson.subtitle.en}
                </p>
              </div>
              <span className="mt-1 text-[var(--neon-blue)] opacity-0 transition-opacity group-hover:opacity-100">
                →
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10">
        <Link
          href="/academy"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          ← <T tKey="academy.backToAcademy" />
        </Link>
      </div>
    </main>
  );
}
