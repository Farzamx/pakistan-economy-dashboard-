import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/T";
import { LEARNING_PATHS } from "@/lib/academy/paths";
import { getLessonByCategoryAndSlug } from "@/lib/academy/registry";

export const metadata: Metadata = {
  title: "Learning Paths | Economic Academy",
  description: "Structured sequences to build economics expertise step by step — Pakistan-focused.",
};

export default function PathsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-10 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--neon-blue)]">
          <T tKey="academy.pathsTitle" />
        </p>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          <T tKey="academy.pathsSubtitle" />
        </h1>
      </header>

      <div className="space-y-8">
        {LEARNING_PATHS.map((path) => {
          return (
            <section
              key={path.slug}
              id={path.slug}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5"
            >
              <div>
                <p className="text-xs text-[var(--text-muted)] capitalize">{path.level}</p>
                <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                  {path.title.en}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{path.description.en}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {path.lessonRefs.length} lessons · ~{path.estimatedHours}h
                </p>
              </div>

              <ol className="space-y-3">
                {path.lessonRefs.map((ref, i) => {
                  const lesson = getLessonByCategoryAndSlug(ref.category, ref.slug);
                  return (
                    <li key={`${ref.category}/${ref.slug}`} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)]">
                        {i + 1}
                      </span>
                      {lesson ? (
                        <Link
                          href={`/academy/${ref.category}/${ref.slug}`}
                          className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--neon-blue)]"
                        >
                          {lesson.title.en}
                          <span className="ml-2 text-xs text-[var(--text-muted)]">
                            {lesson.readMinutes} min
                          </span>
                        </Link>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">{ref.slug}</span>
                      )}
                    </li>
                  );
                })}
              </ol>

              {path.lessonRefs[0] && (
                <Link
                  href={`/academy/${path.lessonRefs[0].category}/${path.lessonRefs[0].slug}`}
                  className="inline-block rounded-lg bg-[var(--neon-blue)] px-5 py-2 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
                >
                  <T tKey="academy.startPath" />
                </Link>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
