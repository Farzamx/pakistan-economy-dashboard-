import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const inflationTerm: GlossaryTerm = {
  slug: "inflation",
  term: { en: "Inflation", ur: "افراطِ زر", rm: "Inflation" },
  category: "economic-indicators",
  relatedTermSlugs: ["cpi", "core-inflation", "deflation", "stagflation", "hyperinflation"],
  relatedLessonSlugs: [
    { category: "beginner", slug: "inflation" },
    { category: "pakistan-economy", slug: "cpi" },
    { category: "banking", slug: "policy-rate" },
  ],
  definition: {
    en: "The rate at which the general level of prices for goods and services rises over time, causing the purchasing power of money to fall.",
    ur: "وہ شرح جس پر اشیاء اور خدمات کی قیمتوں کی عمومی سطح وقت کے ساتھ بڑھتی ہے، جس سے پیسے کی خریداری قوت کم ہوتی ہے۔",
    rm: "Woh share jis par cheezein aur khadamaat ki qeematon ki umoomi satah waqt ke saath barhti hai, jis se paise ki khareedari quwwat kam hoti hai.",
  },
  beginnerExplanation: {
    en: "Inflation means your money buys less over time. If a roti cost Rs 10 last year and Rs 12 today, that specific item inflated by 20%. When this happens across most goods and services simultaneously, it's called inflation. A little inflation (2–4%) is considered healthy in most economies. Very high inflation (above 20–30%) is damaging — it erodes savings and makes planning impossible.",
    ur: "افراطِ زر کا مطلب ہے کہ آپ کے پیسے وقت کے ساتھ کم خریدتے ہیں۔ اگر پچھلے سال روٹی 10 روپے میں ملتی تھی اور آج 12 روپے میں، تو اس مخصوص چیز میں 20٪ اضافہ ہوا۔ تھوڑا افراطِ زر (2–4٪) صحت مند ہے۔ بہت زیادہ افراطِ زر (20–30٪ سے زیادہ) نقصان دہ ہے۔",
    rm: "Inflation ka matlab hai ke aapke paise waqt ke saath kam khareedtey hain. Agar pichle saal roti 10 rupay mein milti thi aur aaj 12 rupay mein, to is makhsoos cheez mein 20% izaafa hua. Thora inflation (2–4%) sehat mand hai. Bahut zyada inflation (20–30% se zyada) nuqsaan deh hai.",
  },
  pakistanContext: {
    en: "Pakistan measures inflation through the CPI (monthly, from PBS) and the SPI (weekly, 51 food items). Pakistan experienced extreme inflation in 2022–2023: CPI hit 38.0% in May 2023 — the highest since the 1970s — driven by energy price hikes under the IMF program, rupee depreciation, and 2022 flood damage to crops. The SBP raised its policy rate to 22% to combat this. By late 2024, CPI fell back to single digits.",
    ur: "پاکستان CPI (ماہانہ، PBS سے) اور SPI (ہفتہ وار، 51 خوراک اشیاء) سے افراطِ زر ماپتا ہے۔ پاکستان نے 2022–2023 میں انتہائی افراطِ زر کا تجربہ کیا: CPI مئی 2023 میں 38.0٪ پر پہنچی — 1970ء کی دہائی کے بعد سب سے زیادہ۔",
    rm: "Pakistan CPI (maahana, PBS se) aur SPI (haftawar, 51 khaana cheezein) se inflation mapata hai. Pakistan ne 2022–2023 mein intehai inflation ka tajruba kiya: CPI May 2023 mein 38.0% par pahunchi — 1970 ki dahai ke baad sab se zyada.",
  },
  example: {
    en: "In FY2023, Pakistan's annual CPI averaged around 29%, meaning a basket of goods that cost PKR 100 at the start of FY2022 cost PKR 129 by the end of FY2023 on average.",
    ur: "مالی سال 2023 میں، پاکستان کی سالانہ CPI اوسطاً تقریباً 29٪ رہی، یعنی اشیاء کی وہ ٹوکری جو مالی سال 2022 کے آغاز میں 100 روپے میں آتی تھی، مالی سال 2023 کے آخر تک اوسطاً 129 روپے میں آنے لگی۔",
    rm: "Maali Saal 2023 mein, Pakistan ki saalana CPI ausat taqreeban 29% rahi, yani cheezein ki woh tokri jo Maali Saal 2022 ke aaghaz mein 100 rupay mein aati thi, Maali Saal 2023 ke aakhir tak ausat 129 rupay mein aane lagi.",
  },
  faq: [
    {
      question: { en: "Is inflation always bad?", ur: "کیا افراطِ زر ہمیشہ برا ہے؟", rm: "Kya inflation hamesha bura hai?" },
      answer: {
        en: "No. Moderate inflation (2–5%) is generally healthy — it encourages spending rather than hoarding, gives central banks room to cut rates during recessions, and prevents the deflationary spirals seen in Japan's 'lost decades.' The problem is *high* inflation (above 10–15%), which erodes savings, creates uncertainty, and falls hardest on the poorest.",
        ur: "نہیں۔ معتدل افراطِ زر (2–5٪) عموماً صحت مند ہے — یہ ذخیرہ اندوزی کی بجائے خرچ کی حوصلہ افزائی کرتا ہے۔ مسئلہ *زیادہ* افراطِ زر (10–15٪ سے زیادہ) ہے، جو بچت کو ختم کرتا ہے۔",
        rm: "Nahi. Mutadil inflation (2–5%) aamtaur par sehat mand hai — yeh zakheera andozi ki bajaay kharch ki hosla afzaai karta hai. Masla *zyada* inflation (10–15% se zyada) hai, jo bachat ko khatam karta hai.",
      },
    },
    {
      question: { en: "What causes high inflation in Pakistan specifically?", ur: "پاکستان میں خاص طور پر زیادہ افراطِ زر کس وجہ سے ہوتا ہے؟", rm: "Pakistan mein khaas tor par zyada inflation kis wajah se hota hai?" },
      answer: {
        en: "Pakistan's inflation is driven by a combination of: (1) energy price adjustments (electricity/gas tariffs often kept artificially low then corrected sharply); (2) rupee depreciation — Pakistan imports energy, food inputs, and raw materials priced in USD; (3) food supply shocks (floods, droughts, crop failures); (4) historically, fiscal deficit monetisation — the government borrowing from the SBP, which creates money. The IMF's 2022 program targeted all four.",
        ur: "پاکستان کا افراطِ زر ان عوامل کے مجموعے سے چلتا ہے: (1) توانائی کی قیمتوں میں ایڈجسٹمنٹ؛ (2) روپے کی قدر میں کمی؛ (3) خوراک کی رسد کے جھٹکے؛ (4) تاریخی طور پر، مالی خسارے کی مالیاتی فنانسنگ۔",
        rm: "Pakistan ka inflation in asbab ke majmoo'e se chalta hai: (1) energy ki qeematon mein adjustment; (2) rupay ki qemat mein kami; (3) khaane ki rasad ke jhatke; (4) taarikhi tor par, maali khassaray ki monetary financing.",
      },
    },
  ],
};
