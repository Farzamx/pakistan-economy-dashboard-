import type { Lesson } from "@/lib/academy/types";

export const moneyAndCurrencyLesson: Lesson = {
  slug: "money-and-currency",
  category: "beginner",
  title: { en: "Money and Currency", ur: "پیسہ اور کرنسی", rm: "Paisa aur Currency" },
  subtitle: {
    en: "What makes money valuable, how it's created, and why the rupee's value changes",
    ur: "پیسے کو کیا قیمتی بناتا ہے، یہ کیسے بنتا ہے، اور روپے کی قدر کیوں بدلتی ہے",
    rm: "Paise ko kya qeemti banata hai, yeh kaise banta hai, aur rupay ki qadar kyun badlti hai",
  },
  level: "beginner",
  readMinutes: 7,
  isPremium: false,
  relatedIndicatorSlugs: ["exchange-rate-pkr-usd", "money-supply-pakistan"],
  relatedLessonSlugs: ["exchange-rates-basics", "inflation", "central-banking"],
  content: {
    overview: {
      en: "Money is anything widely accepted as payment. It has three core functions: medium of exchange (buy and sell things), store of value (save wealth over time), and unit of account (measure prices). Currency is the physical/digital form your government issues. The rupee holds value because people trust the Pakistani state to back it.",
      ur: "پیسہ وہ چیز ہے جو ادائیگی کے طور پر وسیع پیمانے پر قبول ہو۔ اس کے تین بنیادی کام ہیں: تبادلے کا ذریعہ، قدر کا ذخیرہ، اور حساب کی اکائی۔ روپے کی قدر اس لیے ہے کیونکہ لوگ پاکستانی ریاست پر بھروسہ کرتے ہیں۔",
      rm: "Paisa woh cheez hai jo adaayigi ke tor par wasee paimane par qabool ho. Is ke teen bunyaadi kaam hain: tabaadlay ka zariya, qadar ka zakheera, aur hisaab ki ikaai. Rupay ki qadar is liye hai kyunke log Pakistani riyaasat par bharosa karte hain.",
    },
    whyItMatters: {
      en: "When people lose faith in currency — as happened in Zimbabwe (hyperinflation) or Weimar Germany — trade collapses and economies implode. Pakistan's rupee depreciation from Rs 160/$ in 2020 to Rs 300/$ by 2023 made imports far more expensive, fuelling inflation and hurting ordinary households. Understanding money explains why central banks exist and why currency stability matters.",
      ur: "جب لوگ کرنسی پر اعتماد کھو دیں — جیسا کہ زمبابوے میں ہوا — تجارت ٹوٹ جاتی ہے۔ پاکستان کے روپے کی 2020 میں 160 روپے/ڈالر سے 2023 میں 300 روپے/ڈالر تک کمی سے درآمدات مہنگی ہوئیں اور مہنگائی بڑھی۔",
      rm: "Jab log currency par aitemaad kho den — jaisa ke Zimbabwe mein hua — tijarat toot jaati hai. Pakistan ke rupay ki 2020 mein 160 rupay/dollar se 2023 mein 300 rupay/dollar tak kami se daraamdaat mahangi huin aur mahangaai barhi.",
    },
    explanation: {
      en: `**Three functions of money:**
1. **Medium of exchange** — without money, you'd have to barter (trade goods for goods). Finding someone who has what you want AND wants what you have is nearly impossible at scale.
2. **Store of value** — money lets you save today and spend later. Inflation erodes this function — Rs 1,000 today buys more than it will in 5 years if prices keep rising.
3. **Unit of account** — money gives everything a common price so you can compare. Without it, you'd price things in goats or hours of labour.

**How money is created:** The State Bank of Pakistan (SBP) creates base money (physical notes and coins). Commercial banks multiply this through lending — when a bank lends Rs 100, the borrower deposits it elsewhere, and that bank lends 90% of it again. This is the money multiplier. Total money in the economy ('broad money' or M2) is far larger than physical cash.

**Why the rupee depreciates:** When Pakistan imports more than it exports, demand for dollars (to pay overseas) rises relative to supply, pushing the rupee down. Inflation also erodes the rupee's domestic purchasing power.`,
      ur: `**پیسے کے تین کام:**
1. **تبادلے کا ذریعہ** — پیسے کے بغیر آپ کو براہ راست سامان کے بدلے سامان دینا پڑتا۔
2. **قدر کا ذخیرہ** — پیسہ آج بچانے اور بعد میں خرچ کرنے دیتا ہے۔ مہنگائی اس کام کو کمزور کرتی ہے۔
3. **حساب کی اکائی** — پیسہ ہر چیز کو ایک مشترک قیمت دیتا ہے تاکہ آپ موازنہ کر سکیں۔

**پیسہ کیسے بنتا ہے:** SBP بنیادی پیسہ بناتا ہے۔ تجارتی بینک قرض دینے سے اسے بڑھاتے ہیں — یہ منی ملٹی پلائر ہے۔`,
      rm: `**Paise ke teen kaam:**
1. **Tabaadlay ka zariya** — Paise ke baghair aap ko seedha saamaan ke badle saamaan dena parta.
2. **Qadar ka zakheera** — Paisa aaj bachane aur baad mein kharch karne deta hai. Mahangaai is kaam ko kamzor karti hai.
3. **Hisaab ki ikaai** — Paisa har cheez ko ek mushtark qeemat deta hai taake aap muwaazna kar sako.

**Paisa kaise banta hai:** SBP bunyaadi paisa banata hai. Tijarati bank qarz dene se ise barhate hain — yeh money multiplier hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Money has intrinsic value.** Modern money (fiat currency) has no intrinsic value — a 1,000-rupee note is just paper. Its value comes from collective trust and legal tender laws that require it to be accepted.

**Myth 2: Printing more money makes a country richer.** Doubling the money supply without increasing real output just means each rupee buys less — inflation. Zimbabwe printed money to pay debts and destroyed its economy.

**Myth 3: Gold backing would fix Pakistan's currency.** The gold standard was abandoned globally because it was too rigid. Countries couldn't expand money supply during recessions without sufficient gold reserves.`,
      ur: `**غلط فہمی 1: پیسے کی ذاتی قدر ہوتی ہے۔** جدید پیسہ (فیاٹ کرنسی) کی ذاتی قدر نہیں — 1,000 روپے کا نوٹ صرف کاغذ ہے۔

**غلط فہمی 2: زیادہ پیسہ چھاپنے سے ملک امیر ہوتا ہے۔** حقیقی پیداوار بڑھائے بغیر رقم کو دوگنا کرنے سے صرف مہنگائی آتی ہے۔

**غلط فہمی 3: سونے کی حمایت پاکستان کی کرنسی درست کر دے گی۔** گولڈ اسٹینڈرڈ کو عالمی سطح پر چھوڑ دیا گیا کیونکہ یہ بہت سخت تھا۔`,
      rm: `**Ghalat fehmi 1: Paise ki zaati qadar hoti hai.** Jadeed paisa (fiat currency) ki zaati qadar nahi — 1,000 rupay ka note sirf kaghaz hai.

**Ghalat fehmi 2: Zyada paisa chhaapne se mulk ameer hota hai.** Haqeeqi paidawar badhaye baghair raqam ko dugna karne se sirf mahangaai aati hai.

**Ghalat fehmi 3: Sone ki himaayat Pakistan ki currency durust kar degi.** Gold standard ko aalami satah par chhod diya gaya kyunke yeh bahut sakht tha.`,
    },
    pakistanExample: {
      en: `**Rupee depreciation 2022-23:** Pakistan's rupee fell from Rs 175/$ in early 2022 to over Rs 300/$ by mid-2023 — a near-halving of value in 18 months. The primary causes: a large current account deficit (Pakistan importing far more than exporting), low forex reserves, political uncertainty, and delayed IMF programme. Every imported good — petrol, medicine, industrial inputs — became dramatically more expensive. This fed directly into 38% peak inflation.`,
      ur: `**روپے کی قدر میں کمی 2022-23:** پاکستان کا روپیہ 2022 کے اوائل میں 175 روپے/ڈالر سے 2023 کے وسط میں 300 روپے سے تجاوز کر گیا۔ بنیادی وجوہات: بڑا جاری کھاتے کا خسارہ، کم زرمبادلہ ذخائر، اور تاخیر سے آئی ایم ایف پروگرام۔ ہر درآمدی چیز — پیٹرول، دوائیں — بہت مہنگی ہو گئی۔`,
      rm: `**Rupay ki qadar mein kami 2022-23:** Pakistan ka rupaya 2022 ke awaail mein 175 rupay/dollar se 2023 ke wust mein 300 rupay se tajaaoz kar gaya. Bunyaadi wajohaat: bara jaari khaate ka khisaara, kam zarmbadla zakheray, aur taakheer se IMF programme. Har daramdaadi cheez — petrol, dawaaein — bahut mahangi ho gayi.`,
    },
    realWorld: {
      en: "Bitcoin was designed as an alternative to government-issued money — fixed supply (21 million coins), no central authority. It fulfils the medium of exchange function partially, is a poor store of value (extreme volatility), and is impractical as a unit of account (prices would have to be quoted in fractions of a bitcoin). This shows why money needs stability properties that most cryptocurrencies lack.",
      ur: "بٹ کوائن حکومتی پیسے کے متبادل کے طور پر ڈیزائن کیا گیا — محدود فراہمی، کوئی مرکزی اتھارٹی نہیں۔ یہ تبادلے کے ذریعے کا کام جزوی طور پر کرتا ہے، قدر کے ذخیرے کے طور پر خراب ہے، اور حساب کی اکائی کے طور پر غیر عملی ہے۔",
      rm: "Bitcoin hukoomati paise ke mutabadil ke tor par design kiya gaya — mahdood faraahami, koi markazi authority nahi. Yeh tabaadlay ke zariye ka kaam juzwi tor par karta hai, qadar ke zakheray ke tor par kharaab hai.",
    },
    summary: {
      en: "• Money: medium of exchange, store of value, unit of account\n• Fiat currency has no intrinsic value — it runs on collective trust\n• SBP creates base money; banks multiply it through lending\n• Printing money without output growth causes inflation\n• Rupee depreciation = imports cost more = inflation\n• Currency stability requires fiscal discipline and adequate reserves",
      ur: "• پیسہ: تبادلے کا ذریعہ، قدر کا ذخیرہ، حساب کی اکائی\n• فیاٹ کرنسی کی ذاتی قدر نہیں — یہ اجتماعی اعتماد پر چلتی ہے\n• SBP بنیادی پیسہ بناتا ہے؛ بینک قرض سے اسے بڑھاتے ہیں\n• پیداوار بڑھائے بغیر پیسہ چھاپنا مہنگائی پیدا کرتا ہے\n• روپے کی کمی = درآمدات مہنگی = مہنگائی",
      rm: "• Paisa: tabaadlay ka zariya, qadar ka zakheera, hisaab ki ikaai\n• Fiat currency ki zaati qadar nahi — yeh ijtimaai aitemaad par chalti hai\n• SBP bunyaadi paisa banata hai; bank qarz se ise barhate hain\n• Paidawar badhaye baghair paisa chhaapna mahangaai paida karta hai\n• Rupay ki kami = daraamdaat mahangi = mahangaai",
    },
  },
  quiz: [
    {
      question: { en: "Which of the following is NOT a function of money?", ur: "مندرجہ ذیل میں سے کون سا پیسے کا کام نہیں ہے؟", rm: "Mundarja zeel mein se kaun sa paise ka kaam nahi hai?" },
      options: [
        { en: "Medium of exchange", ur: "تبادلے کا ذریعہ", rm: "Tabaadlay ka zariya" },
        { en: "Store of value", ur: "قدر کا ذخیرہ", rm: "Qadar ka zakheera" },
        { en: "Unit of account", ur: "حساب کی اکائی", rm: "Hisaab ki ikaai" },
        { en: "Source of economic growth", ur: "اقتصادی ترقی کا ذریعہ", rm: "Iqtisadi taraqqi ka zariya" },
      ],
      correctIndex: 3,
      explanation: { en: "The three core functions of money are: medium of exchange, store of value, and unit of account. Economic growth comes from investment, productivity, and resources — not from money itself.", ur: "پیسے کے تین بنیادی کام ہیں: تبادلے کا ذریعہ، قدر کا ذخیرہ، اور حساب کی اکائی۔ اقتصادی ترقی سرمایہ کاری اور پیداواریت سے آتی ہے۔", rm: "Paise ke teen bunyaadi kaam hain: tabaadlay ka zariya, qadar ka zakheera, aur hisaab ki ikaai. Iqtisadi taraqqi sarmaaya kaari aur paidaawariyat se aati hai." },
    },
    {
      question: { en: "Why does a 1,000-rupee note have value even though it's just paper?", ur: "1,000 روپے کے نوٹ کی قدر کیوں ہے جبکہ یہ صرف کاغذ ہے؟", rm: "1,000 rupay ke note ki qadar kyun hai jabke yeh sirf kaghaz hai?" },
      options: [
        { en: "It contains gold stored at SBP", ur: "اس میں SBP پر محفوظ سونا ہے", rm: "Is mein SBP par mahfooz sona hai" },
        { en: "People and law accept it as payment", ur: "لوگ اور قانون اسے ادائیگی کے طور پر قبول کرتے ہیں", rm: "Log aur qaanoon ise adaayigi ke tor par qabool karte hain" },
        { en: "It costs Rs 1,000 to print it", ur: "اسے چھاپنے میں 1,000 روپے لگتے ہیں", rm: "Ise chhaapne mein 1,000 rupay lagte hain" },
        { en: "The government guarantees its gold value", ur: "حکومت اس کی سونے کی قدر کی ضمانت دیتی ہے", rm: "Hukoomat is ki sone ki qadar ki zamanat deti hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Fiat money is valuable because of collective trust and legal tender laws — society agrees to accept it. It costs almost nothing to print.", ur: "فیاٹ پیسہ اجتماعی اعتماد اور قانونی ٹینڈر قوانین کی وجہ سے قیمتی ہے — معاشرہ اسے قبول کرنے پر متفق ہے۔", rm: "Fiat paisa ijtimaai aitemaad aur qaanooni tender qawaaneen ki wajah se qeemti hai — muaashara ise qabool karne par muttafiq hai." },
    },
    {
      question: { en: "When Pakistan's government prints more money without producing more goods, what typically happens?", ur: "جب پاکستان حکومت زیادہ سامان پیدا کیے بغیر زیادہ پیسہ چھاپتی ہے، عام طور پر کیا ہوتا ہے؟", rm: "Jab Pakistan hukoomat zyada saamaan paida kiye baghair zyada paisa chhaapti hai, aam tor par kya hota hai?" },
      options: [
        { en: "The economy grows faster", ur: "معیشت تیزی سے بڑھتی ہے", rm: "Muaashat tezi se barhti hai" },
        { en: "Inflation rises", ur: "مہنگائی بڑھتی ہے", rm: "Mahangaai barhti hai" },
        { en: "Exports increase automatically", ur: "برآمدات خودبخود بڑھتی ہیں", rm: "Baraamdaat khud-ba-khud barhti hain" },
        { en: "Interest rates fall to zero", ur: "شرح سود صفر تک گر جاتی ہے", rm: "Shar-e-sood sifar tak gir jaati hai" },
      ],
      correctIndex: 1,
      explanation: { en: "More money chasing the same amount of goods means each unit of money buys less — this is inflation. Zimbabwe is the extreme example.", ur: "اتنے ہی سامان کے پیچھے زیادہ پیسہ کا مطلب ہے ہر اکائی کم خریدتی ہے — یہ مہنگائی ہے۔ زمبابوے اس کی انتہائی مثال ہے۔", rm: "Utne hi saamaan ke peeche zyada paisa ka matlab hai har ikaai kam khareedti hai — yeh mahangaai hai. Zimbabwe is ki intihaai misaal hai." },
    },
    {
      question: { en: "What primarily causes the Pakistani rupee to lose value against the US dollar?", ur: "امریکی ڈالر کے مقابلے میں پاکستانی روپے کی قدر کم ہونے کی بنیادی وجہ کیا ہے؟", rm: "Amriki dollar ke muqaable mein Pakistani rupay ki qadar kam hone ki bunyaadi wajah kya hai?" },
      options: [
        { en: "Pakistan printing too many rupees only", ur: "صرف پاکستان کا بہت زیادہ روپے چھاپنا", rm: "Sirf Pakistan ka bahut zyada rupay chhaapna" },
        { en: "Higher demand for dollars than supply (trade deficit, low reserves)", ur: "رسد سے زیادہ ڈالر کی طلب (تجارتی خسارہ، کم ذخائر)", rm: "Rasad se zyada dollar ki talab (tijarati khisaara, kam zakheray)" },
        { en: "US economy growing too fast", ur: "امریکی معیشت بہت تیزی سے بڑھنا", rm: "Amriki muaashat bahut tezi se barhna" },
        { en: "SBP deliberately weakening the rupee", ur: "SBP کا جان بوجھ کر روپے کو کمزور کرنا", rm: "SBP ka jaanboojhkar rupay ko kamzor karna" },
      ],
      correctIndex: 1,
      explanation: { en: "When Pakistan imports more than it exports (trade deficit), Pakistanis need more dollars to pay for imports than they receive from exports. More demand for dollars with less supply pushes the rupee down.", ur: "جب پاکستان برآمدات سے زیادہ درآمد کرتا ہے، پاکستانیوں کو برآمدات سے ملنے والے ڈالروں سے زیادہ ڈالر درکار ہوتے ہیں۔ ڈالر کی زیادہ طلب اور کم رسد روپے کو نیچے دھکیلتی ہے۔", rm: "Jab Pakistan baraamdaat se zyada daraamd karta hai, Pakistaniyon ko baraamdaat se milne wale dolaron se zyada dollar darkar hote hain. Dollar ki zyada talab aur kam rasad rupay ko neeche dhakailti hai." },
    },
  ],
  faq: [
    {
      question: { en: "Why don't we just use gold instead of paper money?", ur: "ہم کاغذی پیسے کی بجائے صرف سونا کیوں استعمال نہیں کرتے؟", rm: "Hum kaghazi paise ki bajaaye sirf sona kyun istemal nahi karte?" },
      answer: { en: "Gold is heavy, hard to divide, expensive to store and transport, and its supply is fixed — economies need to expand their money supply when they grow. The gold standard also meant countries couldn't fight recessions by creating money when needed. Modern fiat currency is far more flexible, though it requires disciplined management.", ur: "سونا بھاری ہے، تقسیم کرنا مشکل ہے، ذخیرہ اور نقل و حمل مہنگی ہے، اور اس کی فراہمی محدود ہے۔ گولڈ اسٹینڈرڈ کا مطلب تھا کہ ملک مندی سے نہیں لڑ سکتے تھے۔", rm: "Sona bhaari hai, taqseem karna mushkil hai, zakheera aur naql-o-haml mahangi hai, aur is ki faraahami mahdood hai. Gold standard ka matlab tha ke mulk mandi se nahi lad sakte the." },
    },
    {
      question: { en: "Is cryptocurrency like Bitcoin a good form of money?", ur: "کیا بٹ کوائن جیسی کریپٹو کرنسی پیسے کی اچھی شکل ہے؟", rm: "Kya Bitcoin jaisi crypto currency paise ki achi shakal hai?" },
      answer: { en: "It partially works as a medium of exchange but fails as a store of value (extreme price volatility) and is impractical as a unit of account (prices would change constantly). Its fixed supply also means it can't expand with economic growth — potentially causing deflation. Central banks and economists remain sceptical for these reasons.", ur: "یہ تبادلے کے ذریعے کے طور پر جزوی طور پر کام کرتا ہے لیکن قدر کے ذخیرے کے طور پر ناکام ہے (شدید قیمت میں اتار چڑھاؤ)۔ اس کی محدود فراہمی معاشی ترقی کے ساتھ بڑھ نہیں سکتی۔", rm: "Yeh tabaadlay ke zariye ke tor par juzwi tor par kaam karta hai lekin qadar ke zakheray ke tor par naakaam hai (shadeed qeemat mein utaar charhaao). Is ki mahdood faraahami muaashi taraqqi ke saath barh nahi sakti." },
    },
  ],
};
