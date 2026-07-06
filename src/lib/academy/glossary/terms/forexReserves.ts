import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const forexReservesTerm: GlossaryTerm = {
  slug: "forex-reserves",
  term: { en: "Foreign Exchange Reserves", ur: "زرمبادلہ کے ذخائر", rm: "Zar-e-Mubadla ke Zakhaaer" },
  category: "foreign-exchange",
  relatedTermSlugs: ["current-account", "pkr", "imf", "bop", "remittances"],
  relatedLessonSlugs: [],
  definition: {
    en: "Foreign currency assets held by a country's central bank, used to support the national currency, meet external obligations, and provide a buffer against economic shocks.",
    ur: "کسی ملک کے مرکزی بینک کے پاس موجود غیر ملکی کرنسی کے اثاثے، جو قومی کرنسی کی حمایت، بیرونی ذمہ داریوں کو پورا کرنے، اور معاشی جھٹکوں کے خلاف بفر فراہم کرنے کے لیے استعمال ہوتے ہیں۔",
    rm: "Kisi mulk ke markazi bank ke paas maujood ghair mulki currency ke asaase, jo qaomi currency ki himaayat, baeruni zimma dariyon ko poora karne, aur maashi jhatkon ke khilaf buffer faraham karne ke liye istemal hote hain.",
  },
  beginnerExplanation: {
    en: "Think of foreign exchange reserves as Pakistan's national savings account held in foreign currencies (mainly USD). When Pakistan needs to buy imports, pay back foreign loans, or defend the rupee in currency markets, it uses these reserves. A common rule of thumb is that reserves should cover at least 3 months of imports. When reserves fall below this, it signals a balance-of-payments stress — Pakistan cannot comfortably pay for its import needs.",
    ur: "زرمبادلہ کے ذخائر کو پاکستان کے قومی بچت اکاؤنٹ کے طور پر سوچیں جو غیر ملکی کرنسیوں میں رکھا گیا ہے (خاص طور پر USD)۔ جب پاکستان کو درآمدات خریدنی ہوں، غیر ملکی قرضے واپس کرنے ہوں، یا کرنسی بازاروں میں روپے کا دفاع کرنا ہو، تو یہ ذخائر استعمال ہوتے ہیں۔",
    rm: "Zar-e-mubadla ke zakhaaer ko Pakistan ke qaomi bachat account ke tor par sochein jo ghair mulki currencies mein rakha gaya hai (khaas tor par USD). Jab Pakistan ko daraamdaat khareedni hon, ghair mulki qarzay wapas karne hon, ya currency baazaron mein rupay ka difa karna ho, to yeh zakhaaer istemal hote hain.",
  },
  pakistanContext: {
    en: "Pakistan's foreign exchange reserves (SBP-held) fell to a critically low USD 2.9 billion in February 2023 — enough to cover barely 3 weeks of imports, triggering an acute BOP crisis. The SBP introduced import restrictions, limiting dollar outflows, to preserve reserves. Recovery came through IMF tranches, bilateral rollovers (Saudi Arabia, UAE, China), and improved remittances. By mid-2024, SBP reserves recovered to ~USD 9–10 billion (~2 months import cover). The conventional 3-month cover target remains elusive for Pakistan.",
    ur: "پاکستان کے زرمبادلہ ذخائر (SBP) فروری 2023 میں تنقیدی طور پر کم USD 2.9 بلین تک گر گئے — صرف 3 ہفتوں کی درآمدات کے لیے کافی۔ SBP نے ڈالر کے بہاؤ کو محدود کرنے کے لیے درآمدی پابندیاں متعارف کرائیں۔",
    rm: "Pakistan ke zar-e-mubadla zakhaaer (SBP) February 2023 mein tanqeedi tor par kam USD 2.9 billion tak gir gaye — sirf 3 hafte ki daraamdaat ke liye kaafi. SBP ne dollar ke bahaao ko mahdood karne ke liye daraamdi paabandiyaan mutaarif karaain.",
  },
  example: {
    en: "If Pakistan's SBP reserves stand at USD 8 billion and the country imports goods worth USD 5 billion per month, that's only 1.6 months of import cover — well below the 3-month minimum considered safe by the IMF. In this situation, a sudden spike in oil prices or a drop in remittances could trigger a currency crisis, as happened in 2022–2023.",
    ur: "اگر پاکستان کے SBP ذخائر USD 8 بلین پر ہوں اور ملک فی ماہ USD 5 بلین کی اشیاء درآمد کرے، تو یہ صرف 1.6 ماہ کی درآمد کوریج ہے — IMF کی طرف سے محفوظ سمجھے جانے والے 3 ماہ کے کم از کم سے بہت کم۔",
    rm: "Agar Pakistan ke SBP zakhaaer USD 8 billion par hon aur mulk fi maah USD 5 billion ki cheezein daraamd kare, to yeh sirf 1.6 maah ki daraamd coverage hai — IMF ki taraf se mahfooz samjhe jaane wale 3 maah ke kam az kam se bahut kam.",
  },
  faq: [
    {
      question: { en: "What is the difference between SBP reserves and total country reserves?", ur: "SBP ذخائر اور کل ملکی ذخائر میں کیا فرق ہے؟", rm: "SBP zakhaaer aur kul mulki zakhaaer mein kya farq hai?" },
      answer: {
        en: "Pakistan reports two reserve figures: (1) SBP's own reserves (held by the central bank — these are the 'true' liquid reserves the country can readily deploy); (2) Total liquid reserves = SBP reserves + commercial banks' net foreign assets. The SBP figure is the relevant one for import cover calculations and IMF monitoring. Commercial bank reserves are partially tied up in letters of credit and other obligations.",
        ur: "پاکستان دو ذخائر کے اعداد و شمار رپورٹ کرتا ہے: (1) SBP کے اپنے ذخائر (مرکزی بینک کے پاس محفوظ — یہ 'حقیقی' مائع ذخائر ہیں جو ملک آسانی سے تعینات کر سکتا ہے)؛ (2) کل مائع ذخائر = SBP ذخائر + کمرشل بینکوں کے خالص غیر ملکی اثاثے۔",
        rm: "Pakistan do zakhaaer ke adaad-o-shumaar report karta hai: (1) SBP ke apne zakhaaer (markazi bank ke paas mahfooz — yeh 'haqeeqi' maai'a zakhaaer hain jo mulk aasaani se ta'ainaat kar sakta hai); (2) Kul maai'a zakhaaer = SBP zakhaaer + commercial bankoon ke khaalis ghair mulki asaase.",
      },
    },
  ],
};
