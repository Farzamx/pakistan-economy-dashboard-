import type { CategoryMeta, Lesson } from "@/lib/workshop/types";
import { inflationLesson } from "@/lib/workshop/lessons/fundamentals/inflation";
import { gdpLesson } from "@/lib/workshop/lessons/fundamentals/gdp";
import { policyRateLesson } from "@/lib/workshop/lessons/banking/policyRate";

export const ALL_LESSONS: Lesson[] = [
  inflationLesson,
  gdpLesson,
  policyRateLesson,
];

export const CATEGORY_META: CategoryMeta[] = [
  {
    slug: "fundamentals",
    title: {
      en: "Fundamentals",
      ur: "بنیادی اصول",
      rm: "Bunyaadi Usool",
    },
    description: {
      en: "Core economic concepts every Pakistani should understand — from inflation to GDP",
      ur: "ہر پاکستانی کے لیے بنیادی اقتصادی تصورات — افراطِ زر سے GDP تک",
      rm: "Har Pakistani ke liye bunyaadi iqtisaadi tasawwuraat — inflation se GDP tak",
    },
    icon: "📊",
    color: "blue",
    lessonCount: 2,
  },
  {
    slug: "banking",
    title: {
      en: "Banking & Monetary Policy",
      ur: "بینکاری اور مالیاتی پالیسی",
      rm: "Banking aur Maaliyaati Policy",
    },
    description: {
      en: "How the SBP controls money, sets interest rates, and manages Pakistan's financial system",
      ur: "SBP کیسے پیسے کنٹرول کرتا ہے، شرح سود مقرر کرتا ہے، اور پاکستان کے مالیاتی نظام کا انتظام کرتا ہے",
      rm: "SBP kaise paise control karta hai, share sood muqarrar karta hai, aur Pakistan ke maaliyaati nizaam ka intizaam karta hai",
    },
    icon: "🏦",
    color: "purple",
    lessonCount: 1,
  },
  {
    slug: "markets",
    title: {
      en: "Capital Markets",
      ur: "سرمایہ منڈیاں",
      rm: "Sarmaya Mandiyan",
    },
    description: {
      en: "KSE-100, T-Bills, PIBs, and how Pakistan's financial markets work",
      ur: "KSE-100، T-Bills، PIBs، اور پاکستان کی مالیاتی منڈیاں کیسے کام کرتی ہیں",
      rm: "KSE-100, T-Bills, PIBs, aur Pakistan ki maaliyaati mandiyan kaise kaam karti hain",
    },
    icon: "📈",
    color: "emerald",
    lessonCount: 0,
  },
  {
    slug: "international",
    title: {
      en: "International Economics",
      ur: "بین الاقوامی معاشیات",
      rm: "Bayn-ul-Aqwami Maashiyaat",
    },
    description: {
      en: "Exchange rates, trade, remittances, and Pakistan's position in the global economy",
      ur: "شرح تبادلہ، تجارت، ترسیلاتِ زر، اور عالمی معیشت میں پاکستان کی پوزیشن",
      rm: "Share tabadlah, tijaarat, tarsilaat-e-zar, aur aalami maashiyat mein Pakistan ki position",
    },
    icon: "🌍",
    color: "amber",
    lessonCount: 0,
  },
  {
    slug: "advanced",
    title: {
      en: "Advanced Topics",
      ur: "اعلی موضوعات",
      rm: "Aala Mawzoo'aat",
    },
    description: {
      en: "Fiscal policy, debt dynamics, IMF programs, and structural reform for the serious economist",
      ur: "مالیاتی پالیسی، قرض کی حرکیات، IMF پروگرام، اور سنجیدہ ماہر معاشیات کے لیے ساختی اصلاح",
      rm: "Maali policy, qarz ki harakiyaat, IMF programs, aur sanjeedah maahhir maashiyaat ke liye saakhtaati islaah",
    },
    icon: "🎓",
    color: "rose",
    lessonCount: 0,
  },
];

export function getLessonsByCategory(category: string): Lesson[] {
  return ALL_LESSONS.filter((l) => l.category === category);
}

export function getLessonBySlug(slug: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.slug === slug);
}

export function getCategoryMeta(slug: string): CategoryMeta | undefined {
  return CATEGORY_META.find((c) => c.slug === slug);
}
