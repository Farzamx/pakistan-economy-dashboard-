import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const coreInflationTerm: GlossaryTerm = {
  slug: "core-inflation",
  term: { en: "Core Inflation", ur: "بنیادی افراطِ زر", rm: "Bunyaadi Inflation" },
  category: "economic-indicators",
  relatedTermSlugs: ["cpi", "inflation", "nfne", "spi"],
  relatedLessonSlugs: [
    { category: "pakistan-economy", slug: "cpi" },
    { category: "beginner", slug: "inflation" },
  ],
  definition: {
    en: "A measure of inflation that excludes volatile food and energy prices to reveal the underlying trend in price changes driven by demand, rather than temporary supply disruptions.",
    ur: "افراطِ زر کا ایک پیمانہ جو متغیر خوراک اور توانائی کی قیمتوں کو خارج کرتا ہے تاکہ طلب سے چلنے والی قیمتوں کی تبدیلیوں کا بنیادی رجحان ظاہر ہو، نہ کہ عارضی رسد میں خلل کا۔",
    rm: "Inflation ka ek paimaana jo mutaghayyar khaana aur energy ki qeematen kharej karta hai taake talab se chalane wali qeematon ki tabdeeliyon ka bunyaadi rujhaan zahir ho.",
  },
  beginnerExplanation: {
    en: "Regular CPI includes everything — food, fuel, everything. But food and energy prices jump around wildly due to droughts, floods, oil crises, and seasonal patterns that have nothing to do with the general health of the economy. Core inflation strips these out. If core inflation is high, it means inflation is broad-based and driven by strong demand — the central bank needs to act. If headline CPI is high but core is low, it may just be a temporary food supply shock.",
    ur: "عام CPI میں سب کچھ شامل ہے — خوراک، ایندھن، سب کچھ۔ لیکن خوراک اور توانائی کی قیمتیں قحط، سیلاب، تیل کے بحران کی وجہ سے بے ترتیب اچھلتی ہیں۔ بنیادی افراطِ زر انہیں نکال دیتا ہے۔ اگر بنیادی افراطِ زر زیادہ ہے، تو افراطِ زر وسیع ہے اور مضبوط طلب سے چلایا جا رہا ہے — مرکزی بینک کو عمل کرنا ہوگا۔",
    rm: "Aam CPI mein sab kuch shamil hai — khaana, eeندھن, sab kuch. Lekin khaana aur energy ki qeematen qahit, sailaab, tail ke bohran ki wajah se be-tarteeb uchhhalti hain. Bunyaadi inflation inhen nikal deta hai. Agar bunyaadi inflation zyada hai, to inflation wasee' hai aur mazboot talab se chalaayi ja rahi hai — markazi bank ko amal karna hoga.",
  },
  pakistanContext: {
    en: "Pakistan's central bank (SBP) uses 'Non-Food, Non-Energy (NFNE)' CPI as its core inflation measure. During the 2022–2023 crisis, both headline CPI (38%) and core CPI (25%+) were high — signalling that inflation had become broad-based, not just a food/energy shock. This gave the SBP stronger justification for aggressive rate hikes. By contrast, if only headline were high while core stayed low, the SBP might have been more patient.",
    ur: "SBP اپنے بنیادی افراطِ زر کے پیمانے کے طور پر 'غیر خوراک، غیر توانائی (NFNE)' CPI استعمال کرتا ہے۔ 2022–2023 کے بحران میں، عنوانی CPI (38٪) اور بنیادی CPI (25٪+) دونوں زیادہ تھے — اس بات کا اشارہ کرتے ہوئے کہ افراطِ زر وسیع ہو گیا تھا۔",
    rm: "SBP apne bunyaadi inflation ke paimaane ke tor par 'Ghair Khaana, Ghair Energy (NFNE)' CPI istemal karta hai. 2022–2023 ke bohran mein, unwaani CPI (38%) aur bunyaadi CPI (25%+) dono zyada the — is baat ka ishara karte hue ke inflation wasee' ho gaya tha.",
  },
  example: {
    en: "If headline CPI is 25% but NFNE core CPI is 12%, the gap (13pp) is driven largely by food and energy. The SBP might tolerate this and wait for supply conditions to normalise. But if core CPI rises to 20%, the SBP would likely hike rates aggressively because inflation has spread beyond food and energy into services, manufacturing, and wages.",
    ur: "اگر عنوانی CPI 25٪ ہے لیکن NFNE بنیادی CPI 12٪ ہے، تو فرق (13pp) زیادہ تر خوراک اور توانائی سے ہے۔ SBP صبر کر سکتا ہے۔ لیکن اگر بنیادی CPI 20٪ ہو جائے، تو SBP شرح جارحانہ طور پر بڑھائے گا کیونکہ افراطِ زر خوراک اور توانائی سے باہر پھیل گیا ہے۔",
    rm: "Agar unwaani CPI 25% hai lekin NFNE bunyaadi CPI 12% hai, to farq (13pp) zyada tar khaana aur energy se hai. SBP sabr kar sakta hai. Lekin agar bunyaadi CPI 20% ho jaaye, to SBP share jaarchanaana tor par badhaayega kyunke inflation khaana aur energy se baahir phail gaya hai.",
  },
  faq: [
    {
      question: { en: "Does removing food prices from core inflation mean it's not relevant to poor households?", ur: "کیا بنیادی افراطِ زر سے خوراک کی قیمتیں نکالنے کا مطلب یہ ہے کہ یہ غریب گھرانوں سے متعلق نہیں؟", rm: "Kya bunyaadi inflation se khaane ki qeematen nikalane ka matlab yeh hai ke yeh ghareeb gharanon se muta'alliq nahi?" },
      answer: {
        en: "Exactly the opposite concern is valid: core CPI is less relevant to poor households precisely because food is excluded. Poor Pakistani households spend 50–60% of income on food — so food prices matter enormously to their effective inflation rate. Core CPI is a technical monetary policy tool, not a welfare measure. For household welfare analysis, headline CPI (and specifically the food sub-index) is more relevant.",
        ur: "یہ بالکل درست خدشہ ہے: بنیادی CPI غریب گھرانوں کے لیے کم متعلقہ ہے کیونکہ خوراک کو خارج کیا گیا ہے۔ غریب پاکستانی گھرانے آمدنی کا 50–60٪ خوراک پر خرچ کرتے ہیں۔ بنیادی CPI ایک تکنیکی مالیاتی پالیسی ٹول ہے، فلاح و بہبود کا پیمانہ نہیں۔",
        rm: "Yeh bilkul durust khudsha hai: bunyaadi CPI ghareeb gharanon ke liye kam muta'alliq hai kyunke khaana kharej kiya gaya hai. Ghareeb Pakistani gharane aamdani ka 50–60% khaane par kharch karte hain. Bunyaadi CPI ek takniki maaliyaati policy tool hai, falah-o-bahbood ka paimaana nahi.",
      },
    },
  ],
};
