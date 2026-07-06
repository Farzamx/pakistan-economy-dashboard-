import type { TrilingualString, AcademyCategory } from "@/lib/academy/types";

export interface GlossaryTerm {
  slug: string;
  term: TrilingualString;
  abbreviation?: string;
  category: AcademyCategory;
  relatedTermSlugs: string[];
  relatedLessonSlugs: Array<{ category: AcademyCategory; slug: string }>;
  definition: TrilingualString;
  beginnerExplanation: TrilingualString;
  pakistanContext: TrilingualString;
  example: TrilingualString;
  faq: Array<{ question: TrilingualString; answer: TrilingualString }>;
}
