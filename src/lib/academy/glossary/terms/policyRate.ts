import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const policyRateTerm: GlossaryTerm = {
  slug: "policy-rate",
  term: { en: "Policy Rate", ur: "پالیسی ریٹ", rm: "Policy Rate" },
  category: "monetary-policy",
  relatedTermSlugs: ["kibor", "real-interest-rate", "monetary-policy", "inflation", "sbp"],
  relatedLessonSlugs: [{ category: "banking", slug: "policy-rate" }],
  definition: {
    en: "The benchmark interest rate set by a central bank that determines the cost at which commercial banks can borrow funds overnight, serving as the primary instrument of monetary policy.",
    ur: "مرکزی بینک کی مقررہ بینچ مارک سود کی شرح جو طے کرتی ہے کہ کمرشل بینک راتوں رات فنڈ قرض لینے کی کتنی لاگت ادا کرتے ہیں — مالیاتی پالیسی کا بنیادی آلہ۔",
    rm: "Markazi bank ki muqarrara benchmark sood ki share jo tay karti hai ke commercial bank raaton raat fund qarz lene ki kitni lagat ada karte hain — maaliyaati policy ka bunyaadi aala.",
  },
  beginnerExplanation: {
    en: "The policy rate is the SBP's main lever for controlling the economy. When the SBP raises the policy rate, it becomes more expensive for banks to borrow — so they charge more for loans to businesses and consumers. This slows spending, which brings inflation down. When the SBP cuts the rate, borrowing becomes cheaper, stimulating the economy.",
    ur: "پالیسی ریٹ معیشت کو کنٹرول کرنے کے لیے SBP کا بنیادی آلہ ہے۔ جب SBP پالیسی ریٹ بڑھاتا ہے، تو بینکوں کے لیے قرض لینا مہنگا ہو جاتا ہے — لہذا وہ کاروبار اور صارفین کو قرض دینے کے لیے زیادہ چارج کرتے ہیں۔ اس سے خرچ کم ہوتا ہے، جو افراطِ زر کو نیچے لاتا ہے۔",
    rm: "Policy rate maashiyat ko control karne ke liye SBP ka bunyaadi aala hai. Jab SBP policy rate badhata hai, to bankoon ke liye qarz lena mahnga ho jaata hai — is liye woh karobaar aur consumers ko qarz dene ke liye zyada charge karte hain.",
  },
  pakistanContext: {
    en: "The SBP's Monetary Policy Committee (MPC) reviews the policy rate every 8 weeks. Pakistan's policy rate cycle from 2022–2024 was one of the most dramatic in SBP history: from 7% in early 2022 to a peak of 22% in June 2023 (to combat 38% CPI inflation), then cut back to the low teens by end-2024 as inflation fell. The SBP operates a corridor system: the policy rate sits between the SBP's overnight lending rate (ceiling) and overnight deposit rate (floor).",
    ur: "SBP کی مالیاتی پالیسی کمیٹی (MPC) ہر 8 ہفتوں میں پالیسی ریٹ کا جائزہ لیتی ہے۔ پاکستان کا 2022–2024 شرح چکر SBP کی تاریخ میں سب سے ڈرامائی میں سے ایک تھا: 2022 کے اوائل میں 7٪ سے جون 2023 میں 22٪ کی بلند ترین سطح تک۔",
    rm: "SBP ki Maaliyaati Policy Committee (MPC) har 8 hafte mein policy rate ka jaiza leti hai. Pakistan ka 2022–2024 share chakkar SBP ki taareekh mein sab se dramatic mein se ek tha: 2022 ke awaail mein 7% se June 2023 mein 22% ki buland tareen satah tak.",
  },
  example: {
    en: "If the SBP sets the policy rate at 15%, a commercial bank might set its lending rate at 17–18% (policy rate + spread for credit risk and profit). A business borrowing at 18% for a year on PKR 1 million pays PKR 180,000 in interest — money that could otherwise have been invested.",
    ur: "اگر SBP پالیسی ریٹ 15٪ مقرر کرے، تو ایک کمرشل بینک اپنی قرض کی شرح 17–18٪ مقرر کر سکتا ہے۔ 10 لاکھ روپے پر 18٪ پر ایک سال قرض لینے والا کاروبار 1.80 لاکھ روپے سود ادا کرتا ہے۔",
    rm: "Agar SBP policy rate 15% muqarrar kare, to ek commercial bank apni qarz ki share 17–18% muqarrar kar sakta hai. 10 lakh rupay par 18% par ek saal qarz lene wala karobaar 1.80 lakh rupay sood ada karta hai.",
  },
  faq: [
    {
      question: { en: "What is the 'real' policy rate?", ur: "حقیقی پالیسی ریٹ کیا ہے؟", rm: "Haqeeqi policy rate kya hai?" },
      answer: {
        en: "The real policy rate = nominal policy rate − inflation. It shows what the policy rate actually means in purchasing power terms. A 22% nominal rate with 38% inflation gives a real rate of −16% — meaning monetary policy was still accommodative despite the high nominal rate. Central banks try to keep the real rate positive to genuinely tighten financial conditions.",
        ur: "حقیقی پالیسی ریٹ = برائے نام پالیسی ریٹ − افراطِ زر۔ 22٪ برائے نام ریٹ اور 38٪ افراطِ زر کے ساتھ حقیقی ریٹ −16٪ ہے — یعنی مالیاتی پالیسی اب بھی سہولت بخش تھی۔",
        rm: "Haqeeqi policy rate = baraey naam policy rate − inflation. 22% baraey naam rate aur 38% inflation ke saath haqeeqi rate −16% hai — yani maaliyaati policy ab bhi sahoolat bakhsh thi.",
      },
    },
  ],
};
