import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ category: string; lesson: string }>;
}

const CATEGORY_MAP: Record<string, string> = {
  fundamentals: "beginner",
  banking: "banking",
  markets: "capital-markets",
  international: "international-trade",
  advanced: "advanced",
};

export default async function WorkshopLessonRedirect({ params }: Props) {
  const { category, lesson } = await params;
  const mapped = CATEGORY_MAP[category] ?? category;
  permanentRedirect(`/academy/${mapped}/${lesson}`);
}
