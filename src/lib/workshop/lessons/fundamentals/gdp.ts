import type { Lesson } from "@/lib/workshop/types";

export const gdpLesson: Lesson = {
  slug: "gdp",
  category: "fundamentals",
  title: {
    en: "GDP & Economic Growth",
    ur: "جی ڈی پی اور اقتصادی ترقی",
    rm: "GDP aur Iqtisaadi Taraqqī",
  },
  subtitle: {
    en: "How Pakistan's economy is measured — and what the numbers really mean",
    ur: "پاکستان کی معیشت کیسے ماپی جاتی ہے — اور اعداد و شمار کا اصل مطلب",
    rm: "Pakistan ki maashiyat kaise maapi jaati hai — aur adaad o shumaar ka asal matlab",
  },
  level: "beginner",
  readMinutes: 9,
  isPremium: false,
  relatedIndicatorSlugs: [
    "gdp-growth-pakistan",
    "lsm-pakistan",
    "trade-balance-pakistan",
  ],
  content: {
    explanation: {
      en: `Gross Domestic Product (GDP) is the total monetary value of all goods and services produced within a country's borders during a specific period — typically a quarter or a year.

There are three equivalent ways to measure GDP:
• **Expenditure approach:** GDP = Consumption (C) + Investment (I) + Government Spending (G) + Net Exports (X – M)
• **Income approach:** Sum of all incomes earned — wages, profits, rents, interest
• **Production approach:** Sum of value added across all sectors

Pakistan reports GDP using the production approach, with three main sectors:
1. **Agriculture (22% of GDP):** Crops, livestock, forestry, fishing — highly sensitive to rainfall, floods, and input costs
2. **Industry (19%):** Large-Scale Manufacturing (LSM), mining, construction, utilities
3. **Services (57%):** Wholesale & retail trade, transport, finance, government services

Pakistan's National Accounts are compiled by the Pakistan Bureau of Statistics (PBS) and rebased periodically — the current base year is 2015–16.

GDP growth in Pakistan is typically reported as the annual change in real (inflation-adjusted) GDP. When GDP grows at 4–5%, the economy is expanding near its estimated potential. Below 2–3% growth, unemployment tends to rise.`,

      ur: `مجموعی قومی پیداوار (GDP) ایک مخصوص مدت میں — عام طور پر ایک سہ ماہی یا سال — ملک کی سرحدوں کے اندر پیدا ہونے والی تمام اشیاء اور خدمات کی کل مالی قدر ہے۔

GDP ماپنے کے تین مساوی طریقے:
• **اخراجات کا طریقہ:** GDP = خپت (C) + سرمایہ کاری (I) + حکومتی اخراجات (G) + خالص برآمدات (X – M)
• **آمدنی کا طریقہ:** تمام کمائی ہوئی آمدنیوں کا مجموعہ
• **پیداوار کا طریقہ:** تمام شعبوں میں اضافی قدر کا مجموعہ

پاکستان میں تین اہم شعبے:
1. **زراعت (22٪):** فصلیں، مویشی، جنگلات، ماہی گیری
2. **صنعت (19٪):** بڑی پیمانے کی صنعت، کان کنی، تعمیرات
3. **خدمات (57٪):** تجارت، نقل و حمل، مالیات، حکومتی خدمات`,

      rm: `Gross Domestic Product (GDP) ek makhsoos muddat mein — aam tor par ek sihamaahi ya saal — mulk ki sarhaddon ke andar paida hone wali tamam cheezeen aur khadamaat ki kul maali qemat hai.

GDP maapne ke teen musaawi tareeqey:
• **Ikhraajaaat ka tareeqa:** GDP = Khapat (C) + Sarmayakari (I) + Hukoomatī Ikhraajaat (G) + Khaalis Baraamdaat (X – M)
• **Aamdani ka tareeqa:** Tamam kamai hui aamdanion ka majmooa
• **Paida waar ka tareeqa:** Tamam shaaboon mein izaafi qemat ka majmooa

Pakistan mein teen aham shaabey:
1. **Zira'at (22%):** Faszlen, mawishi, jangalat, maahi giri
2. **Sana'at (19%):** Bare paimaney ki sana'at, kaan kani, tamiraat
3. **Khadamaat (57%):** Tijaarat, naql-o-hamal, maaliyaat, hukoomatī khadamaat`,
    },

    pakistanExample: {
      en: `Pakistan's GDP growth has been volatile, reflecting both structural vulnerabilities and external shocks:

**FY2022 (5.0% growth):** A post-COVID recovery year, supported by strong remittances, consumer spending, and construction activity. The economy appeared to be accelerating.

**FY2023 (–0.2% contraction):** Pakistan's economy contracted for the first time in decades. Drivers: devastating floods (reduced agriculture output), IMF-mandated stabilisation (higher interest rates cooled investment and consumption), energy shortages limiting industrial output, and import restrictions that disrupted supply chains.

**FY2024 (2.4% growth):** A partial recovery as the IMF program stabilised the currency and inflation began declining from its peak. Manufacturing recovered modestly. Agriculture rebounded after the flood impact.

Pakistan's per capita GDP (roughly $1,400 in FY2024 at current prices) is low by regional standards — India is at ~$2,600, Bangladesh ~$2,700. Reaching middle-income status requires sustained 6–7% annual growth, which Pakistan has achieved only briefly in its history.`,

      ur: `پاکستان کی GDP ترقی غیر مستحکم رہی ہے:

**مالی سال 2022 (5.0٪ ترقی):** COVID کے بعد بحالی کا سال، مضبوط ترسیلاتِ زر اور صارف خرچ کی حمایت یافتہ۔

**مالی سال 2023 (–0.2٪ سکڑاؤ):** پاکستان کی معیشت کئی دہائیوں میں پہلی بار سکڑی۔ عوامل: تباہ کن سیلاب، IMF مالیاتی استحکام، بجلی کی کمی۔

**مالی سال 2024 (2.4٪ ترقی):** IMF پروگرام نے کرنسی کو مستحکم کیا اور افراطِ زر کم ہونا شروع ہوا۔

پاکستان کی فی کس GDP (تقریباً 1,400$ مالی سال 2024 میں) علاقائی معیار سے کم ہے — بھارت 2,600$ اور بنگلہ دیش 2,700$ پر ہیں۔`,

      rm: `Pakistan ki GDP taraqqī ghair mustahkam rahi hai:

**Maali Saal 2022 (5.0% taraqqī):** COVID ke baad bahali ka saal, mazboot tarsilaat-e-zar aur consumer kharch ki himaayat yaafta.

**Maali Saal 2023 (–0.2% sikrhaao):** Pakistan ki maashiyat kai dahaion mein pehli baar sikhari. Awamil: tabaah kun sailaab, IMF maali istehkaam, bijli ki kami.

**Maali Saal 2024 (2.4% taraqqī):** IMF program ne currency ko mustahkam kiya aur inflation kam hona shuru hua.

Pakistan ki fi kus GDP (taqreeban $1,400 maali saal 2024 mein) ilaaqai maiyar se kam hai — Bharat $2,600 aur Bangladesh $2,700 par hain.`,
    },

    realWorld: {
      en: `China's economic miracle is the most cited example of sustained high GDP growth. From 1980 to 2010, China averaged ~10% annual GDP growth, lifting 800 million people out of poverty. The drivers: massive infrastructure investment, export-led manufacturing, technology adoption, and a young, urbanising workforce.

South Korea transformed from a war-torn country with lower per capita income than Pakistan in 1960 to a high-income economy today. The key: industrial policy, investment in education, export competitiveness, and institutional quality.

Bangladesh offers a closer parallel to Pakistan — similar colonial history, similar income level in 1971. Bangladesh has outperformed Pakistan on GDP growth for over a decade, driven by the readymade garments (RMG) sector, female labour force participation, and better macroeconomic management (lower fiscal deficits, more stable exchange rate).

Pakistan's challenge is not a lack of resources but structural: energy shortages, low tax-to-GDP ratio (~10%), weak export diversification, and boom-bust cycles tied to IMF programs.`,

      ur: `چین کا اقتصادی معجزہ سب سے زیادہ حوالہ دی جانے والی مثال ہے۔ 1980 سے 2010 تک، چین نے اوسطاً 10٪ سالانہ GDP ترقی حاصل کی، 80 کروڑ لوگوں کو غربت سے نکالا۔

جنوبی کوریا نے 1960 میں پاکستان سے کم فی کس آمدنی سے ایک اعلیٰ آمدنی والی معیشت میں تبدیلی کی۔

بنگلہ دیش پاکستان سے قریب تر مثال ہے — اسی طرح کی تاریخ، اسی طرح کی آمدنی کی سطح۔ بنگلہ دیش نے ایک دہائی سے زیادہ عرصے سے پاکستان سے بہتر GDP ترقی کی ہے۔`,

      rm: `China ka iqtisaadi mojza sab se zyada hawala di jaane wali misaal hai. 1980 se 2010 tak, China ne aosatan 10% saalana GDP taraqqī haasil ki, 80 karor logon ko ghurbat se nikaala.

Janoobi Korea ne 1960 mein Pakistan se kam fi kus aamdani se ek aala aamdani wali maashiyat mein tabdeeli ki.

Bangladesh Pakistan se qareeb tar misaal hai — usi tarah ki taareekh, usi tarah ki aamdani ki satah. Bangladesh ne ek dahai se zyada arse se Pakistan se behtar GDP taraqqī ki hai.`,
    },

    whyTraders: {
      en: `GDP data moves markets in specific, predictable ways:

**Equity markets:** Strong GDP growth signals better corporate earnings ahead. A GDP surprise above consensus tends to push KSE-100 higher, especially for consumer, financial, and industrial names. Negative growth (contraction) signals earnings headwinds.

**Currency:** Sustained strong growth attracts foreign investment, supporting the PKR. Weak growth combined with a large current account deficit puts downward pressure on the rupee.

**Government bonds (PIBs, T-Bills):** Faster growth can mean higher tax revenues and lower fiscal deficits — positive for sovereign credit. But if growth is inflationary, bond yields rise in anticipation of SBP rate hikes.

**Timing:** Pakistan's GDP data is released annually by PBS (provisional estimates in May/June, final in the following year). Quarterly GDP estimates are less reliable than in advanced economies. Traders often use high-frequency proxies — LSM (monthly), cement dispatches, auto sales, power consumption — to estimate GDP trajectory in real time.`,

      ur: `GDP ڈیٹا مخصوص اور قابلِ پیش گوئی طریقوں سے بازاروں کو متحرک کرتا ہے:

**حصص کی منڈیاں:** مضبوط GDP ترقی بہتر کارپوریٹ منافع کا اشارہ دیتی ہے۔

**کرنسی:** مستمر مضبوط ترقی غیر ملکی سرمایہ کاری کو راغب کرتی ہے، PKR کی حمایت کرتی ہے۔

**حکومتی بانڈز:** تیز ترقی زیادہ ٹیکس آمدنی اور کم مالیاتی خسارے کا مطلب ہو سکتی ہے۔

**وقت:** پاکستان کے GDP ڈیٹا PBS سالانہ جاری کرتا ہے۔ تاجر ماہانہ اشارے جیسے LSM، سیمنٹ، آٹو سیلز کو حقیقی وقت میں استعمال کرتے ہیں۔`,

      rm: `GDP data makhsoos aur qaabil-e-pesh goi tareeqon se baazaron ko mutaharrik karta hai:

**Hissas ki mandiyan:** Mazboot GDP taraqqī behtar corporate munafe ka ishara deti hai.

**Currency:** Mustamirr mazboot taraqqī ghair mulki sarmayakari ko raghib karti hai, PKR ki himaayat karti hai.

**Hukoomatī bonds:** Tez taraqqī zyada tax aamdani aur kam maali khassarey ka matlab ho sakta hai.

**Waqt:** Pakistan ke GDP data PBS saalana jaari karta hai. Trader maahana ishaare jaise LSM, cement, auto sales ko haqeeqi waqt mein istiamaal karte hain.`,
    },

    whyInvestors: {
      en: `Long-term investors use GDP as a macro compass for three key decisions:

**Country allocation:** Is Pakistan growing fast enough to generate equity market returns that compensate for currency and political risk? Pakistan's historical equity risk premium has been high — but so has volatility. GDP growth trajectory is a key input.

**Sector rotation:** In early-cycle GDP recovery, cyclicals (autos, steel, cement) tend to outperform. In mature-cycle high growth, consumer discretionary and financials shine. Understanding where Pakistan is in the GDP cycle helps position sector allocations.

**Fiscal trajectory:** GDP growth directly affects the government's debt-to-GDP ratio. If nominal GDP grows faster than the interest rate on government debt, the debt burden is self-correcting. Pakistan's chronic fiscal problem: nominal GDP growth has often lagged debt servicing costs, keeping debt-to-GDP elevated.

**Remittances linkage:** Pakistan's GDP is unusual in that remittances (~$27B annually, ~8% of GDP) are a major income source. Slowdowns in Gulf economies, where ~4 million Pakistanis work, directly reduce remittance inflows and drag on GDP.`,

      ur: `طویل مدتی سرمایہ کار تین اہم فیصلوں کے لیے GDP کو میکرو کمپاس کے طور پر استعمال کرتے ہیں:

**ملکی مختص کاری:** کیا پاکستان اتنی تیزی سے ترقی کر رہا ہے کہ حصص بازار کے منافع مناسب ہوں؟

**شعبہ جاتی گردش:** ابتدائی چکر میں سائیکلیکل شعبے بہتر کارکردگی دکھاتے ہیں۔

**مالیاتی رجحان:** GDP ترقی حکومت کے قرض-سے-GDP تناسب کو براہ راست متاثر کرتی ہے۔

**ترسیلاتِ زر کا تعلق:** پاکستان کی GDP میں ترسیلاتِ زر (~27 ارب ڈالر سالانہ، ~8٪ GDP) ایک بڑا عامل ہے۔`,

      rm: `Taweeel muddat ke sarmayakaar teen aham faisalon ke liye GDP ko macro compass ke tor par istiamaal karte hain:

**Mulki mukhtaas kaari:** Kya Pakistan itni tezi se taraqqī kar raha hai ke hissas bazaar ke munafe munaasib hon?

**Shaaba jaati gardish:** Ibtidaai chakkar mein cyclical shaabey behtar karkaardagi dikhate hain.

**Maali rujhaan:** GDP taraqqī hukoomat ke qarz-se-GDP tanaasub ko seedha mutaassir karti hai.

**Tarsilaat-e-Zar ka ta'alluq:** Pakistan ki GDP mein tarsilaat-e-zar (~$27 arab saalana, ~8% GDP) ek bara aamil hai.`,
    },
  },

  faq: [
    {
      question: {
        en: "What is the difference between GDP and GNP?",
        ur: "GDP اور GNP میں کیا فرق ہے؟",
        rm: "GDP aur GNP mein kya farq hai?",
      },
      answer: {
        en: "GDP measures output produced within Pakistan's borders regardless of who produces it. GNP (Gross National Product) adds Pakistani income from abroad (like remittances and profits from overseas investments) and subtracts income earned by foreigners inside Pakistan. For Pakistan, GNP is higher than GDP because remittances are large — roughly $27B annually — while foreign investment income flowing out of Pakistan is smaller.",
        ur: "GDP پاکستان کی سرحدوں کے اندر پیدا ہونے والی پیداوار ماپتا ہے۔ GNP غیر ملکی پاکستانیوں کی آمدنی (ترسیلاتِ زر) کو شامل کرتا ہے۔ پاکستان کے لیے GNP زیادہ ہے کیونکہ ترسیلاتِ زر کثیر ہیں۔",
        rm: "GDP Pakistan ki sarhaddon ke andar paida hone wali paida waar maapata hai. GNP ghair mulki Pakistanion ki aamdani (tarsilaat-e-zar) ko shaamil karta hai. Pakistan ke liye GNP zyada hai kyunke tarsilaat-e-zar kaseer hain.",
      },
    },
    {
      question: {
        en: "Why does Pakistan's GDP seem low compared to neighbouring countries?",
        ur: "پاکستان کی GDP پڑوسی ممالک کے مقابلے میں کم کیوں لگتی ہے؟",
        rm: "Pakistan ki GDP parosi mumalik ke muqable mein kam kyun lagti hai?",
      },
      answer: {
        en: "Several factors keep Pakistan's formal GDP understated. A large informal economy — estimated at 35–40% of official GDP — is not fully captured. Agricultural income, especially in subsistence farming, is hard to measure. Low female labour force participation (around 20%) excludes significant productive activity. Additionally, the tax-to-GDP ratio of ~10% means the government has limited visibility into economic activity. PPP-adjusted GDP (which accounts for lower prices in Pakistan) is significantly higher than nominal GDP.",
        ur: "پاکستان کی رسمی GDP کم دکھنے کی کئی وجوہات ہیں۔ ایک بڑی غیر رسمی معیشت — تخمیناً 35–40٪ رسمی GDP — مکمل طور پر شامل نہیں۔ زرعی آمدنی ماپنا مشکل ہے۔ خواتین کی کم لیبر مارکیٹ شرکت (~20٪) اہم پیداواری سرگرمی کو خارج کرتی ہے۔",
        rm: "Pakistan ki rasmi GDP kam dikhne ki kai wajuhaat hain. Ek bari ghair rasmi maashiyat — takhminaan 35–40% rasmi GDP — mukammal tor par shaamil nahi. Zira'ati aamdani maapna mushkil hai. Khawateen ki kam labour market shirkat (~20%) aham paida waari sargarmī ko khaarij karti hai.",
      },
    },
    {
      question: {
        en: "Is GDP the best measure of economic wellbeing?",
        ur: "کیا GDP اقتصادی فلاح و بہبود کا بہترین پیمانہ ہے؟",
        rm: "Kya GDP iqtisaadi falah-o-behbood ka behtareen paimaana hai?",
      },
      answer: {
        en: "GDP is a measure of output, not wellbeing. It does not capture income distribution (a highly unequal economy can have strong GDP growth), environmental degradation, unpaid work (like household labour), or subjective wellbeing. Alternative measures like the Human Development Index (HDI) — which combines income, education, and life expectancy — often paint a different picture. Pakistan ranks 164th on the HDI despite being the world's 47th largest economy by nominal GDP.",
        ur: "GDP پیداوار کا پیمانہ ہے، فلاح کا نہیں۔ یہ آمدنی کی تقسیم، ماحولیاتی انحطاط، یا بلا معاوضہ کام کو نہیں ماپتا۔ متبادل پیمانے جیسے ہیومن ڈیولپمنٹ انڈیکس (HDI) اکثر مختلف تصویر پیش کرتے ہیں۔ پاکستان HDI پر 164ویں نمبر پر ہے۔",
        rm: "GDP paida waar ka paimaana hai, falah ka nahi. Yeh aamdani ki taqseem, maahaulyaati inhitaat, ya bila mu'aawzah kaam ko nahi maapata. Mutabadil paimaane jaise Human Development Index (HDI) aksar mukhtalif tasweer pesh karte hain. Pakistan HDI par 164wen number par hai.",
      },
    },
  ],
};
