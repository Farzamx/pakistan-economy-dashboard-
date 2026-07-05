import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { CATEGORY_META, getLessonsByCategory } from "@/lib/workshop/registry";
import type { WorkshopCategory } from "@/lib/workshop/types";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";
import { T } from "@/components/T";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return CATEGORY_META.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORY_META.find((c) => c.slug === category);
  if (!cat) return {};
  const title = `${cat.title.en} — Economic Workshop`;
  const description = cat.description.en;
  const url = `${SITE_URL}/workshop/${category}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const LEVEL_BADGE: Record<string, string> = {
  beginner: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  intermediate: "bg-amber-400/15 text-amber-400 border-amber-400/30",
  advanced: "bg-rose-400/15 text-rose-400 border-rose-400/30",
};

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = CATEGORY_META.find((c) => c.slug === category);
  if (!cat) notFound();

  const lessons = getLessonsByCategory(category as WorkshopCategory);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-xs text-white/40 light:text-slate-400">
            <Link href="/" className="hover:text-white light:hover:text-slate-700 transition-colors"><T tKey="workshop.home" /></Link>
            <span>/</span>
            <Link href="/workshop" className="hover:text-white light:hover:text-slate-700 transition-colors"><T tKey="workshop.title" /></Link>
            <span>/</span>
            <span>{cat.title.en}</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 light:bg-slate-100 text-3xl">
              {cat.icon}
            </div>
            <h1 className="text-3xl font-bold text-white light:text-slate-900">{cat.title.en}</h1>
            <p className="mt-2 text-base text-white/60 light:text-slate-500">{cat.description.en}</p>
          </div>

          {/* Lessons list */}
          {lessons.length === 0 ? (
            <div className="rounded-2xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 px-6 py-10 text-center">
              <p className="text-white/40 light:text-slate-400 text-sm"><T tKey="workshop.comingSoon" /></p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.slug}
                  href={`/workshop/${category}/${lesson.slug}`}
                  className="group flex items-start gap-4 rounded-2xl border border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white px-5 py-4 transition-all hover:border-white/15 light:hover:border-slate-300 hover:bg-white/5 light:hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${LEVEL_BADGE[lesson.level]}`}>
                        {lesson.level}
                      </span>
                      {lesson.isPremium && (
                        <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                          <T tKey="workshop.premiumBadge" />
                        </span>
                      )}
                      <span className="text-xs text-white/30 light:text-slate-400">
                        {lesson.readMinutes} <T tKey="workshop.readMin" />
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold text-white light:text-slate-900 group-hover:text-neon-blue transition-colors">
                      {lesson.title.en}
                    </h2>
                    <p className="mt-0.5 text-xs text-white/50 light:text-slate-500 line-clamp-2">
                      {lesson.subtitle.en}
                    </p>
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-white/20 light:text-slate-300 group-hover:text-neon-blue transition-all group-hover:translate-x-0.5 mt-1"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8">
            <Link
              href="/workshop"
              className="inline-flex items-center gap-1.5 text-sm text-white/40 light:text-slate-400 hover:text-white light:hover:text-slate-700 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 8H3M7 4L3 8l4 4" />
              </svg>
              <T tKey="workshop.backToWorkshop" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
