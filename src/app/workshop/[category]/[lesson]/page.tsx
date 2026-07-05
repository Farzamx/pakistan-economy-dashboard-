import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import LessonView from "@/components/workshop/LessonView";
import {
  ALL_LESSONS,
  CATEGORY_META,
  getLessonsByCategory,
  getLessonBySlug,
} from "@/lib/workshop/registry";
import type { WorkshopCategory } from "@/lib/workshop/types";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

interface Props {
  params: Promise<{ category: string; lesson: string }>;
}

export async function generateStaticParams() {
  return ALL_LESSONS.map((l) => ({ category: l.category, lesson: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lesson: lessonSlug } = await params;
  const lesson = getLessonBySlug(lessonSlug);
  if (!lesson) return {};
  const title = `${lesson.title.en} — Economic Workshop`;
  const description = lesson.subtitle.en;
  const url = `${SITE_URL}/workshop/${lesson.category}/${lesson.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function LessonPage({ params }: Props) {
  const { category, lesson: lessonSlug } = await params;

  if (!CATEGORY_META.find((c) => c.slug === category)) notFound();
  const lesson = getLessonBySlug(lessonSlug);
  if (!lesson || lesson.category !== category) notFound();

  const categoryLessons = getLessonsByCategory(category as WorkshopCategory);
  const idx = categoryLessons.findIndex((l) => l.slug === lessonSlug);

  const prevLesson = idx > 0
    ? { slug: categoryLessons[idx - 1].slug, title: categoryLessons[idx - 1].title.en }
    : undefined;
  const nextLesson = idx < categoryLessons.length - 1
    ? { slug: categoryLessons[idx + 1].slug, title: categoryLessons[idx + 1].title.en }
    : undefined;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <LessonView
          lesson={lesson}
          category={category}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
        />
      </main>
    </div>
  );
}
