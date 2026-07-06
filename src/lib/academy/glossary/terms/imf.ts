import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const imfTerm: GlossaryTerm = {
  slug: "imf",
  term: { en: "International Monetary Fund", ur: "بین الاقوامی مالیاتی فنڈ", rm: "Bain-ul-Aqwami Maaliyaati Fund" },
  abbreviation: "IMF",
  category: "imf-world-bank",
  relatedTermSlugs: ["fiscal-deficit", "current-account", "forex-reserves", "policy-rate"],
  relatedLessonSlugs: [],
  definition: {
    en: "An international organisation of 190 member countries, founded in 1944, that promotes global monetary cooperation, financial stability, and provides loans to countries experiencing balance-of-payments crises, conditional on economic reforms.",
    ur: "190 رکن ممالک کی ایک بین الاقوامی تنظیم، جو 1944 میں قائم ہوئی، جو عالمی مالیاتی تعاون اور مالی استحکام کو فروغ دیتی ہے، اور ادائیگیوں کے توازن کے بحران کا سامنا کرنے والے ممالک کو اقتصادی اصلاحات کی شرط پر قرضے فراہم کرتی ہے۔",
    rm: "190 rukn mumalik ki ek bain-ul-aqwami tanzeem, jo 1944 mein qaaim hui, jo aalami maaliyaati ta'aawun aur maali istehkaam ko farogh deti hai, aur adaaigiyon ke tawazun ke bohran ka samna karne wale mumalik ko iqtisaadi islaahaat ki shart par qarzay faraham karti hai.",
  },
  beginnerExplanation: {
    en: "The IMF is like an emergency lender for countries in financial crisis. When Pakistan runs out of dollars and cannot pay its import bills or foreign debt, the IMF steps in with a loan. But the loan comes with conditions — the IMF requires Pakistan to reduce its deficit, raise taxes, cut subsidies, and raise interest rates. These conditions are designed to fix the underlying problems, but they're painful in the short term. Pakistan has been to the IMF more than 20 times since 1950.",
    ur: "IMF ایک ہنگامی قرض دہندہ کی طرح ہے جو مالی بحران میں ممالک کی مدد کرتا ہے۔ جب پاکستان کے پاس ڈالر ختم ہو جائیں اور وہ درآمد کے بل یا غیر ملکی قرض ادا نہ کر سکے، تو IMF قرضے کے ساتھ آتا ہے۔ لیکن قرضہ شرائط کے ساتھ آتا ہے — IMF کا تقاضہ ہے کہ پاکستان خسارہ کم کرے، ٹیکس بڑھائے، سبسڈی کم کرے، اور شرح سود بڑھائے۔",
    rm: "IMF ek hangaami qarz deh'inda ki tarah hai jo maali bohran mein mumalik ki madad karta hai. Jab Pakistan ke paas dollar khatam ho jaayein aur woh daraamad ke bill ya ghair mulki qarz ada na kar sake, to IMF qarzay ke saath aata hai. Lekin qarza shartoon ke saath aata hai.",
  },
  pakistanContext: {
    en: "Pakistan has entered IMF programs more than 20 times, with mixed success. The most recent programs: (1) 2019 Extended Fund Facility (EFF) — disrupted by COVID and political changes; (2) 2022–2023 Stand-By Arrangement (SBA) — critical bailout during the acute BOP crisis, which restored reserves and brought CPI from 38% to single digits; (3) 2024 Extended Fund Facility (EFF) — USD 7 billion over 37 months, Pakistan's largest program. Key IMF conditions typically include: raising the policy rate, reducing energy subsidies, broadening the tax base, and allowing the rupee to float freely.",
    ur: "پاکستان نے 20 سے زائد بار IMF پروگراموں میں داخل ہوا ہے۔ حالیہ پروگرام: (1) 2019 EFF — COVID اور سیاسی تبدیلیوں سے متاثر؛ (2) 2022–2023 SBA — شدید BOP بحران کا اہم بیل آؤٹ؛ (3) 2024 EFF — USD 7 بلین۔ IMF کی کلیدی شرائط میں عام طور پر شامل ہیں: پالیسی ریٹ بڑھانا، توانائی سبسڈی کم کرنا، ٹیکس بیس وسیع کرنا، اور روپے کو آزادانہ بہنے دینا۔",
    rm: "Pakistan ne 20 se zaaid baar IMF programon mein daakhil hua hai. Haaaliya program: (1) 2019 EFF — COVID aur siyaasi tabdeeliyon se mutaassir; (2) 2022–2023 SBA — shadeed BOP bohran ka aham bail out; (3) 2024 EFF — USD 7 billion. IMF ki kaleedi shartoon mein aam tor par shamil hain: policy rate badhaana, energy subsidy kam karna, tax base wasee' karna, aur rupay ko azadaana behne dena.",
  },
  example: {
    en: "In the 2022–2023 SBA program, the IMF required Pakistan to: (1) end SBP financing of the fiscal deficit; (2) raise electricity and gas tariffs to cost-recovery levels; (3) maintain a market-determined exchange rate; (4) broaden the tax net. Pakistan implemented these conditions despite enormous political pressure — and the program succeeded in restoring macroeconomic stability, though at significant social cost.",
    ur: "2022–2023 SBA پروگرام میں، IMF نے پاکستان سے تقاضہ کیا: (1) مالیاتی خسارے کی SBP فنانسنگ ختم کرنا؛ (2) بجلی اور گیس کے نرخ لاگت وصولی کی سطح تک بڑھانا؛ (3) مارکیٹ سے طے شدہ شرح تبادلہ برقرار رکھنا؛ (4) ٹیکس نیٹ وسیع کرنا۔",
    rm: "2022–2023 SBA program mein, IMF ne Pakistan se taqaaza kiya: (1) maali khassaray ki SBP financing khatam karna; (2) bijli aur gas ke narkh lagat wasuli ki satah tak badhaana; (3) market se tay shuda share tabadla barakar rakhna; (4) tax net wasee' karna.",
  },
  faq: [
    {
      question: { en: "Why does Pakistan keep returning to the IMF?", ur: "پاکستان IMF کی طرف بار بار کیوں لوٹتا ہے؟", rm: "Pakistan IMF ki taraf baar baar kyun louta hai?" },
      answer: {
        en: "Pakistan's structural vulnerabilities create a recurring cycle: (1) Low tax revenue prevents fiscal consolidation; (2) Narrow export base means current account swings to deficit when growth picks up; (3) Energy subsidies build up circular debt; (4) When foreign reserves run low, Pakistan needs external financing. IMF programs provide the financing but require painful reforms. Political resistance to sustained reforms means the conditions are often partially implemented, setting up the next crisis. Breaking this cycle requires structural transformation — deeper tax compliance, export diversification, and domestic energy production.",
        ur: "پاکستان کی ڈھانچاگت کمزوریاں ایک بار بار کا چکر بناتی ہیں: (1) کم ٹیکس آمدنی مالی استحکام کو روکتی ہے؛ (2) تنگ برآمدی بنیاد کا مطلب ہے کہ جب نمو بڑھتی ہے تو جاری کھاتہ خسارے میں چلا جاتا ہے؛ (3) توانائی سبسڈی گردشی قرض بناتی ہے؛ (4) ذخائر کم ہونے پر پاکستان کو بیرونی فنانسنگ کی ضرورت ہے۔",
        rm: "Pakistan ki dhaanchaagat kamzoriyaan ek baar baar ka chakkar banati hain: (1) Kam tax aamdani maali istehkaam ko rokti hai; (2) Tang baraaamdi bunyaad ka matlab hai ke jab numa barhti hai to jaari khaata khassaray mein chala jaata hai; (3) Energy subsidy gardishi qarza banati hai; (4) Zakhaaer kam hone par Pakistan ko baeruni financing ki zaroorat hai.",
      },
    },
  ],
};
