import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const currentAccountTerm: GlossaryTerm = {
  slug: "current-account",
  term: { en: "Current Account", ur: "جاری کھاتہ", rm: "Jaari Khaata" },
  category: "international-trade",
  relatedTermSlugs: ["trade-deficit", "remittances", "forex-reserves", "pkr", "bop"],
  relatedLessonSlugs: [],
  definition: {
    en: "A component of the balance of payments that records a country's transactions with the rest of the world in goods, services, income, and current transfers (including remittances).",
    ur: "ادائیگیوں کے توازن کا ایک جزء جو کسی ملک کی اشیاء، خدمات، آمدنی اور موجودہ ترسیلات (بشمول ترسیلاتِ زر) میں دنیا کے بقیہ ممالک کے ساتھ لین دین ریکارڈ کرتا ہے۔",
    rm: "Adaaigiyon ke tawazun ka ek juzw jo kisi mulk ki cheezein, khadamaat, aamdani aur maujuda taraselaat (ba-shumool taraselaat-e-zar) mein duniya ke baqiya mumalik ke saath len den record karta hai.",
  },
  beginnerExplanation: {
    en: "The current account is Pakistan's national 'income statement' with the rest of the world. It adds up: (1) what Pakistan earns from exports minus what it spends on imports (trade balance); (2) earnings from services (like IT exports, tourism receipts); (3) remittances from Pakistanis abroad; (4) other income flows. A current account deficit means Pakistan is spending more on the world than it earns from it — requiring it to borrow foreign exchange or draw down reserves.",
    ur: "جاری کھاتہ باقی دنیا کے ساتھ پاکستان کا قومی 'آمدنی بیان' ہے۔ یہ جمع کرتا ہے: (1) برآمدات کی کمائی منفی درآمدات پر خرچ (تجارتی توازن)؛ (2) خدمات سے کمائی؛ (3) بیرون ملک پاکستانیوں سے ترسیلاتِ زر؛ (4) دیگر آمدنی کے بہاؤ۔",
    rm: "Jaari khaata baqi duniya ke saath Pakistan ka qaomi 'aamdani bayaan' hai. Yeh jama karta hai: (1) baraaamdat ki kamaai manus daraamdaat par kharch (tijaari tawazun); (2) khadamaat se kamaai; (3) baeron mulk Pakistaniyon se taraselaat-e-zar; (4) deegar aamdani ke bahaao.",
  },
  pakistanContext: {
    en: "Pakistan's current account is structurally in deficit — the country imports far more than it exports. The FY2022 current account deficit reached USD 17.5 billion (~4% of GDP), triggering the balance-of-payments crisis. Remittances (~USD 27 billion/year) are Pakistan's largest source of foreign exchange and often the difference between a manageable and an unmanageable current account deficit. A current account surplus occurs only in crises when import restrictions are severe (as in FY2023 when the SBP restricted dollar outflows).",
    ur: "پاکستان کا جاری کھاتہ ڈھانچاگت طور پر خسارے میں ہے — ملک برآمدات سے کہیں زیادہ درآمد کرتا ہے۔ مالی سال 2022 کا جاری کھاتہ خسارہ 17.5 بلین USD (~GDP کا 4٪) تک پہنچا۔ ترسیلاتِ زر (~27 بلین USD/سال) پاکستان کے غیر ملکی زرمبادلہ کا سب سے بڑا ذریعہ ہیں۔",
    rm: "Pakistan ka jaari khaata dhaanchaagat tor par khassaray mein hai — mulk baraaamdat se kahin zyada daraamd karta hai. Maali Saal 2022 ka jaari khaata khassara 17.5 billion USD (~GDP ka 4%) tak pahuncha. Taraselaat-e-zar (~27 billion USD/saal) Pakistan ke ghair mulki zar-e-mubadla ka sab se bara zariya hain.",
  },
  example: {
    en: "Pakistan's current account balance might look like: Exports USD 30b − Imports USD 57b = Trade deficit USD 27b; + Remittances USD 27b; + Service exports USD 4b − Service imports USD 6b; + Other transfers USD 2b = Current Account Deficit of ~USD 0. In years when remittances are strong, Pakistan can nearly balance the current account despite a large trade deficit.",
    ur: "پاکستان کا جاری کھاتہ توازن اس طرح نظر آ سکتا ہے: برآمدات 30b USD − درآمدات 57b USD = تجارتی خسارہ 27b USD؛ + ترسیلاتِ زر 27b USD؛ + خدمات برآمدات 4b USD − خدمات درآمدات 6b USD؛ + دیگر منتقلی 2b USD = ~0 USD جاری کھاتہ خسارہ۔",
    rm: "Pakistan ka jaari khaata tawazun is tarah nazar aa sakta hai: Baraaamdat 30b USD − Daraamdaat 57b USD = Tijaari khassara 27b USD; + Taraselaat-e-zar 27b USD; + Khadamaat baraaamdat 4b USD − Khadamaat daraamdaat 6b USD; + Deegar muntaqili 2b USD = ~0 USD jaari khaata khassara.",
  },
  faq: [
    {
      question: { en: "Why is Pakistan's current account structurally in deficit?", ur: "پاکستان کا جاری کھاتہ ڈھانچاگت طور پر خسارے میں کیوں ہے؟", rm: "Pakistan ka jaari khaata dhaanchaagat tor par khassaray mein kyun hai?" },
      answer: {
        en: "Three structural reasons: (1) Pakistan's export base is narrow — mostly low-value textile goods (cotton yarn, fabric, garments). It doesn't export enough high-value manufactured goods or services to offset import demand. (2) Pakistan imports most of its energy (crude oil, LNG, coal) — a large and unavoidable drain. (3) The economy is import-intensive: when it grows, imports of machinery, raw materials, and consumer goods surge, widening the deficit. Breaking this cycle requires diversifying exports and developing domestic energy capacity.",
        ur: "تین ڈھانچاگت وجوہات: (1) پاکستان کی برآمدی بنیاد تنگ ہے — زیادہ تر کم قیمت ٹیکسٹائل اشیاء۔ (2) پاکستان اپنی زیادہ تر توانائی درآمد کرتا ہے۔ (3) معیشت درآمد پر زیادہ انحصار کرتی ہے: جب یہ بڑھتی ہے، مشینری اور خام مال کی درآمدات بڑھ جاتی ہیں۔",
        rm: "Teen dhaanchaagat wujuhaat: (1) Pakistan ki baraaamdi bunyaad tang hai — zyada tar kam qeemat textile cheezein. (2) Pakistan apni zyada tar energy daraamd karti hai. (3) Maashiyat daraamd par zyada inhisaar karti hai: jab yeh barhti hai, mashinary aur kham maal ki daraamdaat barh jaati hain.",
      },
    },
  ],
};
