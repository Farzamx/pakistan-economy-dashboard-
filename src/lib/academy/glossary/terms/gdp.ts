import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const gdpTerm: GlossaryTerm = {
  slug: "gdp",
  term: { en: "Gross Domestic Product", ur: "مجموعی ملکی پیداوار", rm: "Majmoo'i Mulki Paidawar" },
  abbreviation: "GDP",
  category: "economic-indicators",
  relatedTermSlugs: ["gdp-growth", "gdp-per-capita", "gnp", "real-gdp", "nominal-gdp"],
  relatedLessonSlugs: [{ category: "beginner", slug: "gdp" }],
  definition: {
    en: "The total monetary value of all finished goods and services produced within a country's borders during a specific time period, typically a year.",
    ur: "کسی مخصوص وقت میں، عام طور پر ایک سال میں، کسی ملک کی حدود کے اندر تیار کردہ تمام حتمی اشیاء اور خدمات کی کل مالی قدر۔",
    rm: "Kisi makhsoos waqt mein, aam tor par ek saal mein, kisi mulk ki hudood ke andar tayyar karda tamam hattmi cheezein aur khadamaat ki kul maali qemat.",
  },
  beginnerExplanation: {
    en: "GDP is the report card for an entire economy. Imagine adding up the rupee value of every car made, every haircut given, every software line written, every bag of cement sold — across all of Pakistan in one year. That total is GDP. When GDP grows, the economy is producing more; when it shrinks, the economy is contracting.",
    ur: "GDP پوری معیشت کا رپورٹ کارڈ ہے۔ تصور کریں کہ پاکستان میں ایک سال میں بنائی گئی ہر گاڑی، دیا گیا ہر بال کاٹنے کا کام، لکھا گیا ہر سافٹ ویئر کوڈ، بیچا گیا ہر سیمنٹ بیگ — سب کی روپیہ قدر جمع کریں۔ وہ کل GDP ہے۔",
    rm: "GDP poori maashiyat ka report card hai. Tasawwur karein ke Pakistan mein ek saal mein banaai gayi har gaadi, diya gaya har baal katne ka kaam, likha gaya har software code, becha gaya har cement bag — sab ki rupiya qemat jama karein. Woh kul GDP hai.",
  },
  pakistanContext: {
    en: "Pakistan's GDP in FY2024 was approximately USD 340–350 billion (nominal), making it the ~45th largest economy by nominal GDP but the 5th most populous country. GDP growth averaged ~4% during the 2010s. FY2023 saw a rare contraction (~−0.2%) due to floods, austerity, and import restrictions. Pakistan's GDP is heavily services-driven (~60%) with agriculture (~20%) remaining highly weather-sensitive.",
    ur: "مالی سال 2024 میں پاکستان کی GDP تقریباً 340–350 بلین USD (برائے نام) تھی۔ GDP نمو 2010ء کی دہائی میں اوسطاً ~4٪ رہی۔ مالی سال 2023 میں نادر سکڑاؤ (~−0.2٪) دیکھا گیا۔",
    rm: "Maali Saal 2024 mein Pakistan ki GDP taqreeban 340–350 billion USD (baraey naam) thi. GDP numa 2010 ki dahai mein ausat ~4% rahi. Maali Saal 2023 mein nadir sikurraaon (~−0.2%) dekha gaya.",
  },
  example: {
    en: "If Pakistan's real GDP grew by 3% in FY2025, it means the total value of goods and services produced (adjusted for inflation) was 3% more than in FY2024. At a population growth rate of ~2%, per-capita real GDP would have grown by roughly 1% — meaning living standards improved slightly.",
    ur: "اگر مالی سال 2025 میں پاکستان کی حقیقی GDP 3٪ بڑھی، تو اس کا مطلب ہے کہ پیدا کردہ اشیاء اور خدمات کی کل قدر (افراطِ زر کے لیے ایڈجسٹ) مالی سال 2024 کے مقابلے میں 3٪ زیادہ تھی۔",
    rm: "Agar Maali Saal 2025 mein Pakistan ki haqeeqi GDP 3% barhi, to is ka matlab hai ke paida karda cheezein aur khadamaat ki kul qemat (inflation ke liye adjust) Maali Saal 2024 ke muqablay mein 3% zyada thi.",
  },
  faq: [
    {
      question: { en: "What is the difference between real and nominal GDP?", ur: "حقیقی اور برائے نام GDP میں کیا فرق ہے؟", rm: "Haqeeqi aur baraey naam GDP mein kya farq hai?" },
      answer: {
        en: "Nominal GDP is measured in current prices — it rises when both output and prices increase. Real GDP is adjusted for inflation using a base year, showing only the actual change in output volume. For growth comparisons, always use real GDP. Pakistan's nominal GDP can look much larger than previous years simply because prices rose dramatically, even if actual production was flat.",
        ur: "برائے نام GDP موجودہ قیمتوں میں ماپی جاتی ہے۔ حقیقی GDP ایک بنیادی سال استعمال کرکے افراطِ زر کے لیے ایڈجسٹ کی جاتی ہے، صرف پیداوار کی حجم میں تبدیلی ظاہر کرتی ہے۔",
        rm: "Baraey naam GDP maujuda qeematon mein maapi jaati hai. Haqeeqi GDP ek bunyaadi saal istemal karke inflation ke liye adjust ki jaati hai, sirf paidawar ki hajam mein tabdeeli zahir karti hai.",
      },
    },
  ],
};
