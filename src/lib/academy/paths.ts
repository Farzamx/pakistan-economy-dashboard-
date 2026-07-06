import type { LearningPath } from "@/lib/academy/types";

export const LEARNING_PATHS: LearningPath[] = [
  {
    slug: "economics-basics",
    title: {
      en: "Economics Basics",
      ur: "معاشیات کی بنیادیں",
      rm: "Maashiyaat ki Bunyaadein",
    },
    description: {
      en: "A complete beginner's journey through the core ideas that drive every economy — from supply and demand to GDP, inflation, interest rates, and how central banks work. No background required.",
      ur: "ہر معیشت کو چلانے والے بنیادی خیالات کے ذریعے ابتدائی افراد کا مکمل سفر — طلب و رسد سے GDP، افراطِ زر، شرح سود، اور مرکزی بینک کیسے کام کرتے ہیں تک۔ کوئی پیشگی پس منظر ضروری نہیں۔",
      rm: "Har maashiyat ko chalane wale bunyaadi khayalaat ke zariye ibtidaai afraad ka mukammal safar — talab-o-rasad se GDP, inflation, share sood, aur markazi bank kaise kaam karte hain tak. Koi peshgi pas manzar zaroori nahi.",
    },
    level: "beginner",
    estimatedHours: 5,
    lessonRefs: [
      { category: "beginner", slug: "inflation" },
      { category: "beginner", slug: "gdp" },
      { category: "banking", slug: "policy-rate" },
    ],
  },
  {
    slug: "pakistan-economy-deep-dive",
    title: {
      en: "Pakistan Economy Deep Dive",
      ur: "پاکستانی معیشت کا گہرا جائزہ",
      rm: "Pakistani Maashiyaat ka Gehra Jaiza",
    },
    description: {
      en: "Understand Pakistan's economy from the ground up — CPI and inflation dynamics, the SBP's role, how PBS measures economic activity, and what drives the rupee. Built for Pakistanis who want to go beyond headlines.",
      ur: "پاکستان کی معیشت کو بنیادوں سے سمجھیں — CPI اور افراطِ زر کی حرکیات، SBP کا کردار، PBS کیسے معاشی سرگرمی ماپتا ہے، اور روپے کو کیا چلاتا ہے۔ ان پاکستانیوں کے لیے جو عنوانات سے آگے جانا چاہتے ہیں۔",
      rm: "Pakistan ki maashiyat ko bunyaadon se samjhein — CPI aur inflation ki harakiyaat, SBP ka kirdaar, PBS kaise maashi sargarmi mapata hai, aur rupay ko kya chalata hai. Un Pakistaniyon ke liye jo unwaanaat se aagey jaana chahte hain.",
    },
    level: "intermediate",
    estimatedHours: 6,
    lessonRefs: [
      { category: "pakistan-economy", slug: "cpi" },
      { category: "beginner", slug: "inflation" },
      { category: "banking", slug: "policy-rate" },
    ],
  },
  {
    slug: "investor-fundamentals",
    title: {
      en: "Investor Fundamentals",
      ur: "سرمایہ کار کی بنیادیں",
      rm: "Sarmayakaar ki Bunyaadein",
    },
    description: {
      en: "Everything a Pakistani investor needs to know before putting money to work — understanding returns, reading economic signals, interpreting monetary policy, and avoiding behavioral traps.",
      ur: "وہ سب کچھ جو ایک پاکستانی سرمایہ کار کو پیسہ لگانے سے پہلے جاننا چاہیے — منافع کو سمجھنا، معاشی اشاروں کو پڑھنا، مالیاتی پالیسی کی تشریح، اور رویے کے جالوں سے بچنا۔",
      rm: "Woh sab kuch jo ek Pakistani sarmayakaar ko paisa lagaane se pehle jaanna chahiye — munafa ko samajhna, maashi ashariyoon ko parrhna, maaliyaati policy ki tashreeh, aur rawayye ke jaalon se bachna.",
    },
    level: "intermediate",
    estimatedHours: 7,
    lessonRefs: [
      { category: "beginner", slug: "gdp" },
      { category: "beginner", slug: "inflation" },
      { category: "banking", slug: "policy-rate" },
      { category: "pakistan-economy", slug: "cpi" },
    ],
  },
];

export function getPathBySlug(slug: string): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.slug === slug);
}
