import type { Lesson } from "@/lib/academy/types";

export const globalisationBasicsLesson: Lesson = {
  slug: "globalisation-basics",
  category: "beginner",
  title: { en: "Globalisation: Opportunities and Risks", ur: "عالمگیریت: مواقع اور خطرات", rm: "Aalam-Geeri: Mawaaqey aur Khataraat" },
  subtitle: {
    en: "How the world economy became interconnected and what that means for Pakistan",
    ur: "عالمی معیشت آپس میں کیسے مربوط ہوئی اور پاکستان کے لیے اس کا کیا مطلب ہے",
    rm: "Aalami muaashat aapas mein kaise marbut hui aur Pakistan ke liye is ka kya matlab hai",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["trade-balance-pakistan", "remittances-pakistan"],
  relatedLessonSlugs: ["trade-basics", "comparative-advantage", "exchange-rates-basics"],
  content: {
    overview: {
      en: "Globalisation is the increasing integration of the world's economies through trade, investment, migration, and technology. It has lifted hundreds of millions out of poverty in China, Vietnam, and Bangladesh. For Pakistan, globalisation is both opportunity (remittances, export markets, technology) and risk (global commodity price shocks, capital flow volatility, competition from cheaper producers).",
      ur: "عالمگیریت تجارت، سرمایہ کاری، نقل مکانی اور ٹیکنالوجی کے ذریعے دنیا کی معیشتوں کا بڑھتا ہوا انضمام ہے۔ یہ چین، ویتنام اور بنگلہ دیش میں کروڑوں کو غربت سے نکالا ہے۔ پاکستان کے لیے، عالمگیریت مواقع اور خطرات دونوں ہے۔",
      rm: "Aalam-geeri tijarat, sarmaaya kaari, naql-e-makaani aur technology ke zariye duniya ki muaashaton ka barhta hua inzimaam hai. Yeh China, Vietnam aur Bangladesh mein kroron ko ghurbat se nikaala hai. Pakistan ke liye, aalam-geeri mawaaqey aur khataraat dono hai.",
    },
    whyItMatters: {
      en: "Global wheat price spikes (like 2022 post-Ukraine war) immediately hit Pakistan's food costs — because Pakistan imports wheat during shortages. When global oil prices doubled in 2021-22, Pakistan's import bill ballooned — a key cause of the currency crisis. Pakistan's textile exports depend on US and EU consumer demand. Overseas Pakistani workers sending $27 billion in remittances annually are Pakistan's largest source of foreign exchange. Pakistan is deeply globalised whether it intends to be or not.",
      ur: "عالمی گندم کی قیمتوں کا اضافہ (جیسے 2022 یوکرین کی جنگ کے بعد) فوری طور پر پاکستان کی خوراک لاگت کو متاثر کرتا ہے۔ 2021-22 میں عالمی تیل کی قیمتیں دوگنی ہونے سے پاکستان کا درآمدی بل بڑھا۔",
      rm: "Aalami gandum ki qeematon ka izaafa (jaise 2022 Ukraine ki jang ke baad) fori tor par Pakistan ki khuuraak lagat ko mutaassir karta hai. 2021-22 mein aalami tel ki qeematen dugni hone se Pakistan ka daraamdaati bill barha.",
    },
    explanation: {
      en: `**Four channels of globalisation:**

**1. Trade:** Countries buy and sell goods and services across borders. Pakistan's exports ($30-35bn) and imports ($60-80bn) are both deeply globalised. Pakistan is integrated into global textile supply chains.

**2. Capital flows:** Money moves across borders — FDI (foreign companies building factories), portfolio investment (foreigners buying PSX stocks or bonds), and foreign loans. Pakistan relies heavily on external borrowing.

**3. Labour migration:** People move across borders for work. ~9 million Pakistanis work abroad, sending $27bn+ in remittances — Pakistan's largest single source of foreign exchange, exceeding merchandise exports.

**4. Technology and information:** Ideas, technologies, and best practices spread globally. Pakistan's IT sector benefits from global demand for software services.

**Winners and losers:** Globalisation raises average incomes but creates winners and losers within countries. Pakistan's textile workers benefit from export demand; domestic manufacturers of goods that now compete with cheap Chinese imports face pressure.`,
      ur: `**عالمگیریت کے چار چینل:**

**1. تجارت:** ممالک اشیاء اور خدمات سرحدوں کے پار خریدتے اور بیچتے ہیں۔

**2. سرمائے کا بہاؤ:** پیسہ سرحدوں کے پار جاتا ہے — FDI، پورٹ فولیو سرمایہ کاری، بیرونی قرضے۔

**3. مزدوری کی نقل مکانی:** ~90 لاکھ پاکستانی بیرون ملک کام کرتے ہیں، $27 ارب+ ترسیلات بھیجتے ہیں — پاکستان کا سب سے بڑا واحد زرمبادلہ ذریعہ۔

**4. ٹیکنالوجی اور معلومات:** خیالات اور ٹیکنالوجیاں عالمی سطح پر پھیلتی ہیں۔

**فاتح اور ہارنے والے:** عالمگیریت اوسط آمدنی بڑھاتی ہے لیکن فاتح اور ہارنے والے بناتی ہے۔`,
      rm: `**Aalam-geeri ke chaar channel:**

**1. Tijarat:** Mumaalik cheezain aur khadamaat sarhaddon ke paar khareedtey aur bechte hain.

**2. Sarmaaye ka bahao:** Paisa sarhaddon ke paar jaata hai — FDI, portfolio sarmaaya kaari, baeruni qarzay.

**3. Mazdoori ki naql-e-makaani:** ~90 laakh Pakistani bairun-e-mulk kaam karte hain, $27 arab+ tarseelaate zer bhejte hain.

**4. Technology aur maaloomat:** Khayalaat aur technologiyaan aalami satah par phaailti hain.

**Faatih aur haarne wale:** Aalam-geeri ausat aamdani barhati hai lekin faatih aur haarne wale banati hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Globalisation always benefits everyone.** It raises average incomes but the gains are unequally distributed. Workers in import-competing industries face wage pressure. Not all countries capture globalisation's benefits equally.

**Myth 2: Pakistan is too dependent on remittances.** Remittances are large but volatile — affected by Gulf economic cycles, exchange rate incentives (formal vs hawala), and political relations. Pakistan must build other sources of hard currency rather than solely depending on remittances.

**Myth 3: Deglobalisation (protectionism) is the answer.** Restricting trade reduces efficiency and raises prices for consumers. Pakistan's challenge is to compete better in globalised markets, not to retreat from them.`,
      ur: `**غلط فہمی 1: عالمگیریت ہمیشہ سب کو فائدہ دیتی ہے۔** یہ اوسط آمدنی بڑھاتی ہے لیکن فوائد غیر مساوی طور پر تقسیم ہوتے ہیں۔

**غلط فہمی 2: پاکستان ترسیلات پر بہت زیادہ انحصار کرتا ہے۔** ترسیلات بڑی لیکن غیر مستحکم ہیں۔ پاکستان کو دوسرے ذرائع بنانے چاہئیں۔

**غلط فہمی 3: ڈی گلوبلائزیشن (حفاظتی پالیسی) جواب ہے۔** پاکستان کا چیلنج عالمگیر بازاروں میں بہتر مقابلہ کرنا ہے۔`,
      rm: `**Ghalat fehmi 1: Aalam-geeri hamesha sab ko faayda deti hai.** Yeh ausat aamdani barhati hai lekin fawaaید ghair musaawi tor par taqseem hote hain.

**Ghalat fehmi 2: Pakistan tarseelaate zer par bahut zyada inhisaar karta hai.** Tarseelaate zer bari lekin ghair mustahkam hain. Pakistan ko doosre zaraaiye banana chahiye.

**Ghalat fehmi 3: De-globalisation (hifaazati policy) jawaab hai.** Pakistan ka challenge aalamgeer baazaaron mein behtar muqaabla karna hai.`,
    },
    pakistanExample: {
      en: `**Remittances: Pakistan's globalisation dividend:** Pakistan's diaspora (~9 million workers abroad, primarily in Saudi Arabia, UAE, UK, US) sends over $27 billion annually — more than Pakistan's merchandise goods exports alone. These flows are critical: they fund household consumption, support the rupee, and help finance the current account deficit. The 2022-23 decline in remittances (as Gulf construction slowed and the grey market hawala rate diverged from official rate) directly contributed to Pakistan's forex crisis.`,
      ur: `**ترسیلات: پاکستان کا عالمگیریت کا منافع:** پاکستان کا ڈائاسپورا (~90 لاکھ کارکن بیرون ملک) سالانہ $27 ارب سے زیادہ بھیجتا ہے۔ یہ بہاؤ اہم ہیں: گھریلو استعمال فنڈ کرتے ہیں، روپے کی حمایت کرتے ہیں۔ 2022-23 میں ترسیلات میں کمی نے پاکستان کے زرمبادلہ بحران میں براہ راست حصہ ڈالا۔`,
      rm: `**Tarseelaate zer: Pakistan ka aalam-geeri ka munaafa:** Pakistan ka diaspora (~90 laakh kaarkin bairun-e-mulk) saalaana $27 arab se zyada bhejta hai. Yeh bahao ahem hain: ghareluu istemal fund karte hain, rupay ki himaayat karte hain. 2022-23 mein tarseelaate zer mein kami ne Pakistan ke zarmbadla bohran mein baraah-e-raast hissa daala.`,
    },
    realWorld: {
      en: "Bangladesh's garment industry shows globalisation working for a developing economy. By integrating into global textile supply chains from the 1980s onward, Bangladesh grew into the world's second-largest garment exporter (behind China), employing 4+ million workers — mostly women. This globalisation-driven industrialisation lifted millions out of poverty and raised female labour participation. Pakistan could follow a similar path with deliberate export promotion policies.",
      ur: "بنگلہ دیش کی گارمنٹ صنعت ترقی پذیر معیشت کے لیے عالمگیریت کا کام کرتی دکھاتی ہے۔ 1980s سے عالمی ٹیکسٹائل سپلائی چینز میں ضم ہو کر، بنگلہ دیش دنیا کا دوسرا سب سے بڑا گارمنٹ برآمد کنندہ بن گیا۔ یہ عالمگیریت سے چلنے والی صنعت کاری نے لاکھوں کو غربت سے نکالا۔",
      rm: "Bangladesh ki garment sanaaton taraqqi pazeer muaashat ke liye aalam-geeri ka kaam karti dikhati hai. 1980s se aalami textile supply chains mein zamm ho kar, Bangladesh duniya ka doosra sab se bara garment baraadm kunanda ban gaya. Yeh aalam-geeri se chalti sanaatkaari ne laakhon ko ghurbat se nikaala.",
    },
    summary: {
      en: "• Globalisation: integration through trade, capital, labour, technology\n• Benefits: access to larger markets, technology, investment, remittances\n• Risks: commodity price shocks, capital flow volatility, import competition\n• Pakistan's globalisation channels: $30-35bn exports, $27bn+ remittances, FDI, external loans\n• Remittances > merchandise goods exports — diaspora is Pakistan's biggest earner\n• Bangladesh model: export-led growth through textile globalisation",
      ur: "• عالمگیریت: تجارت، سرمایہ، مزدوری، ٹیکنالوجی کے ذریعے انضمام\n• فوائد: بڑے بازاروں تک رسائی، ٹیکنالوجی، سرمایہ کاری، ترسیلات\n• خطرات: اجناس قیمت کے جھٹکے، سرمائے کے بہاؤ کا عدم استحکام\n• پاکستان کے عالمگیریت کے چینل: $30-35 ارب برآمدات، $27 ارب+ ترسیلات\n• ترسیلات > اشیاء کی برآمدات — ڈائاسپورا پاکستان کا سب سے بڑا کمانے والا\n• بنگلہ دیش ماڈل: برآمدی ترقی کا راستہ",
      rm: "• Aalam-geeri: tijarat, sarmaaya, mazdoori, technology ke zariye inzimaam\n• Fawaaید: bare baazaaron tak rasaai, technology, sarmaaya kaari, tarseelaate zer\n• Khataraat: ajnaas qeemat ke jhatke, sarmaaye ke bahao ka adam-istihkaam\n• Pakistan ke aalam-geeri ke channel: $30-35 arab baraamdaat, $27 arab+ tarseelaate zer\n• Tarseelaate zer > cheezain ki baraamdaat — diaspora Pakistan ka sab se bara kamane wala\n• Bangladesh model: baraamdaati taraqqi ka raasta",
    },
  },
  quiz: [
    {
      question: { en: "Pakistan's overseas workers send over $27 billion per year. This is called:", ur: "پاکستان کے بیرون ملک کارکن سالانہ $27 ارب سے زیادہ بھیجتے ہیں۔ اسے کہتے ہیں:", rm: "Pakistan ke bairun-e-mulk kaarkin saalaana $27 arab se zyada bhejte hain. Ise kehte hain:" },
      options: [
        { en: "Foreign Direct Investment (FDI)", ur: "غیر ملکی براہ راست سرمایہ کاری (FDI)", rm: "Ghair mulki baraah-e-raast sarmaaya kaari (FDI)" },
        { en: "Remittances", ur: "ترسیلات زر", rm: "Tarseelaate zer" },
        { en: "Portfolio investment", ur: "پورٹ فولیو سرمایہ کاری", rm: "Portfolio sarmaaya kaari" },
        { en: "Export earnings", ur: "برآمدی آمدنی", rm: "Baraamdaati aamdani" },
      ],
      correctIndex: 1,
      explanation: { en: "Remittances are money sent home by migrant workers. Pakistan's $27bn+ annual remittance flow is larger than its merchandise exports and is the single most important source of foreign exchange.", ur: "ترسیلات تارکین وطن کارکنوں کی گھر بھیجی ہوئی رقم ہے۔ پاکستان کے $27 ارب+ سالانہ ترسیلات بہاؤ اس کی اشیاء کی برآمدات سے بڑا ہے اور زرمبادلہ کا سب سے اہم ذریعہ ہے۔", rm: "Tarseelaate zer taarkeen watan kaarkinon ki ghar bhejee hui raqam hai. Pakistan ka $27 arab+ saalaana tarseelaate zer bahao is ki cheezain ki baraamdaat se bara hai." },
    },
    {
      question: { en: "When global oil prices double, Pakistan is immediately affected because:", ur: "جب عالمی تیل کی قیمتیں دوگنی ہوں، پاکستان فوری طور پر متاثر ہوتا ہے کیونکہ:", rm: "Jab aalami tel ki qeematen dugni hon, Pakistan fori tor par mutaassir hota hai kyunke:" },
      options: [
        { en: "Pakistan exports oil to global markets", ur: "پاکستان عالمی بازاروں کو تیل برآمد کرتا ہے", rm: "Pakistan aalami baazaaron ko tel baraadm karta hai" },
        { en: "Pakistan imports most of its oil and is exposed to global commodity prices", ur: "پاکستان اپنا زیادہ تر تیل درآمد کرتا ہے اور عالمی اجناس قیمتوں سے متاثر ہے", rm: "Pakistan apna zyada tar tel daraamd karta hai aur aalami ajnaas qeematon se mutaassir hai" },
        { en: "Pakistan sets global oil prices", ur: "پاکستان عالمی تیل کی قیمتیں مقرر کرتا ہے", rm: "Pakistan aalami tel ki qeematen muqarrar karta hai" },
        { en: "Higher oil prices always hurt oil-importing countries equally", ur: "زیادہ تیل کی قیمتیں ہمیشہ تیل درآمد کرنے والے ممالک کو یکساں طور پر نقصان دیتی ہیں", rm: "Zyada tel ki qeematen hamesha tel daraamd karne wale mumaalik ko yaksan tor par nuqsaan deti hain" },
      ],
      correctIndex: 1,
      explanation: { en: "Pakistan imports 80%+ of its petroleum. When global prices rise, Pakistan's import bill surges — directly causing rupee pressure and inflation since energy prices feed into almost every cost in the economy.", ur: "پاکستان اپنا 80%+ پیٹرولیم درآمد کرتا ہے۔ جب عالمی قیمتیں بڑھتی ہیں، پاکستان کا درآمدی بل بڑھتا ہے — براہ راست روپے کے دباؤ اور مہنگائی کا باعث بنتا ہے۔", rm: "Pakistan apna 80%+ petroleum daraamd karta hai. Jab aalami qeematen barhti hain, Pakistan ka daraamdaati bill barhta hai — baraah-e-raast rupay ke dabaao aur mahangaai ka baais banta hai." },
    },
    {
      question: { en: "Bangladesh became the world's second-largest garment exporter primarily through:", ur: "بنگلہ دیش دنیا کا دوسرا سب سے بڑا گارمنٹ برآمد کنندہ بنیادی طور پر کس طریقے سے بنا؟", rm: "Bangladesh duniya ka doosra sab se bara garment baraadm kunanda bunyaadi tor par kis tareeqe se bana?" },
      options: [
        { en: "Natural resource exports", ur: "قدرتی وسائل کی برآمدات", rm: "Qudrati wasail ki baraamdaat" },
        { en: "Foreign aid and grants", ur: "غیر ملکی امداد اور گرانٹ", rm: "Ghair mulki imdaad aur grant" },
        { en: "Integrating into global textile supply chains with low-cost labour", ur: "کم لاگت مزدوری کے ساتھ عالمی ٹیکسٹائل سپلائی چینز میں ضم ہو کر", rm: "Kam lagat mazdoori ke saath aalami textile supply chains mein zamm ho kar" },
        { en: "Restricting all imports", ur: "تمام درآمدات پر پابندی لگا کر", rm: "Tamam daraamdaat par paabandi laga kar" },
      ],
      correctIndex: 2,
      explanation: { en: "Bangladesh deliberately integrated into global garment supply chains by offering low wages, reliable production, and good compliance with buyer standards (Accord, Alliance). This export-led model pulled millions out of poverty.", ur: "بنگلہ دیش نے جان بوجھ کر کم اجرت، قابل اعتماد پیداوار اور خریدار معیار کی تعمیل پیش کر کے عالمی گارمنٹ سپلائی چینز میں ضم کیا۔ اس برآمد کی قیادت والے ماڈل نے لاکھوں کو غربت سے نکالا۔", rm: "Bangladesh ne jaanboojhkar kam ujrat, qaabil-e-aitemaad paidawar aur khareedar miyaar ki tameel pesh kar ke aalami garment supply chains mein zamm kiya. Is baraadm ki qiyaadat wale model ne laakhon ko ghurbat se nikaala." },
    },
    {
      question: { en: "Which of the following is a RISK of globalisation for Pakistan?", ur: "مندرجہ ذیل میں سے کون سا پاکستان کے لیے عالمگیریت کا خطرہ ہے؟", rm: "Mundarja zeel mein se kaun sa Pakistan ke liye aalam-geeri ka khatara hai?" },
      options: [
        { en: "Access to foreign technology and capital", ur: "غیر ملکی ٹیکنالوجی اور سرمایے تک رسائی", rm: "Ghair mulki technology aur sarmaaye tak rasaai" },
        { en: "Export markets for Pakistani goods", ur: "پاکستانی اشیاء کے لیے برآمدی بازار", rm: "Pakistani cheezain ke liye baraamdaati baazaar" },
        { en: "Global commodity price shocks hitting Pakistan's import bill", ur: "عالمی اجناس قیمت کے جھٹکے پاکستان کے درآمدی بل کو متاثر کرتے ہیں", rm: "Aalami ajnaas qeemat ke jhatke Pakistan ke daraamdaati bill ko mutaassir karte hain" },
        { en: "More remittances from overseas Pakistanis", ur: "بیرون ملک پاکستانیوں سے زیادہ ترسیلات", rm: "Bairun-e-mulk Pakistaniyon se zyada tarseelaate zer" },
      ],
      correctIndex: 2,
      explanation: { en: "Pakistan's reliance on imported energy makes it vulnerable to global oil price spikes. When crude oil prices doubled in 2021-22, Pakistan's import bill surged by $20+ billion, triggering a currency and economic crisis.", ur: "درآمدی توانائی پر پاکستان کا انحصار اسے عالمی تیل کی قیمتوں میں اضافے سے خطرناک بناتا ہے۔ جب 2021-22 میں خام تیل کی قیمتیں دوگنی ہوئیں، پاکستان کا درآمدی بل $20+ ارب بڑھا۔", rm: "Daraamdaati tawanaayi par Pakistan ka inhisaar ise aalami tel ki qeematon mein izaafe se khatarnaak banata hai. Jab 2021-22 mein khaam tel ki qeematen dugni huin, Pakistan ka daraamdaati bill $20+ arab barha." },
    },
  ],
  faq: [
    {
      question: { en: "Is globalisation good or bad for Pakistan overall?", ur: "مجموعی طور پر پاکستان کے لیے عالمگیریت اچھی ہے یا بری؟", rm: "Majmooee tor par Pakistan ke liye aalam-geeri achi hai ya buri?" },
      answer: { en: "Both — it depends on how Pakistan manages it. Globalisation provides real benefits: $27bn+ remittances, export markets for textiles, access to technology and capital. But it also exposes Pakistan to commodity price volatility, capital flow reversals, and competition from more efficient producers. The countries that gained most from globalisation (China, South Korea, Bangladesh) captured its benefits through active industrial policy, education investment, and export promotion — not passively. Pakistan's challenge is to become an active participant rather than a passive victim of global economic forces.", ur: "دونوں — یہ اس بات پر منحصر ہے کہ پاکستان اسے کیسے سنبھالتا ہے۔ عالمگیریت حقیقی فوائد فراہم کرتی ہے: $27 ارب+ ترسیلات، برآمدی بازار۔ لیکن پاکستان کو اجناس قیمت کے اتار چڑھاؤ، سرمائے کے بہاؤ کے پلٹاؤ سے بھی بے نقاب کرتی ہے۔ پاکستان کا چیلنج ایک فعال شریک بننا ہے۔", rm: "Dono — yeh is baat par munsalik hai ke Pakistan ise kaise sambhalta hai. Aalam-geeri haqeeqi fawaaید faraahim karti hai: $27 arab+ tarseelaate zer, baraamdaati baazaar. Lekin Pakistan ko ajnaas qeemat ke utaar charhaao, sarmaaye ke bahao ke paltaao se bhi be-naqaab karti hai. Pakistan ka challenge ek faaal shareek banna hai." },
    },
  ],
};
