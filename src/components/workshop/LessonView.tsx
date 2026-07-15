"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { Lesson, Language } from "@/lib/workshop/types";

interface Props {
  lesson: Lesson;
  category: string;
  prevLesson?: { slug: string; title: string };
  nextLesson?: { slug: string; title: string };
}

const LEVEL_BADGE: Record<string, string> = {
  beginner: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  intermediate: "bg-amber-400/15 text-amber-400 border-amber-400/30",
  advanced: "bg-rose-400/15 text-rose-400 border-rose-400/30",
};

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  ur: "اردو",
  rm: "Roman Urdu",
};

function pick<T extends Record<Language, string>>(obj: T, lang: Language): string {
  return obj[lang] ?? obj.en;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-semibold text-white light:text-slate-900 border-b border-white/5 light:border-slate-200 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function LessonView({ lesson, category, prevLesson, nextLesson }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const isUrdu = language === "ur";

  const textClass = isUrdu ? "urdu-text" : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs text-white/40 light:text-slate-400">
        <Link href="/" className="hover:text-white light:hover:text-slate-700 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/workshop" className="hover:text-white light:hover:text-slate-700 transition-colors">{t("workshop.backToWorkshop")}</Link>
        <span>/</span>
        <Link href={`/workshop/${category}`} className="hover:text-white light:hover:text-slate-700 transition-colors capitalize">
          {category}
        </Link>
        <span>/</span>
        <span className="truncate max-w-[120px]">{pick(lesson.title, language)}</span>
      </div>

      {/* Language selector */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs text-white/40 light:text-slate-400 mr-1">{t("workshop.languageLabel")}:</span>
        {(["en", "ur", "rm"] as Language[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              language === lang
                ? "border-amber-400/40 bg-amber-400/15 text-amber-400"
                : "border-white/10 light:border-slate-200 text-white/50 light:text-slate-500 hover:border-white/20 light:hover:border-slate-300 hover:text-white light:hover:text-slate-700"
            }`}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${LEVEL_BADGE[lesson.level]}`}>
            {lesson.level}
          </span>
          {lesson.isPremium && (
            <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-400">
              {t("workshop.premiumBadge")}
            </span>
          )}
          <span className="text-xs text-white/30 light:text-slate-400">
            {lesson.readMinutes} {t("workshop.readMin")}
          </span>
        </div>
        <h1 className={`text-3xl font-bold text-white light:text-slate-900 ${textClass}`}>
          {pick(lesson.title, language)}
        </h1>
        <p className={`mt-2 text-base text-white/60 light:text-slate-500 ${textClass}`}>
          {pick(lesson.subtitle, language)}
        </p>
      </div>

      {/* Content sections */}
      <Section title={t("workshop.explanation")}>
        <div className={`prose-lesson ${textClass}`}>
          {pick(lesson.content.explanation, language)
            .split("\n\n")
            .map((para, i) => {
              if (para.startsWith("•") || para.includes("\n•")) {
                const lines = para.split("\n").filter(Boolean);
                return (
                  <ul key={i} className="my-3 space-y-1 pl-4">
                    {lines.map((line, j) => (
                      <li key={j} className="text-sm text-white/75 light:text-slate-600 list-disc" dangerouslySetInnerHTML={{ __html: line.replace(/^•\s*/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
                    ))}
                  </ul>
                );
              }
              if (para.startsWith("**") || para.includes("**")) {
                return (
                  <p key={i} className="my-3 text-sm text-white/75 light:text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, "<strong class='text-white light:text-slate-800'>$1</strong>") }} />
                );
              }
              return (
                <p key={i} className="my-3 text-sm text-white/75 light:text-slate-600 leading-relaxed">
                  {para}
                </p>
              );
            })}
        </div>
      </Section>

      <Section title={t("workshop.pakistanExample")}>
        <div className="rounded-xl border border-neon-blue/20 bg-neon-blue/5 px-5 py-4">
          <div className={`prose-lesson ${textClass}`}>
            {pick(lesson.content.pakistanExample, language)
              .split("\n\n")
              .map((para, i) => (
                <p key={i} className="my-2 text-sm text-white/75 light:text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, "<strong class='text-white light:text-slate-800'>$1</strong>") }} />
              ))}
          </div>
        </div>
      </Section>

      <Section title={t("workshop.realWorld")}>
        <div className={`prose-lesson ${textClass}`}>
          {pick(lesson.content.realWorld, language)
            .split("\n\n")
            .map((para, i) => (
              <p key={i} className="my-3 text-sm text-white/75 light:text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, "<strong class='text-white light:text-slate-800'>$1</strong>") }} />
            ))}
        </div>
      </Section>

      <div className="grid gap-4 sm:grid-cols-2 mt-8">
        <Section title={t("workshop.whyTraders")}>
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-4">
            <div className={`prose-lesson ${textClass}`}>
              {pick(lesson.content.whyTraders, language)
                .split("\n\n")
                .map((para, i) => (
                  <p key={i} className="my-2 text-sm text-white/75 light:text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, "<strong class='text-white light:text-slate-800'>$1</strong>") }} />
                ))}
            </div>
          </div>
        </Section>
        <Section title={t("workshop.whyInvestors")}>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-4">
            <div className={`prose-lesson ${textClass}`}>
              {pick(lesson.content.whyInvestors, language)
                .split("\n\n")
                .map((para, i) => (
                  <p key={i} className="my-2 text-sm text-white/75 light:text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, "<strong class='text-white light:text-slate-800'>$1</strong>") }} />
                ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Related indicators */}
      {lesson.relatedIndicatorSlugs.length > 0 && (
        <Section title={t("workshop.relatedIndicators")}>
          <div className="flex flex-wrap gap-2">
            {lesson.relatedIndicatorSlugs.map((slug) => (
              <Link
                key={slug}
                href={`/${slug}`}
                className="rounded-lg border border-white/10 light:border-slate-200 bg-white/5 light:bg-slate-50 px-3 py-1.5 text-xs font-medium text-white/60 light:text-slate-600 hover:border-white/20 hover:text-white light:hover:text-slate-900 transition-colors"
              >
                {slug.replace(/-/g, " ").replace(/pakistan/g, "").trim()}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* FAQ */}
      {lesson.faq.length > 0 && (
        <Section title={t("workshop.faq")}>
          <div className="space-y-4">
            {lesson.faq.map((item, i) => (
              <div key={i} className="rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 px-5 py-4">
                <p className={`text-sm font-semibold text-white light:text-slate-900 mb-2 ${textClass}`}>
                  {pick(item.question, language)}
                </p>
                <p className={`text-sm text-white/65 light:text-slate-600 leading-relaxed ${textClass}`}>
                  {pick(item.answer, language)}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Prev / Next navigation */}
      <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/5 light:border-slate-200 pt-8">
        {prevLesson ? (
          <Link
            href={`/workshop/${category}/${prevLesson.slug}`}
            className="flex items-center gap-2 text-sm text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 8H3M7 4L3 8l4 4" />
            </svg>
            <span>{t("workshop.prevLesson")}: <span className="text-white/80 light:text-slate-700">{prevLesson.title}</span></span>
          </Link>
        ) : (
          <Link
            href={`/workshop/${category}`}
            className="flex items-center gap-2 text-sm text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 8H3M7 4L3 8l4 4" />
            </svg>
            {t("workshop.backToCategory")}
          </Link>
        )}
        {nextLesson && (
          <Link
            href={`/workshop/${category}/${nextLesson.slug}`}
            className="flex items-center gap-2 text-sm text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900 transition-colors ml-auto"
          >
            <span>{t("workshop.nextLesson")}: <span className="text-white/80 light:text-slate-700">{nextLesson.title}</span></span>
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
