import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLessonByCategoryAndSlug, CATEGORY_META } from "@/lib/academy/registry";
import { ALL_LESSONS } from "@/lib/academy/registry";
import type { AcademyCategory } from "@/lib/academy/types";
import LessonView from "@/components/academy/LessonView";

interface Props {
  params: Promise<{ category: string; lesson: string }>;
}

export async function generateStaticParams() {
  return ALL_LESSONS.map((l) => ({
    category: l.category,
    lesson: l.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, lesson: lessonSlug } = await params;
  const lesson = getLessonByCategoryAndSlug(category as AcademyCategory, lessonSlug);
  if (!lesson) return {};

  const catMeta = CATEGORY_META.find((c) => c.slug === lesson.category);

  return {
    title: `${lesson.title.en} | Economic Academy`,
    description: lesson.content.overview.en,
    openGraph: {
      title: lesson.title.en,
      description: lesson.subtitle.en,
    },
    other: {
      "application/ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: lesson.title.en,
        description: lesson.content.overview.en,
        author: { "@type": "Organization", name: "Pakistan Economy Dashboard" },
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Academy", item: "/academy" },
            {
              "@type": "ListItem",
              position: 2,
              name: catMeta?.title.en ?? category,
              item: `/academy/${category}`,
            },
            { "@type": "ListItem", position: 3, name: lesson.title.en },
          ],
        },
        ...(lesson.faq.length > 0 && {
          mainEntity: lesson.faq.map((item) => ({
            "@type": "Question",
            name: item.question.en,
            acceptedAnswer: { "@type": "Answer", text: item.answer.en },
          })),
        }),
      }),
    },
  };
}

export default async function LessonPage({ params }: Props) {
  const { category, lesson: lessonSlug } = await params;
  const lesson = getLessonByCategoryAndSlug(category as AcademyCategory, lessonSlug);
  if (!lesson) notFound();

  return (
    <main className="px-4 sm:px-6">
      <LessonView lesson={lesson} />
    </main>
  );
}
