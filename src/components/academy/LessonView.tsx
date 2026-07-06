"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lesson } from "@/lib/academy/types";
import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/components/AuthProvider";
import AcademyLockScreen from "@/components/academy/AcademyLockScreen";
import QuizBlock from "@/components/academy/QuizBlock";
import { getCategoryMeta } from "@/lib/academy/registry";

interface LessonViewProps {
  lesson: Lesson;
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  intermediate: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  advanced: "text-rose-400 border-rose-500/40 bg-rose-500/10",
};

export default function LessonView({ lesson }: LessonViewProps) {
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const categoryMeta = getCategoryMeta(lesson.category);

  if (!user && !loading) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <AcademyLockScreen redirectAfterAuth={pathname} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--neon-blue)] border-t-transparent" />
      </div>
    );
  }

  const lvlCls = LEVEL_COLORS[lesson.level] ?? "text-[var(--text-muted)] border-[var(--border)] bg-[var(--surface-2)]";
  const levelLabel = t(`academy.${lesson.level}`);

  return (
    <article className="mx-auto max-w-3xl space-y-10 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Link href="/academy" className="hover:text-[var(--text-primary)]">
          {t("academy.title")}
        </Link>
        <span>/</span>
        <Link href={`/academy/${lesson.category}`} className="hover:text-[var(--text-primary)]">
          {categoryMeta?.title[language] ?? lesson.category}
        </Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">{lesson.title[language]}</span>
      </nav>

      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${lvlCls}`}>
            {levelLabel}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {lesson.readMinutes} {t("academy.readMin")}
          </span>
          {lesson.isPremium && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
              {t("academy.premiumBadge")}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
          {lesson.title[language]}
        </h1>
        <p className="text-base text-[var(--text-muted)]">{lesson.subtitle[language]}</p>
      </header>

      {/* Overview */}
      <ContentSection label={t("academy.overview")}>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {lesson.content.overview[language]}
        </p>
      </ContentSection>

      {/* Why It Matters */}
      <ContentSection label={t("academy.whyItMatters")}>
        <Prose text={lesson.content.whyItMatters[language]} />
      </ContentSection>

      {/* Explanation */}
      <ContentSection label={t("academy.explanation")}>
        <Prose text={lesson.content.explanation[language]} />
      </ContentSection>

      {/* Pakistan Example */}
      <ContentSection label={t("academy.pakistanExample")}>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <Prose text={lesson.content.pakistanExample[language]} />
        </div>
      </ContentSection>

      {/* Misconceptions */}
      <ContentSection label={t("academy.misconceptions")}>
        <Prose text={lesson.content.misconceptions[language]} />
      </ContentSection>

      {/* Real World */}
      <ContentSection label={t("academy.realWorld")}>
        <Prose text={lesson.content.realWorld[language]} />
      </ContentSection>

      {/* Summary */}
      <ContentSection label={t("academy.summary")}>
        <div className="rounded-2xl border border-[var(--neon-blue)]/20 bg-[var(--neon-blue)]/5 p-5">
          <Prose text={lesson.content.summary[language]} />
        </div>
      </ContentSection>

      {/* Quiz */}
      {lesson.quiz.length > 0 && (
        <ContentSection label={t("academy.quizStart")}>
          <QuizBlock questions={lesson.quiz} />
        </ContentSection>
      )}

      {/* FAQ */}
      {lesson.faq.length > 0 && (
        <ContentSection label={t("academy.faq")}>
          <div className="space-y-4">
            {lesson.faq.map((item, i) => (
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
        </ContentSection>
      )}

      {/* Related */}
      {lesson.relatedLessonSlugs.length > 0 && (
        <ContentSection label={t("academy.relatedLessons")}>
          <div className="flex flex-col gap-2">
            {lesson.relatedLessonSlugs.map((slug) => (
              <Link
                key={slug}
                href={`/academy/${lesson.category}/${slug}`}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--neon-blue)]"
              >
                <span className="text-[var(--neon-blue)]">→</span>
                {slug}
              </Link>
            ))}
          </div>
        </ContentSection>
      )}

      {/* Back */}
      <div className="pt-4">
        <Link
          href={`/academy/${lesson.category}`}
          className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          ← {t("academy.backToCategory")}
        </Link>
      </div>
    </article>
  );
}

function ContentSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </h2>
      {children}
    </section>
  );
}

function Prose({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => {
        if (p.startsWith("**") || p.startsWith("•")) {
          return (
            <p key={i} className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
              {p}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {p}
          </p>
        );
      })}
    </div>
  );
}
