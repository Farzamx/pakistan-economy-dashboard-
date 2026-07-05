import type { Language } from "@/lib/i18n/types";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export type WorkshopCategory =
  | "fundamentals"
  | "banking"
  | "markets"
  | "international"
  | "advanced";

export interface TrilingualString {
  en: string;
  ur: string;
  rm: string;
}

export interface FaqItem {
  question: TrilingualString;
  answer: TrilingualString;
}

export interface LessonSection {
  explanation: TrilingualString;
  pakistanExample: TrilingualString;
  realWorld: TrilingualString;
  whyTraders: TrilingualString;
  whyInvestors: TrilingualString;
}

export interface Lesson {
  slug: string;
  category: WorkshopCategory;
  title: TrilingualString;
  subtitle: TrilingualString;
  level: DifficultyLevel;
  readMinutes: number;
  isPremium: boolean;
  relatedIndicatorSlugs: string[];
  content: LessonSection;
  faq: FaqItem[];
}

export interface CategoryMeta {
  slug: WorkshopCategory;
  title: TrilingualString;
  description: TrilingualString;
  icon: string;
  color: "blue" | "purple" | "emerald" | "amber" | "rose";
  lessonCount: number;
}

export type { Language };
