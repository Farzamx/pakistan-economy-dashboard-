import type { Language } from "@/lib/i18n/types";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export type AcademyCategory =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "pakistan-economy"
  | "banking"
  | "inflation"
  | "monetary-policy"
  | "fiscal-policy"
  | "government-budget"
  | "taxation"
  | "international-trade"
  | "foreign-exchange"
  | "capital-markets"
  | "stock-market"
  | "bonds"
  | "mutual-funds"
  | "derivatives"
  | "islamic-finance"
  | "economic-indicators"
  | "data-interpretation"
  | "financial-statements"
  | "investing-fundamentals"
  | "risk-management"
  | "behavioral-finance"
  | "personal-finance"
  | "global-economy"
  | "imf-world-bank"
  | "sbp"
  | "pbs"
  | "psx";

export interface TrilingualString {
  en: string;
  ur: string;
  rm: string;
}

export interface FaqItem {
  question: TrilingualString;
  answer: TrilingualString;
}

export interface QuizQuestion {
  question: TrilingualString;
  options: [TrilingualString, TrilingualString, TrilingualString, TrilingualString];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: TrilingualString;
}

export interface LessonContent {
  overview: TrilingualString;
  whyItMatters: TrilingualString;
  explanation: TrilingualString;
  misconceptions: TrilingualString;
  pakistanExample: TrilingualString;
  realWorld: TrilingualString;
  summary: TrilingualString;
}

export interface Lesson {
  slug: string;
  category: AcademyCategory;
  title: TrilingualString;
  subtitle: TrilingualString;
  level: DifficultyLevel;
  readMinutes: number;
  isPremium: boolean;
  relatedIndicatorSlugs: string[];
  relatedLessonSlugs: string[];
  content: LessonContent;
  quiz: QuizQuestion[];
  faq: FaqItem[];
}

export interface CategoryMeta {
  slug: AcademyCategory;
  title: TrilingualString;
  description: TrilingualString;
  icon: string;
  color: "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan" | "violet" | "orange" | "teal" | "indigo";
}

export interface LearningPath {
  slug: string;
  title: TrilingualString;
  description: TrilingualString;
  level: DifficultyLevel;
  estimatedHours: number;
  lessonRefs: Array<{ category: AcademyCategory; slug: string }>;
}

export type { Language };
