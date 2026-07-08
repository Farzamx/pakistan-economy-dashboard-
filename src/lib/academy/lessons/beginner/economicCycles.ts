import type { Lesson } from "@/lib/academy/types";

export const economicCyclesLesson: Lesson = {
  slug: "economic-cycles",
  category: "beginner",
  title: { en: "Economic Cycles (Boom and Bust)", ur: "اقتصادی چکر (ابھار اور گراوٹ)", rm: "Iqtisadi Chakkar (Ubhaar aur Giraawat)" },
  subtitle: {
    en: "Why economies expand and contract in predictable patterns — and how Pakistan fits in",
    ur: "معیشتیں پیش گو نمونوں میں کیوں پھیلتی اور سکڑتی ہیں — اور پاکستان اس میں کیسے فٹ بیٹھتا ہے",
    rm: "Muaashaten peshgo namoonon mein kyun phailti aur sikurrti hain — aur Pakistan is mein kaise fit baithta hai",
  },
  level: "beginner",
  readMinutes: 8,
  isPremium: false,
  relatedIndicatorSlugs: ["gdp-growth-pakistan", "lsm-pakistan"],
  relatedLessonSlugs: ["gdp", "unemployment-basics", "monetary-policy"],
  content: {
    overview: {
      en: "Every economy moves through a cycle: expansion (growth), peak (maximum output), contraction (slowdown or recession), and trough (minimum). Then it repeats. These swings are driven by investment, consumer confidence, credit, global conditions, and policy choices. Understanding cycles helps explain why Pakistan's growth averaged 4-5% in good years but contracted in bad ones.",
      ur: "ہر معیشت ایک چکر سے گزرتی ہے: پھیلاؤ (ترقی)، عروج (زیادہ سے زیادہ پیداوار)، سکڑاؤ (سست روی یا کساد)، اور نادر (کم از کم)۔ پھر یہ دہرایا جاتا ہے۔",
      rm: "Har muaashat ek chakkar se guzarti hai: phailaao (taraqqi), uroooj (zyada se zyada paidawar), sikuraao (sust rawi ya kasaad), aur naadir (kam az kam). Phir yeh dohraya jaata hai.",
    },
    whyItMatters: {
      en: "If you start a business at the peak of a cycle, you'll face a downturn within 2-3 years. If you buy a house at the trough, you may catch a rising market. Governments use fiscal policy (spending/taxes) and monetary policy (interest rates) to try to smooth cycles — preventing the boom from overheating and the bust from becoming catastrophic. Pakistan has historically had volatile cycles, partly due to dependence on external financing and weather-sensitive agriculture.",
      ur: "اگر آپ چکر کے عروج پر کاروبار شروع کریں، 2-3 سال میں مندی کا سامنا ہوگا۔ حکومتیں چکروں کو ہموار کرنے کے لیے مالی اور مالیاتی پالیسی استعمال کرتی ہیں۔",
      rm: "Agar aap chakkar ke uroooj par karobar shuru karen, 2-3 saal mein mandi ka samna hoga. Hukoomaten chakkaron ko hamwaar karne ke liye maali aur maaliyaati policy istemal karti hain.",
    },
    explanation: {
      en: `**Four phases of an economic cycle:**

1. **Expansion:** GDP growth is positive and rising. Unemployment falls. Consumer confidence is high. Businesses invest and hire. Credit is cheap (banks lend freely). This is when people feel prosperous — Pakistan experienced this during FY2021-22 when growth hit 6%.

2. **Peak:** The economy reaches maximum output. Inflation tends to rise (too much money chasing too few goods). Capacity constraints appear — factories run at full capacity. Central banks raise interest rates to cool things down.

3. **Contraction/Recession:** Growth slows or turns negative. Unemployment rises. Businesses reduce hiring and investment. Consumer spending falls. A recession is technically two consecutive quarters of negative GDP growth. Pakistan contracted in FY2023 (-0.2% GDP growth).

4. **Trough:** The lowest point. Output and employment are at minimum. But this sets the stage for recovery — assets are cheap, interest rates are cut, and the cycle begins again.`,
      ur: `**اقتصادی چکر کے چار مراحل:**

1. **پھیلاؤ:** GDP ترقی مثبت اور بڑھتی ہوئی ہے۔ بیروزگاری کم ہوتی ہے۔ کاروبار سرمایہ کاری اور بھرتی کرتے ہیں۔

2. **عروج:** معیشت زیادہ سے زیادہ پیداوار تک پہنچتی ہے۔ مہنگائی بڑھتی ہے۔ مرکزی بینک شرحیں بڑھاتے ہیں۔

3. **سکڑاؤ/کساد:** ترقی سست یا منفی ہو جاتی ہے۔ بیروزگاری بڑھتی ہے۔ پاکستان FY2023 میں سکڑا (-0.2%)۔

4. **نادر:** سب سے نچلا مقام۔ یہ بحالی کا مرحلہ طے کرتا ہے۔`,
      rm: `**Iqtisadi chakkar ke chaar maraahil:**

1. **Phailaao:** GDP taraqqi musbat aur barhti hui hai. Berozgaari kam hoti hai. Karobar sarmaaya kaari aur bharti karte hain.

2. **Uroooj:** Muaashat zyada se zyada paidawar tak pahunchti hai. Mahangaai barhti hai. Markazi bank sharayein barhate hain.

3. **Sikuraao/Kasaad:** Taraqqi sust ya manfi ho jaati hai. Berozgaari barhti hai. Pakistan FY2023 mein sikura (-0.2%).

4. **Naadir:** Sab se nichla muqaam. Yeh bahali ka marhala tay karta hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Recessions are always catastrophic.** Mild recessions are normal and can correct imbalances (asset bubbles, excess debt). Pakistan's FY2023 contraction, though painful, was partly needed to reset an overheated economy.

**Myth 2: Governments can eliminate cycles.** Policy can smooth cycles but not eliminate them. Global shocks (COVID, oil price spikes, financial crises) hit all economies regardless of domestic policy.

**Myth 3: If growth is positive, everything is fine.** GDP of 2% while population grows at 2.5% means per-capita income is falling — people are getting poorer on average even with positive overall growth. Pakistan has often been in this trap.`,
      ur: `**غلط فہمی 1: کساد ہمیشہ تباہ کن ہوتا ہے۔** ہلکا کساد معمول کا ہے اور عدم توازن درست کر سکتا ہے۔

**غلط فہمی 2: حکومتیں چکروں کو ختم کر سکتی ہیں۔** پالیسی چکروں کو ہموار کر سکتی ہے لیکن ختم نہیں۔

**غلط فہمی 3: اگر ترقی مثبت ہے، سب ٹھیک ہے۔** 2% GDP ترقی جب آبادی 2.5% بڑھ رہی ہو تو فی کس آمدنی گر رہی ہے۔`,
      rm: `**Ghalat fehmi 1: Kasaad hamesha tabah kun hota hai.** Halka kasaad mamool ka hai aur adam-tawazun durust kar sakta hai.

**Ghalat fehmi 2: Hukoomaten chakkaron ko khatam kar sakti hain.** Policy chakkaron ko hamwaar kar sakti hai lekin khatam nahi.

**Ghalat fehmi 3: Agar taraqqi musbat hai, sab theek hai.** 2% GDP taraqqi jab abaadi 2.5% barh rahi ho toh fi kass aamdani gir rahi hai.`,
    },
    pakistanExample: {
      en: `**Pakistan's growth cycles:** Pakistan experienced a strong expansion from FY2015-18 (CPEC investment surge, growth hitting 5.5%). This was followed by a painful adjustment in FY2019 (IMF programme, growth falling to 1.9%) and COVID contraction in FY2020 (-0.5%). A rapid recovery in FY2021-22 (6%) led to overheating — a current account deficit surge, rising inflation, and political instability — causing the painful FY2023 contraction (-0.2%). By FY2024, the cycle turned again (2.4% growth). Pakistan's cycles are unusually volatile due to heavy reliance on external financing, commodity price sensitivity, and political disruptions.`,
      ur: `**پاکستان کے ترقی کے چکر:** پاکستان نے FY2015-18 میں مضبوط پھیلاؤ دیکھا (CPEC سرمایہ کاری)۔ FY2019 میں تکلیف دہ ایڈجسٹمنٹ۔ FY2020 COVID کساد (-0.5%)۔ FY2021-22 میں تیز بحالی (6%) جو حدت کا باعث بنی۔ FY2023 میں سکڑاؤ (-0.2%)۔`,
      rm: `**Pakistan ke taraqqi ke chakkar:** Pakistan ne FY2015-18 mein mazboot phailaao dekha (CPEC sarmaaya kaari). FY2019 mein takleef deh adjustment. FY2020 COVID kasaad (-0.5%). FY2021-22 mein tez bahali (6%) jo hardat ka baais bani. FY2023 mein sikuraao (-0.2%).`,
    },
    realWorld: {
      en: "The 2008-09 Global Financial Crisis was the most severe recession since the Great Depression. US GDP fell 4.3%, unemployment hit 10%, and the shock spread globally through trade and financial linkages. Pakistan felt it through falling remittances and export demand but was partially insulated by its limited financial integration. This shows both the interconnectedness of cycles and the role of financial system exposure.",
      ur: "2008-09 عالمی مالیاتی بحران عظیم کساد کے بعد سب سے شدید کساد بازاری تھی۔ امریکی GDP 4.3% گری، بیروزگاری 10% تک پہنچی، اور جھٹکا تجارت کے ذریعے عالمی سطح پر پھیلا۔",
      rm: "2008-09 aalami maaliyaati bohran azeem kasaad ke baad sab se shadeed kasaad baazaari thi. Amriki GDP 4.3% giri, berozgaari 10% tak pahunchi, aur jhatka tijarat ke zariye aalami satah par phaila.",
    },
    summary: {
      en: "• Economic cycle phases: expansion → peak → contraction → trough → repeat\n• Driven by: investment, consumer confidence, credit conditions, global shocks\n• Expansion: growth, falling unemployment, rising inflation\n• Recession: 2+ quarters of negative GDP growth\n• Policy tools: fiscal (spending/taxes) and monetary (interest rates) to smooth cycles\n• Pakistan's cycles are volatile due to external financing dependence and weather sensitivity",
      ur: "• اقتصادی چکر کے مراحل: پھیلاؤ → عروج → سکڑاؤ → نادر → دہرائیں\n• محرکات: سرمایہ کاری، صارف اعتماد، کریڈٹ حالات، عالمی جھٹکے\n• پھیلاؤ: ترقی، کم بیروزگاری، بڑھتی مہنگائی\n• کساد بازاری: 2+ سہ ماہی منفی GDP ترقی\n• پاکستان کے چکر بیرونی فنانسنگ انحصار کی وجہ سے غیر مستحکم ہیں",
      rm: "• Iqtisadi chakkar ke maraahil: phailaao → uroooj → sikuraao → naadir → dohraaein\n• Muhirrikaat: sarmaaya kaari, sarfeen aitemaad, credit haalaat, aalami jhatke\n• Phailaao: taraqqi, kam berozgaari, barhti mahangaai\n• Kasaad baazaari: 2+ sihmahi manfi GDP taraqqi\n• Pakistan ke chakkar baeruni financing inhisaar ki wajah se ghair mustahkam hain",
    },
  },
  quiz: [
    {
      question: { en: "In which phase of the economic cycle does unemployment typically fall?", ur: "اقتصادی چکر کے کس مرحلے میں بیروزگاری عام طور پر کم ہوتی ہے؟", rm: "Iqtisadi chakkar ke kis marhale mein berozgaari aam tor par kam hoti hai?" },
      options: [
        { en: "Recession", ur: "کساد بازاری", rm: "Kasaad baazaari" },
        { en: "Trough", ur: "نادر", rm: "Naadir" },
        { en: "Expansion", ur: "پھیلاؤ", rm: "Phailaao" },
        { en: "Contraction", ur: "سکڑاؤ", rm: "Sikuraao" },
      ],
      correctIndex: 2,
      explanation: { en: "During expansion, businesses grow, invest, and hire more workers — so unemployment falls. The opposite happens during contraction.", ur: "پھیلاؤ کے دوران، کاروبار بڑھتے، سرمایہ کاری کرتے اور زیادہ کارکن بھرتی کرتے ہیں — اس لیے بیروزگاری کم ہوتی ہے۔", rm: "Phailaao ke dauraan, karobar barhte, sarmaaya kaari karte aur zyada kaarkin bharti karte hain — is liye berozgaari kam hoti hai." },
    },
    {
      question: { en: "What is the technical definition of a recession?", ur: "کساد بازاری کی تکنیکی تعریف کیا ہے؟", rm: "Kasaad baazaari ki takneeki tareef kya hai?" },
      options: [
        { en: "One quarter of negative GDP growth", ur: "منفی GDP ترقی کی ایک سہ ماہی", rm: "Manfi GDP taraqqi ki ek sihmahi" },
        { en: "Two consecutive quarters of negative GDP growth", ur: "منفی GDP ترقی کی دو مسلسل سہ ماہیاں", rm: "Manfi GDP taraqqi ki do musalsal sih mahiyan" },
        { en: "Unemployment above 10%", ur: "10% سے زیادہ بیروزگاری", rm: "10% se zyada berozgaari" },
        { en: "Inflation above 5%", ur: "5% سے زیادہ مہنگائی", rm: "5% se zyada mahangaai" },
      ],
      correctIndex: 1,
      explanation: { en: "A recession is technically defined as two consecutive quarters of negative GDP growth — though economists also look at unemployment, industrial output, and other indicators.", ur: "کساد بازاری کو تکنیکی طور پر منفی GDP ترقی کی دو مسلسل سہ ماہیوں کے طور پر بیان کیا جاتا ہے۔", rm: "Kasaad baazaari ko takneeki tor par manfi GDP taraqqi ki do musalsal sih mahiyon ke tor par bayaan kiya jaata hai." },
    },
    {
      question: { en: "Pakistan's GDP grew by 6% in FY2022 but the economy was overheating. Which phase was this?", ur: "FY2022 میں پاکستان کا GDP 6% بڑھا لیکن معیشت زیادہ گرم ہو رہی تھی۔ یہ کون سا مرحلہ تھا؟", rm: "FY2022 mein Pakistan ka GDP 6% barha lekin muaashat zyada garm ho rahi thi. Yeh kaun sa marhala tha?" },
      options: [
        { en: "Trough", ur: "نادر", rm: "Naadir" },
        { en: "Contraction", ur: "سکڑاؤ", rm: "Sikuraao" },
        { en: "Near peak / late expansion", ur: "عروج کے قریب / دیر سے پھیلاؤ", rm: "Uroooj ke qareeb / der se phailaao" },
        { en: "Recession", ur: "کساد بازاری", rm: "Kasaad baazaari" },
      ],
      correctIndex: 2,
      explanation: { en: "Strong growth (6%) with rising inflation and current account deficit signals a near-peak or late expansion — the economy is growing fast but building up imbalances that will cause a correction.", ur: "مضبوط ترقی (6%) بڑھتی مہنگائی اور جاری کھاتے کے خسارے کے ساتھ عروج کے قریب یا دیر سے پھیلاؤ کا اشارہ دیتی ہے۔", rm: "Mazboot taraqqi (6%) barhti mahangaai aur jaari khaate ke khisaare ke saath uroooj ke qareeb ya der se phailaao ka ishara deti hai." },
    },
    {
      question: { en: "Why can't governments completely eliminate economic cycles?", ur: "حکومتیں اقتصادی چکروں کو مکمل طور پر کیوں ختم نہیں کر سکتیں؟", rm: "Hukoomaten iqtisadi chakkaron ko mukammal tor par kyun khatam nahi kar saktin?" },
      options: [
        { en: "They don't want to", ur: "وہ نہیں چاہتیں", rm: "Woh nahi chahtin" },
        { en: "Global shocks, private sector behaviour, and psychology are beyond full control", ur: "عالمی جھٹکے، نجی شعبے کا رویہ اور نفسیات مکمل کنٹرول سے باہر ہیں", rm: "Aalami jhatke, niji shaabay ka rawiya aur nafsiyaat mukammal control se baahar hain" },
        { en: "They only affect small economies", ur: "وہ صرف چھوٹی معیشتوں کو متاثر کرتے ہیں", rm: "Woh sirf chhoti muaashaton ko mutaassir karte hain" },
        { en: "Cycles repeat exactly every 10 years", ur: "چکر بالکل ہر 10 سال بعد دہرائے جاتے ہیں", rm: "Chakkar bilkul har 10 saal baad dohraaey jaate hain" },
      ],
      correctIndex: 1,
      explanation: { en: "External shocks (COVID, oil crises, global financial crises), unpredictable private sector decisions, and human psychology (confidence swings) mean cycles can never be fully eliminated — only managed.", ur: "بیرونی جھٹکے (COVID، تیل کے بحران)، نجی شعبے کے غیر متوقع فیصلے، اور انسانی نفسیات کا مطلب ہے کہ چکر کبھی مکمل طور پر ختم نہیں کیے جا سکتے۔", rm: "Baeruni jhatke (COVID, tel ke bohran), niji shaabay ke ghair mutawaqqa faisle, aur insaani nafsiyaat ka matlab hai ke chakkar kabhi mukammal tor par khatam nahi kiye ja sakte." },
    },
  ],
  faq: [
    {
      question: { en: "How long do economic cycles typically last?", ur: "اقتصادی چکر عام طور پر کتنے عرصے تک رہتے ہیں؟", rm: "Iqtisadi chakkar aam tor par kitne arse tak rahte hain?" },
      answer: { en: "There's no fixed length. Expansions have lasted as long as 10+ years (the US had a 128-month expansion from 2009 to 2020). Recessions tend to be shorter — the 2020 COVID recession lasted only 2 months in the US (though the economic damage persisted longer). Pakistan's cycles have been relatively short — about 4-7 years — due to its reliance on external financing that tends to run out quickly.", ur: "کوئی مقررہ لمبائی نہیں ہے۔ پھیلاؤ 10+ سال تک چل سکتا ہے۔ کساد بازاری عام طور پر مختصر ہوتی ہے۔ پاکستان کے چکر 4-7 سال کے ہوتے ہیں۔", rm: "Koi muqarrara lambaai nahi hai. Phailaao 10+ saal tak chal sakta hai. Kasaad baazaari aam tor par mukhtasar hoti hai. Pakistan ke chakkar 4-7 saal ke hote hain." },
    },
    {
      question: { en: "Does Pakistan have leading indicators that predict its economic cycle?", ur: "کیا پاکستان کے پاس اپنے اقتصادی چکر کی پیش گوئی کرنے والے پیش رو اشاریے ہیں؟", rm: "Kya Pakistan ke paas apne iqtisadi chakkar ki peshgoi karne wale pesh ro ashaariye hain?" },
      answer: { en: "Yes — Large-Scale Manufacturing (LSM) index, Karachi Stock Exchange performance, cement and steel dispatches, and SBP's credit data all give early signals. LSM tends to peak before GDP does and trough before GDP recovers. PBS publishes monthly LSM data, making it one of Pakistan's most watched economic cycle indicators.", ur: "ہاں — بڑے پیمانے کی مینوفیکچرنگ (LSM) انڈیکس، کراچی اسٹاک ایکسچینج کارکردگی، سیمنٹ اور اسٹیل کی ترسیل، اور SBP کا کریڈٹ ڈیٹا ابتدائی اشارے دیتے ہیں۔", rm: "Haan — Bare Paimane ki Manufacturing (LSM) index, Karachi Stock Exchange kaarkardagi, cement aur steel ki tarseel, aur SBP ka credit data ibtidaai ishaare dete hain." },
    },
  ],
};
