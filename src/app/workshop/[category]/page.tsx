import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ category: string }>;
}

// Maps old workshop category slugs to new academy slugs
const CATEGORY_MAP: Record<string, string> = {
  fundamentals: "beginner",
  banking: "banking",
  markets: "capital-markets",
  international: "international-trade",
  advanced: "advanced",
};

export default async function WorkshopCategoryRedirect({ params }: Props) {
  const { category } = await params;
  const mapped = CATEGORY_MAP[category] ?? category;
  permanentRedirect(`/academy/${mapped}`);
}
