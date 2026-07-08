import type { Lesson } from "@/lib/academy/types";

export const povertyAndInequalityLesson: Lesson = {
  slug: "poverty-and-inequality",
  category: "beginner",
  title: { en: "Poverty and Inequality", ur: "غربت اور عدم مساوات", rm: "Ghurbat aur Adam-Musaawaat" },
  subtitle: {
    en: "Understanding why people are poor, how inequality is measured, and what Pakistan's data reveals",
    ur: "یہ سمجھنا کہ لوگ غریب کیوں ہیں، عدم مساوات کیسے ناپی جاتی ہے، اور پاکستان کا ڈیٹا کیا ظاہر کرتا ہے",
    rm: "Yeh samajhna ke log ghareeb kyun hain, adam-musaawaat kaise naapi jaati hai, aur Pakistan ka data kya zaahir karta hai",
  },
  level: "beginner",
  readMinutes: 7,
  isPremium: false,
  relatedIndicatorSlugs: [],
  relatedLessonSlugs: ["economic-growth-basics", "gdp", "unemployment-basics"],
  content: {
    overview: {
      en: "Poverty means lacking the resources to meet basic needs — food, shelter, healthcare, education. Inequality measures how unevenly income or wealth is distributed across society. A country can grow economically while inequality rises — GDP going up but the rich capturing most gains. Pakistan has around 35-40% of its population below the poverty line (using the $3.65/day lower-middle-income threshold), with significant variation between urban and rural areas.",
      ur: "غربت کا مطلب بنیادی ضروریات پوری کرنے کے لیے وسائل کی کمی ہے — خوراک، رہائش، صحت، تعلیم۔ عدم مساوات یہ ناپتا ہے کہ معاشرے میں آمدنی یا دولت کتنی غیر مساوی طور پر تقسیم ہے۔ پاکستان میں تقریباً 35-40% آبادی غربت کی لکیر سے نیچے ہے۔",
      rm: "Ghurbat ka matlab bunyaadi zarooriyaat poori karne ke liye wasail ki kami hai — khuuraak, rahaayish, sehat, taaleem. Adam-musaawaat yeh naapata hai ke muaashare mein aamdani ya dawlat kitni ghair musaawi tor par taqseem hai. Pakistan mein taqreeban 35-40% abaadi ghurbat ki lakeer se neeche hai.",
    },
    whyItMatters: {
      en: "High poverty and inequality are not just moral issues — they have economic consequences. Unequal societies have lower social mobility, weaker consumer demand, higher crime rates, and more political instability. Pakistan's poverty figures affect everything from IMF programme design to education enrolment rates. Understanding measurement also matters: different poverty lines tell different stories.",
      ur: "زیادہ غربت اور عدم مساوات صرف اخلاقی مسائل نہیں — ان کے اقتصادی نتائج ہیں۔ غیر مساوی معاشروں میں سماجی نقل و حرکت کم، صارف طلب کمزور، جرائم اور سیاسی عدم استحکام زیادہ ہوتا ہے۔",
      rm: "Zyada ghurbat aur adam-musaawaat sirf akhlaqi masaail nahi — in ke iqtisadi nataij hain. Ghair musaawi muaasharon mein samaji naql-o-harkat kam, sarfeen talab kamzor, jaraayim aur siyaasi adam-istihkaam zyada hota hai.",
    },
    explanation: {
      en: `**Measuring poverty:**
- **Absolute poverty line:** A fixed threshold below which someone is poor. World Bank uses $2.15/day (extreme poverty) and $3.65/day (lower-middle-income line). Pakistan uses its own national poverty line.
- **Relative poverty:** Below a fraction of median income (used in Europe). Useful for measuring inequality within rich countries.
- **Multidimensional Poverty Index (MPI):** Combines education, health, and living standards — captures deprivation beyond just income. Pakistan's MPI is used by UNDP and shows 38%+ are multidimensionally poor.

**Measuring inequality:**
- **Gini coefficient:** 0 = perfect equality; 1 = one person has everything. Pakistan's Gini is ~0.30-0.33 (moderate by global standards, but understated due to poor data on top incomes).
- **Income share of top 10% vs bottom 40%:** In Pakistan, the top 20% earns about 5x the bottom 20%.

**Causes of Pakistan's poverty:**
1. Low education quality and access
2. Limited formal employment
3. Agricultural dependence in rural areas (climate-vulnerable)
4. Large household sizes (fertility rate ~3.4)
5. Weak social safety nets`,
      ur: `**غربت ناپنا:**
- **مطلق غربت کی لکیر:** عالمی بینک $2.15/دن (شدید) اور $3.65/دن استعمال کرتا ہے۔
- **کثیر جہتی غربت انڈیکس (MPI):** تعلیم، صحت، اور معیار زندگی کو یکجا کرتا ہے۔ پاکستان کی MPI 38%+ دکھاتی ہے۔

**عدم مساوات ناپنا:**
- **جینی گنانک:** 0 = کامل مساوات؛ 1 = ایک شخص کے پاس سب کچھ۔ پاکستان ~0.30-0.33۔

**پاکستان کی غربت کی وجوہات:**
1. کمزور تعلیم
2. محدود رسمی ملازمت
3. دیہاتی علاقوں میں زراعتی انحصار
4. بڑے خاندان (زرخیزی کی شرح ~3.4)
5. کمزور سماجی حفاظتی جال`,
      rm: `**Ghurbat naapna:**
- **Mutlaq ghurbat ki lakeer:** Aalami bank $2.15/din (shadeed) aur $3.65/din istemal karta hai.
- **Kaseer-Jehti Ghurbat Index (MPI):** Taaleem, sehat, aur miyaar-e-zindagi ko yakja karta hai. Pakistan ki MPI 38%+ dikhati hai.

**Adam-musaawaat naapna:**
- **Gini Ginank:** 0 = kaamil musaawaat; 1 = ek shakhs ke paas sab kuch. Pakistan ~0.30-0.33.

**Pakistan ki ghurbat ki wajohaat:**
1. Kamzor taaleem
2. Mahdood rasmi mulazmat
3. Dehaati ilaakon mein zaraayi inhisaar
4. Bare khaandaan (zarkhezi ki shar ~3.4)
5. Kamzor samaji hifaazati jaal`,
    },
    misconceptions: {
      en: `**Myth 1: Economic growth automatically reduces poverty.** If growth is concentrated at the top, the poor may not benefit. 'Trickle-down' economics has poor empirical support. Redistributive policies (education, social protection) are needed alongside growth.

**Myth 2: Pakistan's poor are lazy.** Structural barriers — lack of education access, geographic isolation, discrimination, limited credit — trap people in poverty regardless of effort. Breaking structural poverty requires structural solutions.

**Myth 3: Zakat eliminates poverty in a Muslim society.** Pakistan collects and distributes zakat, but the amounts are far insufficient to address structural poverty at scale. The Benazir Income Support Programme (BISP) is Pakistan's main social safety net.`,
      ur: `**غلط فہمی 1: اقتصادی ترقی خودبخود غربت کم کرتی ہے۔** اگر ترقی اوپر مرتکز ہو تو غریبوں کو فائدہ نہیں ہوتا۔ دوبارہ تقسیمی پالیسیاں ضروری ہیں۔

**غلط فہمی 2: پاکستان کے غریب سست ہیں۔** ساختی رکاوٹیں لوگوں کو محنت کے باوجود غربت میں پھنساتی ہیں۔

**غلط فہمی 3: زکوٰة مسلمان معاشرے میں غربت ختم کرتی ہے۔** BISP پاکستان کا اہم سماجی حفاظتی جال ہے۔`,
      rm: `**Ghalat fehmi 1: Iqtisadi taraqqi khud-ba-khud ghurbat kam karti hai.** Agar taraqqi oopar mumarkkaz ho toh ghareeboon ko faayda nahi hota. Dobaara taqseemi polisiyan zaroori hain.

**Ghalat fehmi 2: Pakistan ke ghareeb sust hain.** Saakhti rukaavatein logon ko mehnat ke baawajood ghurbat mein phansti hain.

**Ghalat fehmi 3: Zakaat Musalman muaashare mein ghurbat khatam karti hai.** BISP Pakistan ka ahem samaji hifaazati jaal hai.`,
    },
    pakistanExample: {
      en: `**BISP — Pakistan's social safety net:** The Benazir Income Support Programme provides cash transfers to Pakistan's poorest households. In FY2024, BISP covered about 9 million families (~50 million people) with quarterly cash payments of Rs 8,500 per family. It uses a poverty scorecard to target beneficiaries. While BISP is Pakistan's largest social protection programme, its coverage and payments remain insufficient for meaningful poverty reduction. The Ehsaas programme expanded its scope under various governments.`,
      ur: `**BISP — پاکستان کا سماجی حفاظتی جال:** بے نظیر انکم سپورٹ پروگرام پاکستان کے غریب ترین گھرانوں کو نقد منتقلی فراہم کرتا ہے۔ FY2024 میں BISP نے تقریباً 90 لاکھ خاندانوں (~50 کروڑ لوگ) کو سہ ماہی 8,500 روپے کی ادائیگیوں سے احاطہ کیا۔`,
      rm: `**BISP — Pakistan ka samaji hifaazati jaal:** Benazir Income Support Programme Pakistan ke ghareeb tareen gharaanon ko naqd muntaqili faraahim karta hai. FY2024 mein BISP ne taqreeban 90 laakh khaandanon (~50 crore log) ko sihmahi 8,500 rupay ki adaaigion se ahata kiya.`,
    },
    realWorld: {
      en: "Brazil's Bolsa Família programme (launched 2003) became a global model for conditional cash transfers to poor families — providing money conditional on children attending school and getting vaccinations. It lifted 30 million Brazilians out of extreme poverty. Pakistan's BISP was partly modelled on this approach. The lesson: targeted cash transfers, when well-administered, are among the most cost-effective poverty reduction tools.",
      ur: "برازیل کا بولسا فیملیا پروگرام (2003) مشروط نقد منتقلی کا عالمی ماڈل بن گیا — بچوں کی اسکول حاضری اور ویکسینیشن کی شرط پر پیسے فراہم کرنا۔ اس نے 3 کروڑ برازیلیوں کو شدید غربت سے نکالا۔ پاکستان کا BISP اس نقطہ نظر پر جزوی طور پر ماڈل کیا گیا۔",
      rm: "Brazil ka Bolsa Família programme (2003) mashroot naqd muntaqili ka aalami model ban gaya — bachon ki iskool haaziri aur vaccination ki shart par paise faraahim karna. Is ne 3 crore Braziliyon ko shadeed ghurbat se nikaala. Pakistan ka BISP is nuqta-e-nazar par juzwi tor par model kiya gaya.",
    },
    summary: {
      en: "• Poverty = lacking resources for basic needs; can be absolute or relative\n• Pakistan: ~35-40% below $3.65/day; 38%+ multidimensionally poor (MPI)\n• Gini coefficient measures inequality: Pakistan ~0.30-0.33\n• Causes: weak education, limited formal jobs, large families, rural agriculture\n• Growth alone isn't enough — distribution policies matter\n• BISP is Pakistan's main cash transfer programme for the poorest",
      ur: "• غربت = بنیادی ضروریات کے لیے وسائل کی کمی؛ مطلق یا نسبی ہو سکتی ہے\n• پاکستان: ~35-40% $3.65/دن سے نیچے؛ 38%+ کثیر جہتی غریب\n• جینی گنانک عدم مساوات ناپتا ہے: پاکستان ~0.30-0.33\n• اسباب: کمزور تعلیم، محدود رسمی ملازمتیں، بڑے خاندان\n• تنہا ترقی کافی نہیں — تقسیمی پالیسیاں اہم ہیں\n• BISP پاکستان کا مرکزی نقد منتقلی پروگرام ہے",
      rm: "• Ghurbat = bunyaadi zarooriyaat ke liye wasail ki kami; mutlaq ya nisbati ho sakti hai\n• Pakistan: ~35-40% $3.65/din se neeche; 38%+ kaseer-jehti ghareeb\n• Gini ginank adam-musaawaat naapata hai: Pakistan ~0.30-0.33\n• Asbaab: kamzor taaleem, mahdood rasmi mulazmatein, bare khaandaan\n• Tanhaaa taraqqi kaafi nahi — taqseemi polisiyan ahem hain\n• BISP Pakistan ka markazi naqd muntaqili programme hai",
    },
  },
  quiz: [
    {
      question: { en: "What does the Gini coefficient measure?", ur: "جینی گنانک کیا ناپتا ہے؟", rm: "Gini ginank kya naapata hai?" },
      options: [
        { en: "Total GDP of a country", ur: "ملک کی کل GDP", rm: "Mulk ki kul GDP" },
        { en: "Income or wealth inequality (0 = equal, 1 = completely unequal)", ur: "آمدنی یا دولت کی عدم مساوات (0 = مساوی، 1 = مکمل طور پر غیر مساوی)", rm: "Aamdani ya dawlat ki adam-musaawaat (0 = musaawi, 1 = mukammal tor par ghair musaawi)" },
        { en: "Level of poverty in a country", ur: "ملک میں غربت کی سطح", rm: "Mulk mein ghurbat ki satah" },
        { en: "Economic growth rate", ur: "اقتصادی ترقی کی شرح", rm: "Iqtisadi taraqqi ki shar" },
      ],
      correctIndex: 1,
      explanation: { en: "The Gini coefficient ranges from 0 (everyone has equal income) to 1 (one person has all income). Pakistan's ~0.30-0.33 Gini is relatively moderate, though it may understate true inequality due to poor measurement of top incomes.", ur: "جینی گنانک 0 (سب کی آمدنی برابر) سے 1 (ایک شخص کے پاس سب آمدنی) تک ہوتا ہے۔ پاکستان کا ~0.30-0.33 نسبتاً اعتدال پسند ہے۔", rm: "Gini ginank 0 (sab ki aamdani barabar) se 1 (ek shakhs ke paas sab aamdani) tak hota hai. Pakistan ka ~0.30-0.33 nisbatan itadaal pasand hai." },
    },
    {
      question: { en: "Pakistan's real GDP grew 5% in a year, but only the wealthiest 10% saw income gains. What happened to inequality?", ur: "پاکستان کا حقیقی GDP ایک سال میں 5% بڑھا، لیکن صرف امیر ترین 10% کو آمدنی میں فوائد ہوئے۔ عدم مساوات کا کیا ہوا؟", rm: "Pakistan ka haqeeqi GDP ek saal mein 5% barha, lekin sirf ameer tareen 10% ko aamdani mein fawaaید hue. Adam-musaawaat ka kya hua?" },
      options: [
        { en: "Inequality decreased", ur: "عدم مساوات کم ہوئی", rm: "Adam-musaawaat kam hui" },
        { en: "Inequality increased despite GDP growth", ur: "GDP ترقی کے باوجود عدم مساوات بڑھی", rm: "GDP taraqqi ke baawajood adam-musaawaat barhi" },
        { en: "Poverty was eliminated", ur: "غربت ختم ہو گئی", rm: "Ghurbat khatam ho gayi" },
        { en: "No change — GDP growth always distributes equally", ur: "کوئی تبدیلی نہیں — GDP ترقی ہمیشہ مساوی طور پر تقسیم ہوتی ہے", rm: "Koi tabdeeli nahi — GDP taraqqi hamesha musaawi tor par taqseem hoti hai" },
      ],
      correctIndex: 1,
      explanation: { en: "If growth benefits only the rich, inequality worsens even as overall GDP rises. This is why measuring both GDP growth AND distribution matters — 'inclusive growth' requires the poor to benefit too.", ur: "اگر ترقی صرف امیروں کو فائدہ دے، تو مجموعی GDP بڑھنے کے باوجود عدم مساوات بدتر ہوتی ہے۔ اس لیے GDP ترقی اور تقسیم دونوں ناپنا ضروری ہے۔", rm: "Agar taraqqi sirf ameron ko faayda de, toh majmooee GDP barhne ke baawajood adam-musaawaat badtar hoti hai. Is liye GDP taraqqi aur taqseem dono naapna zaroori hai." },
    },
    {
      question: { en: "What is the Benazir Income Support Programme (BISP)?", ur: "بے نظیر انکم سپورٹ پروگرام (BISP) کیا ہے؟", rm: "Benazir Income Support Programme (BISP) kya hai?" },
      options: [
        { en: "A microfinance institution", ur: "ایک مائیکرو فنانس ادارہ", rm: "Ek microfinance idaara" },
        { en: "Pakistan's main cash transfer programme for low-income families", ur: "پاکستان کا کم آمدنی والے خاندانوں کے لیے مرکزی نقد منتقلی پروگرام", rm: "Pakistan ka kam aamdani wale khaandanon ke liye markazi naqd muntaqili programme" },
        { en: "A government employment scheme", ur: "ایک حکومتی روزگار سکیم", rm: "Ek hukomaati rozgaar scheme" },
        { en: "An education scholarship programme", ur: "ایک تعلیمی وظیفہ پروگرام", rm: "Ek taaleemi wazeefa programme" },
      ],
      correctIndex: 1,
      explanation: { en: "BISP provides quarterly cash transfers to Pakistan's poorest families (about 9 million households). Beneficiaries are selected using a poverty scorecard. It's the foundation of Pakistan's social protection system.", ur: "BISP پاکستان کے غریب ترین خاندانوں (تقریباً 90 لاکھ گھرانوں) کو سہ ماہی نقد منتقلی فراہم کرتا ہے۔ فائدہ اٹھانے والے غربت کے اسکور کارڈ سے منتخب ہوتے ہیں۔", rm: "BISP Pakistan ke ghareeb tareen khaandanon (taqreeban 90 laakh gharaanon) ko sihmahi naqd muntaqili faraahim karta hai. Faayda uthane wale ghurbat ke score card se muntakhab hote hain." },
    },
    {
      question: { en: "Which factor best explains high rural poverty in Pakistan?", ur: "پاکستان میں دیہی غربت کی بہتر وضاحت کرنے والا عامل کون سا ہے؟", rm: "Pakistan mein dehaati ghurbat ki behtar wazaahat karne wala aamil kaun sa hai?" },
      options: [
        { en: "Rural areas have better infrastructure than cities", ur: "دیہی علاقوں میں شہروں سے بہتر بنیادی ڈھانچہ ہے", rm: "Dehaati ilaakon mein shehron se behtar bunyaadi dhaancha hai" },
        { en: "Dependence on climate-volatile agriculture, limited formal jobs, weak services", ur: "آب و ہوا کے لحاظ سے غیر مستحکم زراعت پر انحصار، محدود رسمی ملازمتیں، کمزور خدمات", rm: "Aab-o-hawa ke lihaaz se ghair mustahkam ziraat par inhisaar, mahdood rasmi mulazmatein, kamzor khadamaat" },
        { en: "Rural Pakistanis choose to be poor", ur: "دیہی پاکستانی غریب رہنا چاہتے ہیں", rm: "Dehaati Pakistani ghareeb rahna chahte hain" },
        { en: "Cities have too many migrants", ur: "شہروں میں بہت زیادہ تارکین وطن ہیں", rm: "Shehron mein bahut zyada tarkeen watan hain" },
      ],
      correctIndex: 1,
      explanation: { en: "Rural poverty in Pakistan is structural: most rural families depend on agriculture (vulnerable to floods, droughts, price volatility), have limited access to formal employment, receive poor-quality schools and hospitals, and have large families. These structural factors — not individual choices — drive rural poverty.", ur: "پاکستان میں دیہی غربت ساختی ہے: زیادہ تر دیہی خاندان زراعت پر انحصار کرتے ہیں (سیلاب، خشک سالی کا خطرہ)، رسمی ملازمت تک محدود رسائی ہے، خراب معیار کے اسکول اور ہسپتال ملتے ہیں۔", rm: "Pakistan mein dehaati ghurbat saakhti hai: zyada tar dehaati khaandaan ziraat par inhisaar karte hain (sailaab, khushk saali ka khatara), rasmi mulazmat tak mahdood rasaai hai, kharaab miyaar ke iskool aur haspraal milte hain." },
    },
  ],
  faq: [
    {
      question: { en: "Has Pakistan made progress on poverty in recent decades?", ur: "حالیہ دہائیوں میں غربت پر پاکستان نے ترقی کی ہے؟", rm: "Haaliya dahaayon mein ghurbat par Pakistan ne taraqqi ki hai?" },
      answer: { en: "Yes — Pakistan's poverty headcount fell significantly from the 1990s to 2018 (from ~50%+ to ~25% at the national poverty line). But progress reversed sharply with the 2022-23 economic crisis: with 38% inflation, many households near the poverty line were pushed back below it. As of 2023, World Bank estimates suggest 35-40% of Pakistanis live below the lower-middle-income poverty line. Sustaining poverty reduction requires sustained economic growth and inflation control.", ur: "ہاں — پاکستان کی غربت کی شرح 1990s سے 2018 تک نمایاں طور پر گری (50%+ سے ~25% قومی غربت کی لکیر پر)۔ لیکن 2022-23 اقتصادی بحران سے پیش رفت تیزی سے پلٹ گئی: 38% مہنگائی سے بہت سے گھرانے واپس غربت میں چلے گئے۔", rm: "Haan — Pakistan ki ghurbat ki shar 1990s se 2018 tak numayaan tor par giri (50%+ se ~25% qoumi ghurbat ki lakeer par). Lekin 2022-23 iqtisadi bohran se pesh rraft tezi se palat gayi: 38% mahangaai se bahut se gharaane waapis ghurbat mein chale gaye." },
    },
  ],
};
