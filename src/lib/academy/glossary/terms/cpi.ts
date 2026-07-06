import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const cpiTerm: GlossaryTerm = {
  slug: "cpi",
  term: { en: "Consumer Price Index", ur: "صارف قیمت اشاریہ", rm: "Consumer Price Index" },
  abbreviation: "CPI",
  category: "economic-indicators",
  relatedTermSlugs: ["inflation", "core-inflation", "spi", "wpi"],
  relatedLessonSlugs: [
    { category: "pakistan-economy", slug: "cpi" },
    { category: "beginner", slug: "inflation" },
  ],
  definition: {
    en: "A statistical measure that tracks the change in prices of a fixed basket of goods and services purchased by households over time, used as the primary indicator of consumer inflation.",
    ur: "ایک اعداد و شماری پیمانہ جو وقت کے ساتھ گھرانوں کی طرف سے خریدی گئی اشیاء اور خدمات کی ایک مقررہ ٹوکری کی قیمتوں میں تبدیلی کو ٹریک کرتا ہے، جو صارف افراطِ زر کا بنیادی اشاریہ ہے۔",
    rm: "Ek iqdaamaat paimaana jo waqt ke saath gharanon ki taraf se kharidi gayi cheezein aur khadamaat ki ek muqarrara tokri ki qeematon mein tabdeeli ko track karta hai, jo consumer inflation ka bunyaadi ashaariya hai.",
  },
  beginnerExplanation: {
    en: "Think of the CPI as a shopping basket. The government tracks the prices of everything in the basket — bread, cooking oil, electricity, transport — every month. If the basket costs 10% more than it did a year ago, inflation is 10%. Pakistan's basket has a heavy weight on food (~35%) because most Pakistani families spend a large share of their income on food.",
    ur: "CPI کو ایک خریداری کی ٹوکری سمجھیں۔ حکومت ہر ماہ ٹوکری میں موجود ہر چیز کی قیمتیں ٹریک کرتی ہے — روٹی، کھانے کا تیل، بجلی، نقل و حمل۔ اگر ٹوکری ایک سال پہلے کے مقابلے میں 10٪ مہنگی ہو جائے، تو افراطِ زر 10٪ ہے۔",
    rm: "CPI ko ek kharidaari ki tokri samjhein. Hukoomat har maah tokri mein maujood har cheez ki qeematen track karti hai — roti, khaane ka tail, bijli, naql-o-hamal. Agar tokri ek saal pehle ke muqablay mein 10% mahanghi ho jaaye, to inflation 10% hai.",
  },
  pakistanContext: {
    en: "Pakistan's CPI is published monthly by the Pakistan Bureau of Statistics (PBS). The basket weights come from the 2015–16 Household Integrated Economic Survey. Food carries ~34.6% weight — far higher than in the US (~14%) — which is why Pakistan's CPI is so sensitive to wheat, sugar, and cooking oil prices. The SBP targets 5–7% CPI over the medium term. Pakistan's CPI peaked at 38% in May 2023 and fell back to single digits by late 2024.",
    ur: "پاکستان کی CPI پاکستان بیورو آف اسٹیٹسٹکس (PBS) ماہانہ شائع کرتا ہے۔ باسکٹ کے وزن 2015–16 HIES سے آتے ہیں۔ خوراک ~34.6٪ وزن رکھتی ہے۔ SBP درمیانی مدت میں 5–7٪ CPI کو ہدف مانتا ہے۔ پاکستان کی CPI مئی 2023 میں 38٪ پر پہنچی۔",
    rm: "Pakistan ki CPI PBS maahana shaai'a karta hai. Basket ke wazan 2015–16 HIES se aate hain. Khaana ~34.6% wazan rakhta hai. SBP darmiyanī muddat mein 5–7% CPI ko hadaf maanta hai. Pakistan ki CPI May 2023 mein 38% par pahunchi.",
  },
  example: {
    en: "If the PBS CPI for April 2024 is reported as 17.3% YoY, it means the basket of goods that cost PKR 1,000 in April 2023 now costs PKR 1,173 in April 2024 — a 17.3% increase.",
    ur: "اگر اپریل 2024 کے لیے PBS CPI 17.3٪ سالانہ رپورٹ کی جائے، تو اس کا مطلب ہے کہ اشیاء کی وہ ٹوکری جو اپریل 2023 میں 1,000 روپے میں آتی تھی، اب اپریل 2024 میں 1,173 روپے میں آتی ہے۔",
    rm: "Agar April 2024 ke liye PBS CPI 17.3% saalana report ki jaaye, to is ka matlab hai ke cheezein ki woh tokri jo April 2023 mein 1,000 rupay mein aati thi, ab April 2024 mein 1,173 rupay mein aati hai.",
  },
  faq: [
    {
      question: { en: "What is the difference between CPI and WPI?", ur: "CPI اور WPI میں کیا فرق ہے؟", rm: "CPI aur WPI mein kya farq hai?" },
      answer: {
        en: "CPI measures prices paid by consumers (retail level). WPI (Wholesale Price Index) measures prices at the wholesale/producer stage — before goods reach retail. WPI often leads CPI: rising wholesale prices eventually push up consumer prices. Pakistan publishes both.",
        ur: "CPI صارفین کی ادا کردہ قیمتیں ماپتا ہے (خردہ سطح)۔ WPI (ہول سیل قیمت اشاریہ) ہول سیل/پروڈیوسر مرحلے پر قیمتیں ماپتا ہے — اشیاء خردہ تک پہنچنے سے پہلے۔",
        rm: "CPI consumers ki ada karda qeematen mapata hai (khurda satah). WPI (Wholesale Price Index) wholesale/producer marhalay par qeematen mapata hai — cheezein khurda tak pahunchne se pehle.",
      },
    },
  ],
};
