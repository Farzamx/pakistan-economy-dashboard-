import type { Lesson } from "@/lib/academy/types";

export const taxesIntroLesson: Lesson = {
  slug: "taxes-intro",
  category: "beginner",
  title: { en: "Taxes: What They Are and How They Work", ur: "ٹیکس: یہ کیا ہیں اور کیسے کام کرتے ہیں", rm: "Tax: Yeh Kya Hain aur Kaise Kaam Karte Hain" },
  subtitle: {
    en: "Why governments collect taxes, the different types, and why Pakistan's tax-to-GDP ratio is dangerously low",
    ur: "حکومتیں ٹیکس کیوں جمع کرتی ہیں، مختلف اقسام، اور پاکستان کا ٹیکس سے GDP تناسب خطرناک حد تک کم کیوں ہے",
    rm: "Hukoomaten tax kyun jama karti hain, mukhtalif iqsaam, aur Pakistan ka tax se GDP tanaasub khatarnaak hadd tak kam kyun hai",
  },
  level: "beginner",
  readMinutes: 8,
  isPremium: false,
  relatedIndicatorSlugs: ["fiscal-deficit-pakistan"],
  relatedLessonSlugs: ["government-spending-basics", "fiscal-vs-monetary", "pakistan-fiscal-deficit"],
  content: {
    overview: {
      en: "A tax is a compulsory payment to the government in exchange for public goods and services — roads, schools, defence, healthcare. Without taxes, governments can't function. Pakistan collects taxes through the Federal Board of Revenue (FBR). Pakistan's tax-to-GDP ratio (~9-10%) is one of the lowest in the world, forcing the government to borrow heavily and rely on IMF bailouts.",
      ur: "ٹیکس حکومت کو عوامی اشیاء اور خدمات — سڑکیں، اسکول، دفاع — کے بدلے لازمی ادائیگی ہے۔ بغیر ٹیکس کے حکومتیں نہیں چل سکتیں۔ پاکستان کا ٹیکس سے GDP تناسب (~9-10%) دنیا میں سب سے کم ہے، جو حکومت کو بھاری قرض اٹھانے پر مجبور کرتا ہے۔",
      rm: "Tax hukoomat ko awami cheezain aur khadamaat — sardein, iskool, difaa — ke badle laazmi adaaigi hai. Baghair tax ke hukoomaten nahi chal saktin. Pakistan ka tax se GDP tanaasub (~9-10%) duniya mein sab se kam hai, jo hukoomat ko bhaari qarz uthane par majboor karta hai.",
    },
    whyItMatters: {
      en: "A government with low tax revenues must either borrow (adding debt) or print money (causing inflation) to fund spending. Pakistan collects only ~Rs 9 trillion in taxes but spends far more — the gap is filled by debt. This structural fiscal deficit is the root of Pakistan's recurring IMF programme need. Countries with high tax-to-GDP ratios (like Denmark at 46%) fund generous public services without chronic debt crises.",
      ur: "کم ٹیکس آمدنی والی حکومت کو یا تو قرض لینا (قرض بڑھانا) یا پیسہ چھاپنا (مہنگائی) پڑتا ہے۔ پاکستان کا ڈھانچائی مالی خسارہ پاکستان کی بار بار IMF پروگرام کی ضرورت کی جڑ ہے۔",
      rm: "Kam tax aamdani wali hukoomat ko ya toh qarz lena (qarz barhana) ya paisa chhaapna (mahangaai) parta hai. Pakistan ka dhaanchaai maali khisaara Pakistan ki baar baar IMF programme ki zaroorat ki jar hai.",
    },
    explanation: {
      en: `**Types of taxes in Pakistan:**

**1. Direct taxes** — paid directly to government by the person liable:
- **Income Tax:** Individuals and companies pay a percentage of earnings. Pakistan's income tax is progressive — higher income = higher rate (7-35%).
- **Corporate Tax:** Companies pay ~29% of profits to FBR.
- **Capital Gains Tax:** Tax on profits from selling assets (shares, property).
- **Withholding Tax (WHT):** Tax deducted at source — from bank interest, salaries, contracts. Pakistan relies heavily on WHT (~70% of direct taxes) because documentation is weak.

**2. Indirect taxes** — collected from intermediaries, ultimately borne by consumers:
- **General Sales Tax (GST):** Pakistan's GST is 17% on most goods. Added at each stage of production.
- **Federal Excise Duty (FED):** On specific goods: tobacco, beverages, cement, oil.
- **Customs duties:** Taxes on imported goods.

**Pakistan's tax problem:** Only 3-4 million people file income tax returns in a country of 230 million. The informal economy (estimated 35-40% of GDP) pays little tax. Large sectors — agriculture and retail — have massive exemptions. This creates a narrow, unequal tax base where salaried workers and formal businesses bear most of the burden.`,
      ur: `**پاکستان میں ٹیکس کی اقسام:**

**1. براہ راست ٹیکس:** ذمہ دار شخص خود حکومت کو ادا کرتا ہے:
- **آمدن ٹیکس:** پاکستان کا آمدن ٹیکس ترقی پسند ہے (7-35%)۔
- **کارپوریٹ ٹیکس:** کمپنیاں منافع کا ~29% ادا کرتی ہیں۔
- **ودہولڈنگ ٹیکس:** ذریعے پر کاٹا گیا ٹیکس۔ پاکستان اس پر بہت زیادہ انحصار کرتا ہے۔

**2. بالواسطہ ٹیکس:** صارفین بالآخر برداشت کرتے ہیں:
- **جنرل سیلز ٹیکس (GST):** زیادہ تر اشیاء پر 17%۔
- **فیڈرل ایکسائز ڈیوٹی:** تمباکو، مشروبات، سیمنٹ پر۔
- **کسٹم ڈیوٹی:** درآمدی اشیاء پر۔`,
      rm: `**Pakistan mein tax ki iqsaam:**

**1. Baraah-e-raast tax:** Zimmadaar shakhs khud hukoomat ko ada karta hai:
- **Aamdani tax:** Pakistan ka aamdani tax taraqqi pasand hai (7-35%).
- **Corporate tax:** Kampaniyaan munaafe ka ~29% ada karti hain.
- **Withholding tax:** Zariye par kaata gaya tax.

**2. Baalwaasta tax:** Sarfeen baalaakhir bardaasht karte hain:
- **GST:** Zyada tar cheezain par 17%.
- **FED:** Tamaakoo, mashrubaaat, cement par.
- **Customs duty:** Daraamdaati cheezain par.`,
    },
    misconceptions: {
      en: `**Myth 1: Taxes are "the government taking your money."** Taxes fund collective goods that individuals can't provide alone — national defence, disease control, road networks. The question isn't whether taxes should exist, but how much and structured how.

**Myth 2: Higher tax rates always mean more revenue.** The Laffer Curve shows that above a certain rate, people evade taxes more, reducing total revenue. Pakistan's occasional high rates in narrow sectors sometimes collect less than lower rates with broader compliance.

**Myth 3: Indirect taxes (GST) are fair because everyone pays.** GST is regressive — a poor family spending 80% of income on necessities pays a much higher share of income in GST than a rich family that saves 50%. This is why many countries exempt staple foods from GST.`,
      ur: `**غلط فہمی 1: ٹیکس "حکومت آپ کا پیسہ لے رہی ہے"۔** ٹیکس اجتماعی اشیاء فنڈ کرتے ہیں جو افراد اکیلے فراہم نہیں کر سکتے۔

**غلط فہمی 2: زیادہ ٹیکس شرحوں کا ہمیشہ مطلب زیادہ آمدنی ہے۔** لافر کریو دکھاتا ہے کہ ایک حد سے اوپر، لوگ زیادہ ٹیکس چوری کرتے ہیں۔

**غلط فہمی 3: بالواسطہ ٹیکس (GST) منصفانہ ہیں کیونکہ سب ادا کرتے ہیں۔** GST پسپا ہے — غریب خاندان آمدنی کا بڑا حصہ GST میں دیتا ہے۔`,
      rm: `**Ghalat fehmi 1: Tax "hukoomat aap ka paisa le rahi hai"۔** Tax ijtimaai cheezain fund karte hain jo afraad akele faraahim nahi kar sakte.

**Ghalat fehmi 2: Zyada tax sharaon ka hamesha matlab zyada aamdani hai.** Laffer curve dikhata hai ke ek hadd se oopar, log zyada tax chori karte hain.

**Ghalat fehmi 3: Baalwaasta tax (GST) munsifaana hain kyunke sab ada karte hain.** GST paspa hai — ghareeb khaandaan aamdani ka bara hissa GST mein deta hai.`,
    },
    pakistanExample: {
      en: `**Pakistan's FBR tax collection challenge:** FBR collected Rs 9.25 trillion in FY2024 — yet the government needed Rs 14+ trillion to run. The shortfall (~Rs 5 trillion) was financed by domestic and external debt. Core problems: (1) Agriculture (20% of GDP) pays almost no income tax due to political exemptions. (2) The retail sector (15%+ of GDP) is largely untaxed. (3) Only 3-4 million of 230 million file returns. (4) Property and real estate are severely undervalued for tax purposes. IMF programmes consistently demand Pakistan broaden its tax base — especially into agriculture and retail.`,
      ur: `**پاکستان کا FBR ٹیکس جمع کرنے کا چیلنج:** FBR نے FY2024 میں 9.25 ٹریلین روپے جمع کیے — لیکن حکومت کو 14+ ٹریلین روپے درکار تھے۔ کمی (~5 ٹریلین روپے) قرض سے پوری کی گئی۔ بنیادی مسائل: (1) زراعت (GDP کا 20%) تقریباً کوئی آمدن ٹیکس نہیں دیتی۔ (2) ریٹیل شعبہ تقریباً غیر ٹیکس شدہ ہے۔ (3) صرف 3-4 ملین ریٹرن فائل کرتے ہیں۔`,
      rm: `**Pakistan ka FBR tax jama karne ka challenge:** FBR ne FY2024 mein 9.25 trillion rupay jama kiye — lekin hukoomat ko 14+ trillion rupay darkar the. Kami (~5 trillion rupay) qarz se poori ki gayi. Bunyaadi masaail: (1) Ziraat (GDP ka 20%) taqreeban koi aamdani tax nahi deti. (2) Retail shaabay taqreeban ghair tax shuda hai. (3) Sirf 3-4 million return file karte hain.`,
    },
    realWorld: {
      en: "Scandinavian countries (Sweden, Denmark, Norway) have some of the world's highest tax-to-GDP ratios (40-50%) but also the world's highest human development indices. Their model shows that high taxes, if well-designed and collected efficiently, can fund excellent public services that raise overall living standards. The key is tax compliance, efficient spending, and broad coverage — not just high rates.",
      ur: "اسکینڈینیوین ممالک (سویڈن، ڈنمارک، ناروے) میں دنیا کی سب سے اونچی ٹیکس سے GDP تناسب (40-50%) ہے لیکن دنیا کے سب سے اونچے انسانی ترقی کے اشاریے بھی ہیں۔ ان کا ماڈل دکھاتا ہے کہ اچھی طرح سے ڈیزائن کردہ اونچے ٹیکس بہترین عوامی خدمات فنڈ کر سکتے ہیں۔",
      rm: "Scandinavian mumaalik (Sweden, Denmark, Norway) mein duniya ki sab se oonchi tax se GDP tanaasub (40-50%) hai lekin duniya ke sab se oonche insaani taraqqi ke ashaariye bhi hain. Un ka model dikhata hai ke achi tarah se design karda oonche tax behtareen awami khadamaat fund kar sakte hain.",
    },
    summary: {
      en: "• Taxes fund public goods: defence, roads, schools, healthcare\n• Direct taxes: income tax (progressive), corporate tax, capital gains\n• Indirect taxes: GST (17%), excise duties, customs\n• Pakistan tax-to-GDP ~9-10% — one of the lowest globally\n• Only 3-4 million of 230 million file returns — massive non-compliance\n• Agriculture and retail largely untaxed — narrow, unequal base\n• Low tax revenue → chronic fiscal deficit → debt dependency → IMF cycles",
      ur: "• ٹیکس عوامی اشیاء فنڈ کرتے ہیں: دفاع، سڑکیں، اسکول\n• براہ راست ٹیکس: آمدن ٹیکس (ترقی پسند)، کارپوریٹ ٹیکس\n• بالواسطہ ٹیکس: GST (17%)، ایکسائز، کسٹم\n• پاکستان ٹیکس سے GDP ~9-10% — عالمی سطح پر سب سے کم\n• 230 ملین میں سے صرف 3-4 ملین ریٹرن فائل کرتے ہیں\n• کم ٹیکس → مسلسل مالی خسارہ → قرض انحصار → IMF چکر",
      rm: "• Tax awami cheezain fund karte hain: difaa, sardein, iskool\n• Baraah-e-raast tax: aamdani tax (taraqqi pasand), corporate tax\n• Baalwaasta tax: GST (17%), excise, customs\n• Pakistan tax se GDP ~9-10% — aalami satah par sab se kam\n• 230 million mein se sirf 3-4 million return file karte hain\n• Kam tax → musalsal maali khisaara → qarz inhisaar → IMF chakkar",
    },
  },
  quiz: [
    {
      question: { en: "Which type of tax is Pakistan's General Sales Tax (GST)?", ur: "پاکستان کا جنرل سیلز ٹیکس (GST) کس قسم کا ٹیکس ہے؟", rm: "Pakistan ka General Sales Tax (GST) kis qism ka tax hai?" },
      options: [
        { en: "Direct tax", ur: "براہ راست ٹیکس", rm: "Baraah-e-raast tax" },
        { en: "Indirect tax", ur: "بالواسطہ ٹیکس", rm: "Baalwaasta tax" },
        { en: "Capital gains tax", ur: "سرمایہ کی نفع ٹیکس", rm: "Sarmaaya ki nafa tax" },
        { en: "Wealth tax", ur: "دولت ٹیکس", rm: "Dawlat tax" },
      ],
      correctIndex: 1,
      explanation: { en: "GST is an indirect tax — it's added to the price of goods and collected by businesses, but ultimately borne by the consumer. Pakistan's standard GST rate is 17%.", ur: "GST ایک بالواسطہ ٹیکس ہے — یہ اشیاء کی قیمت میں شامل ہے اور کاروبار جمع کرتے ہیں، لیکن آخر کار صارف برداشت کرتا ہے۔ پاکستان کی معیاری GST شرح 17% ہے۔", rm: "GST ek baalwaasta tax hai — yeh cheezain ki qeemat mein shaamil hai aur karobar jama karte hain, lekin aakhir kaar sarfeen bardaasht karta hai. Pakistan ki miyaari GST shar 17% hai." },
    },
    {
      question: { en: "Why is Pakistan's tax-to-GDP ratio (~9%) considered a serious problem?", ur: "پاکستان کا ٹیکس سے GDP تناسب (~9%) کو سنگین مسئلہ کیوں سمجھا جاتا ہے؟", rm: "Pakistan ka tax se GDP tanaasub (~9%) ko sangin masla kyun samjha jaata hai?" },
      options: [
        { en: "It means taxes are too high", ur: "اس کا مطلب ہے ٹیکس بہت زیادہ ہیں", rm: "Is ka matlab hai tax bahut zyada hain" },
        { en: "It means Pakistan can't fund basic services without chronic borrowing", ur: "اس کا مطلب ہے پاکستان مسلسل قرض کے بغیر بنیادی خدمات فنڈ نہیں کر سکتا", rm: "Is ka matlab hai Pakistan musalsal qarz ke baghair bunyaadi khadamaat fund nahi kar sakta" },
        { en: "It is actually too high for a developing country", ur: "یہ ترقی پذیر ملک کے لیے بہت زیادہ ہے", rm: "Yeh taraqqi pazeer mulk ke liye bahut zyada hai" },
        { en: "It means the economy is growing too fast", ur: "اس کا مطلب ہے معیشت بہت تیزی سے بڑھ رہی ہے", rm: "Is ka matlab hai muaashat bahut tezi se barh rahi hai" },
      ],
      correctIndex: 1,
      explanation: { en: "With ~9% tax-to-GDP, Pakistan collects far less than it spends. The gap is financed by borrowing, creating a debt spiral that leads to repeated IMF programmes and fiscal crises.", ur: "~9% ٹیکس سے GDP کے ساتھ، پاکستان اپنے اخراجات سے بہت کم جمع کرتا ہے۔ کمی قرض سے پوری ہوتی ہے، جس سے قرض کا چکر پیدا ہوتا ہے۔", rm: "~9% tax se GDP ke saath, Pakistan apne ikhraajahat se bahut kam jama karta hai. Kami qarz se poori hoti hai, jis se qarz ka chakkar paida hota hai." },
    },
    {
      question: { en: "Pakistan's income tax is 'progressive.' What does this mean?", ur: "پاکستان کا آمدن ٹیکس 'ترقی پسند' ہے۔ اس کا کیا مطلب ہے؟", rm: "Pakistan ka aamdani tax 'taraqqi pasand' hai. Is ka kya matlab hai?" },
      options: [
        { en: "Everyone pays the same flat rate", ur: "سب ایک ہی یکساں شرح ادا کرتے ہیں", rm: "Sab ek hi yaksan shar ada karte hain" },
        { en: "Higher income earners pay a higher percentage", ur: "زیادہ کمانے والے زیادہ فیصد ادا کرتے ہیں", rm: "Zyada kamane wale zyada feesad ada karte hain" },
        { en: "Tax rates decrease as income rises", ur: "آمدنی بڑھنے کے ساتھ ٹیکس شرحیں کم ہوتی ہیں", rm: "Aamdani barhne ke saath tax sharayein kam hoti hain" },
        { en: "Only progressive businesses pay it", ur: "صرف ترقی پسند کاروبار اسے ادا کرتے ہیں", rm: "Sirf taraqqi pasand karobar ise ada karte hain" },
      ],
      correctIndex: 1,
      explanation: { en: "Progressive taxation means higher income brackets pay higher rates. Pakistan's income tax goes from 0% (below Rs 600,000/year) up to 35% for very high earners — designed to distribute the tax burden more equitably.", ur: "ترقی پسند ٹیکس کا مطلب ہے زیادہ آمدنی کے گروپ زیادہ شرح ادا کرتے ہیں۔ پاکستان کا آمدن ٹیکس 0% سے 35% تک جاتا ہے۔", rm: "Taraqqi pasand tax ka matlab hai zyada aamdani ke group zyada shar ada karte hain. Pakistan ka aamdani tax 0% se 35% tak jaata hai." },
    },
    {
      question: { en: "Why does Pakistan rely so heavily on withholding tax (WHT)?", ur: "پاکستان ودہولڈنگ ٹیکس (WHT) پر اتنا کیوں انحصار کرتا ہے؟", rm: "Pakistan withholding tax (WHT) par itna kyun inhisaar karta hai?" },
      options: [
        { en: "It is the most fair system", ur: "یہ سب سے منصفانہ نظام ہے", rm: "Yeh sab se munsifaana nizaam hai" },
        { en: "It collects tax at source without needing full documentation/compliance", ur: "یہ مکمل دستاویزات/تعمیل کی ضرورت کے بغیر ذریعے پر ٹیکس جمع کرتا ہے", rm: "Yeh mukammal dastaawizaat/tameel ki zaroorat ke baghair zariye par tax jama karta hai" },
        { en: "It is required by the IMF", ur: "IMF نے یہ لازمی قرار دیا ہے", rm: "IMF ne yeh laazmi qarar diya hai" },
        { en: "It only applies to foreigners", ur: "یہ صرف غیر ملکیوں پر لاگو ہوتا ہے", rm: "Yeh sirf ghair mulkiyon par laagu hota hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Pakistan's informal economy and weak documentation culture make self-reporting unreliable. WHT deducts taxes at source (from bank transactions, salaries, payments) — capturing revenue even from those who wouldn't file returns voluntarily.", ur: "پاکستان کی غیر رسمی معیشت اور کمزور دستاویزی ثقافت خود رپورٹنگ کو ناقابل اعتماد بناتی ہے۔ WHT ذریعے پر ٹیکس کاٹتا ہے۔", rm: "Pakistan ki ghair rasmi muaashat aur kamzor dastaawizi saqafat khud-reporting ko naaqabil aitemaad banati hai. WHT zariye par tax kaatta hai." },
    },
  ],
  faq: [
    {
      question: { en: "Who collects taxes in Pakistan?", ur: "پاکستان میں ٹیکس کون جمع کرتا ہے؟", rm: "Pakistan mein tax kaun jama karta hai?" },
      answer: { en: "The Federal Board of Revenue (FBR) collects federal taxes (income tax, GST, customs, FED). Provincial governments collect provincial taxes (agricultural income tax, property tax, professional tax). Sales tax on services is a provincial subject since the 18th Amendment — each province has its own revenue authority (SRA, PRA, KPK-RA, BRA).", ur: "فیڈرل بورڈ آف ریونیو (FBR) وفاقی ٹیکس جمع کرتا ہے۔ صوبائی حکومتیں صوبائی ٹیکس جمع کرتی ہیں۔ خدمات پر سیلز ٹیکس 18ویں ترمیم کے بعد سے صوبائی موضوع ہے۔", rm: "FBR wafaaqi tax jama karta hai. Subaai hukoomaten subaai tax jama karti hain. Khadamaat par sales tax 18ween tarmeem ke baad se subaai mauzu hai." },
    },
    {
      question: { en: "What would happen if Pakistan doubled its tax collection?", ur: "اگر پاکستان اپنا ٹیکس جمع دوگنا کر لے تو کیا ہوگا؟", rm: "Agar Pakistan apna tax jama dugna kar le toh kya hoga?" },
      answer: { en: "Doubling tax collection (from ~9% to ~18% of GDP) would provide Pakistan with an extra Rs 8-10 trillion annually. This could eliminate the fiscal deficit, reduce debt servicing pressure, and fund massive investments in education, health, and infrastructure without IMF dependence. This is why every IMF programme demands tax reform. The challenge isn't just increasing rates — it's broadening the base to include agriculture, real estate, and the informal sector.", ur: "ٹیکس جمع دوگنا کرنے (~9% سے ~18% GDP) سے پاکستان کو سالانہ اضافی 8-10 ٹریلین روپے ملیں گے۔ یہ مالی خسارہ ختم کر سکتا ہے اور IMF انحصار کم کر سکتا ہے۔", rm: "Tax jama dugna karne (~9% se ~18% GDP) se Pakistan ko saalaana izaafee 8-10 trillion rupay milein ge. Yeh maali khisaara khatam kar sakta hai aur IMF inhisaar kam kar sakta hai." },
    },
  ],
};
