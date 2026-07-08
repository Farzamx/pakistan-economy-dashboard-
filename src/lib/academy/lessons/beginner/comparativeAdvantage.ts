import type { Lesson } from "@/lib/academy/types";

export const comparativeAdvantageLesson: Lesson = {
  slug: "comparative-advantage",
  category: "beginner",
  title: { en: "Comparative Advantage: Why Countries Specialise", ur: "تقابلی فضیلت: ممالک خصوصی کیوں ہوتے ہیں", rm: "Taqaabuli Fazilat: Mumaalik Khusosi Kyun Hote Hain" },
  subtitle: {
    en: "The idea that changed global trade — why even a country that's good at everything should still specialise",
    ur: "وہ خیال جس نے عالمی تجارت بدل دی — کیوں ہر چیز میں اچھا ملک بھی خصوصی ہونا چاہیے",
    rm: "Woh khayal jis ne aalami tijarat badal di — kyun har cheez mein acha mulk bhi khusosi hona chahiye",
  },
  level: "beginner",
  readMinutes: 7,
  isPremium: false,
  relatedIndicatorSlugs: [],
  relatedLessonSlugs: ["trade-basics", "globalisation-basics", "exchange-rates-basics"],
  content: {
    overview: {
      en: "Comparative advantage says a country should produce and export whatever it produces at the lowest opportunity cost — not necessarily what it produces best in absolute terms. This is the core logic behind international trade. Even if Pakistan is less efficient at everything than Germany, both benefit from trading — Pakistan specialising in textiles, Germany in machinery. The gains from trade come from specialisation, not from being the 'best' at something.",
      ur: "تقابلی فضیلت کہتی ہے کہ ملک کو وہ پیدا اور برآمد کرنا چاہیے جو سب سے کم مواقعاتی لاگت پر پیدا کرے — ضروری نہیں کہ مطلق طور پر سب سے بہتر ہو۔ یہ بین الاقوامی تجارت کی بنیادی منطق ہے۔",
      rm: "Taqaabuli fazilat kehti hai ke mulk ko woh paida aur baraadm karna chahiye jo sab se kam mawaqaati lagat par paida kare — zaroori nahi ke mutlaq tor par sab se behtar ho. Yeh bayn-ul-aqwaami tijarat ki bunyaadi mantiq hai.",
    },
    whyItMatters: {
      en: "Understanding comparative advantage explains why Pakistan's textile focus is rational (low labour cost, cotton availability) even though other countries do textiles too. It also explains why protectionism (blocking imports) often backfires — it prevents specialisation and forces consumers to buy expensive domestic goods instead of cheaper imports. The concept is also why free trade agreements (CPFTA with China, FTAs with other countries) can benefit both sides even when one partner is much larger.",
      ur: "تقابلی فضیلت سمجھنا بتاتا ہے کہ پاکستان کا ٹیکسٹائل پر توجہ کیوں معقول ہے (کم مزدوری لاگت، کپاس کی دستیابی)۔ یہ یہ بھی بتاتا ہے کہ حفاظتی پالیسی اکثر کیوں الٹا اثر کرتی ہے۔",
      rm: "Taqaabuli fazilat samajhna batata hai ke Pakistan ka textile par tawajjuh kyun maaqool hai (kam mazdoori lagat, kapas ki dastyaabi). Yeh yeh bhi batata hai ke hifaazati policy aksar kyun ulta asar karti hai.",
    },
    explanation: {
      en: `**Absolute vs Comparative Advantage:**

Absolute advantage: You produce something more efficiently than someone else (more output per hour).

Comparative advantage: You produce something at a lower opportunity cost than someone else — even if they're better at everything in absolute terms.

**Classic example:** Suppose Germany can produce 10 cars OR 100 shirts per worker per day. Pakistan can produce 2 cars OR 40 shirts per day. Germany is absolutely better at both. But:
- Germany's opportunity cost of 1 car = 10 shirts
- Pakistan's opportunity cost of 1 car = 20 shirts
- Germany's opportunity cost of 1 shirt = 0.1 cars
- Pakistan's opportunity cost of 1 shirt = 0.05 cars

Pakistan has comparative advantage in shirts (lower opportunity cost). Germany has comparative advantage in cars. Both benefit if Germany makes cars, Pakistan makes shirts, and they trade.

**Why this matters:** This logic justifies Pakistan exporting textiles to rich countries. Even though German workers might be more productive at textiles too, their time is more valuably spent making cars. Trade lets both countries consume more than if they tried to produce everything domestically.`,
      ur: `**مطلق بمقابلہ تقابلی فضیلت:**

مطلق فضیلت: آپ کسی چیز کو کسی اور سے زیادہ موثر طریقے سے بناتے ہیں۔

تقابلی فضیلت: آپ کسی چیز کو کم مواقعاتی لاگت پر بناتے ہیں۔

**کلاسیک مثال:** جرمنی فی کارکن 10 کاریں یا 100 شرٹیں بنا سکتا ہے۔ پاکستان 2 کاریں یا 40 شرٹیں بنا سکتا ہے۔ جرمنی مطلق طور پر دونوں میں بہتر ہے۔ لیکن پاکستان کو شرٹوں میں تقابلی فضیلت ہے۔ دونوں ممالک تجارت سے فائدہ اٹھاتے ہیں۔`,
      rm: `**Mutlaq bamuqaabila taqaabuli fazilat:**

Mutlaq fazilat: Aap kisi cheez ko kisi aur se zyada moassir tareeqe se banate hain.

Taqaabuli fazilat: Aap kisi cheez ko kam mawaqaati lagat par banate hain.

**Classic misaal:** Germany fi kaarkin 10 gaariyan ya 100 shirts bana sakta hai. Pakistan 2 gaariyan ya 40 shirts bana sakta hai. Germany mutlaq tor par dono mein behtar hai. Lekin Pakistan ko shirts mein taqaabuli fazilat hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Countries should only import what they can't produce at all.** This misunderstands comparative advantage. Even if Pakistan could produce cars, it's better off importing them and making more textiles — that's where its comparative advantage lies.

**Myth 2: Protecting domestic industries is always beneficial.** Tariffs and import bans raise prices for consumers and often create inefficient domestic producers who survive only because of protection — never becoming globally competitive.

**Myth 3: Pakistan is stuck in textiles forever.** Comparative advantage can change over time through investment in skills, technology, and infrastructure. South Korea moved from textiles in the 1960s to electronics and shipbuilding by the 1990s through deliberate industrial policy.`,
      ur: `**غلط فہمی 1: ممالک کو صرف وہ درآمد کرنا چاہیے جو وہ بالکل پیدا نہیں کر سکتے۔** یہ تقابلی فضیلت کو غلط سمجھنا ہے۔

**غلط فہمی 2: گھریلو صنعتوں کی حفاظت ہمیشہ فائدہ مند ہے۔** ٹیرف اور درآمدی پابندیاں صارفین کے لیے قیمتیں بڑھاتی ہیں۔

**غلط فہمی 3: پاکستان ہمیشہ ٹیکسٹائل میں ہی پھنسا رہے گا۔** تقابلی فضیلت وقت کے ساتھ بدل سکتی ہے۔`,
      rm: `**Ghalat fehmi 1: Mumaalik ko sirf woh daraamd karna chahiye jo woh bilkul paida nahi kar sakte.** Yeh taqaabuli fazilat ko ghalat samajhna hai.

**Ghalat fehmi 2: Ghareluu sanaaton ki hifaazat hamesha fayda mand hai.** Tariff aur daraamdaati paabandiyaan sarfeen ke liye qeematen barhati hain.

**Ghalat fehmi 3: Pakistan hamesha textile mein hi phanasa rahega.** Taqaabuli fazilat waqt ke saath badal sakti hai.`,
    },
    pakistanExample: {
      en: `**Pakistan's textile comparative advantage:** Pakistan's comparative advantage in textiles rests on: (1) Abundant and relatively cheap labour, (2) Domestic cotton production (one of the world's largest), (3) Decades of accumulated expertise and supply chains. Pakistan produces and exports textiles worth ~$18-20 billion annually despite not being the most technologically advanced. Competitors like Bangladesh have lower wages but less domestic cotton; China is moving up the value chain. Pakistan's challenge is to upgrade within textiles (higher-value fashion, technical textiles) while also developing new comparative advantages in IT services.`,
      ur: `**پاکستان کی ٹیکسٹائل میں تقابلی فضیلت:** پاکستان کی ٹیکسٹائل میں تقابلی فضیلت کی بنیاد: (1) وافر اور نسبتاً سستی مزدوری، (2) گھریلو کپاس کی پیداوار، (3) دہائیوں کی جمع شدہ مہارت۔ پاکستان کا چیلنج ٹیکسٹائل کے اندر اپ گریڈ کرنا اور IT خدمات میں نئی تقابلی فضیلت پیدا کرنا ہے۔`,
      rm: `**Pakistan ki textile mein taqaabuli fazilat:** Pakistan ki textile mein taqaabuli fazilat ki bunyaad: (1) Waafir aur nisbatan sasti mazdoori, (2) Ghareluu kapas ki paidawar, (3) Dahaayon ki jama shuda maharat. Pakistan ka challenge textile ke andar up-grade karna aur IT khadamaat mein nayi taqaabuli fazilat paida karna hai.`,
    },
    realWorld: {
      en: "China's rise in global trade is a comparative advantage story. In the 1980s-2000s, China's comparative advantage was cheap labour for manufacturing. It attracted global factories, becoming 'the world's factory.' As Chinese wages rose and comparative advantage shifted, China upgraded to electronics, then to higher-tech goods. Today, China is developing comparative advantage in electric vehicles and solar panels. This dynamic nature of comparative advantage shows that countries can deliberately build new advantages over time.",
      ur: "عالمی تجارت میں چین کا عروج تقابلی فضیلت کی کہانی ہے۔ 1980s-2000s میں چین کی تقابلی فضیلت مینوفیکچرنگ کے لیے سستی مزدوری تھی۔ آج چین الیکٹرک گاڑیوں اور شمسی توانائی میں تقابلی فضیلت پیدا کر رہا ہے۔",
      rm: "Aalami tijarat mein China ka uroooj taqaabuli fazilat ki kahaani hai. 1980s-2000s mein China ki taqaabuli fazilat manufacturing ke liye sasti mazdoori thi. Aaj China electric gaariyan aur shamsi tawanaayi mein taqaabuli fazilat paida kar raha hai.",
    },
    summary: {
      en: "• Comparative advantage: produce what you can at lowest opportunity cost\n• Even a country worse at everything benefits from specialising and trading\n• Pakistan's textile specialisation makes economic sense — cheap labour + domestic cotton\n• Protectionism (tariffs/bans) blocks comparative advantage gains\n• Comparative advantage changes: invest in skills/technology to move up the value chain\n• Both countries gain from trade — it's not a zero-sum game",
      ur: "• تقابلی فضیلت: سب سے کم مواقعاتی لاگت پر جو پیدا کر سکتے ہیں وہ کریں\n• ہر چیز میں بدتر ملک بھی خصوصی ہو کر فائدہ اٹھاتا ہے\n• پاکستان کی ٹیکسٹائل خصوصیت اقتصادی معنی رکھتی ہے\n• حفاظتی پالیسی تقابلی فضیلت کے فوائد روکتی ہے\n• تقابلی فضیلت بدلتی ہے: قدر کی سیڑھی پر چڑھنے کے لیے سرمایہ کاری کریں\n• دونوں ممالک تجارت سے فائدہ اٹھاتے ہیں",
      rm: "• Taqaabuli fazilat: sab se kam mawaqaati lagat par jo paida kar sakte hain woh karen\n• Har cheez mein badtar mulk bhi khusosi ho kar faayda uthaata hai\n• Pakistan ki textile khusosiyat iqtisadi maani rakhti hai\n• Hifaazati policy taqaabuli fazilat ke fawaaید rokti hai\n• Taqaabuli fazilat badlti hai: qadar ki seedhi par charhnay ke liye sarmaaya kaari karen\n• Dono mumaalik tijarat se faayda uthaate hain",
    },
  },
  quiz: [
    {
      question: { en: "Country A can produce 10 cars OR 50 shirts per day. Country B can produce 3 cars OR 30 shirts per day. Which country has comparative advantage in shirts?", ur: "ملک A روزانہ 10 کاریں یا 50 شرٹیں بنا سکتا ہے۔ ملک B روزانہ 3 کاریں یا 30 شرٹیں۔ شرٹوں میں تقابلی فضیلت کس ملک کو ہے؟", rm: "Mulk A rozana 10 gaariyan ya 50 shirts bana sakta hai. Mulk B rozana 3 gaariyan ya 30 shirts. Shirts mein taqaabuli fazilat kis mulk ko hai?" },
      options: [
        { en: "Country A — it produces more shirts total", ur: "ملک A — وہ مجموعی طور پر زیادہ شرٹیں بناتا ہے", rm: "Mulk A — woh majmooee tor par zyada shirts banata hai" },
        { en: "Country B — its opportunity cost of shirts is lower (0.1 cars vs 0.2 cars)", ur: "ملک B — شرٹوں کی اس کی مواقعاتی لاگت کم ہے (0.1 کاریں بمقابلہ 0.2 کاریں)", rm: "Mulk B — shirts ki is ki mawaqaati lagat kam hai (0.1 gaariyan bamuqaabla 0.2 gaariyan)" },
        { en: "Neither — they are equal", ur: "کوئی نہیں — وہ برابر ہیں", rm: "Koi nahi — woh barabar hain" },
        { en: "Country A — it is better at everything", ur: "ملک A — یہ ہر چیز میں بہتر ہے", rm: "Mulk A — yeh har cheez mein behtar hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Country A's opportunity cost per shirt = 10/50 = 0.2 cars. Country B's opportunity cost per shirt = 3/30 = 0.1 cars. Country B sacrifices fewer cars per shirt — lower opportunity cost = comparative advantage in shirts.", ur: "ملک A کی فی شرٹ مواقعاتی لاگت = 0.2 کاریں۔ ملک B کی = 0.1 کاریں۔ ملک B فی شرٹ کم کاریں قربان کرتا ہے — شرٹوں میں تقابلی فضیلت۔", rm: "Mulk A ki fi shirt mawaqaati lagat = 0.2 gaariyan. Mulk B ki = 0.1 gaariyan. Mulk B fi shirt kam gaariyan qurbaan karta hai — shirts mein taqaabuli fazilat." },
    },
    {
      question: { en: "Why should Germany buy textiles from Pakistan even if Germany can make textiles more efficiently?", ur: "جرمنی کو پاکستان سے ٹیکسٹائل کیوں خریدنا چاہیے چاہے جرمنی ٹیکسٹائل زیادہ موثر طریقے سے بنا سکتا ہو؟", rm: "Germany ko Pakistan se textile kyun khareedna chahiye chahe Germany textile zyada moassir tareeqe se bana sakta ho?" },
      options: [
        { en: "Germany should not — it should make its own", ur: "جرمنی کو نہیں چاہیے — اسے اپنا بنانا چاہیے", rm: "Germany ko nahi chahiye — ise apna banana chahiye" },
        { en: "Germany's workers are more valuable making cars — textiles have lower opportunity cost in Pakistan", ur: "جرمن کارکن کاریں بناتے زیادہ قیمتی ہیں — پاکستان میں ٹیکسٹائل کی مواقعاتی لاگت کم ہے", rm: "German kaarkin gaariyan banate zyada qeemti hain — Pakistan mein textile ki mawaqaati lagat kam hai" },
        { en: "To be charitable to poor countries", ur: "غریب ممالک کے ساتھ خیرات کی وجہ سے", rm: "Ghareeb mumaalik ke saath khairaat ki wajah se" },
        { en: "Because international law requires it", ur: "کیونکہ بین الاقوامی قانون اس کی ضرورت ہے", rm: "Kyunke bayn-ul-aqwaami qaanoon is ki zaroorat hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Germany's workers are far more productive making cars. Using them to make textiles instead is enormously costly in terms of cars foregone. Germany benefits by specialising in cars, buying cheap Pakistani textiles, and Germany's car buyers and Pakistan's textile workers both gain.", ur: "جرمن کارکن کاریں بنانے میں بہت زیادہ پیداواری ہیں۔ انہیں ٹیکسٹائل بنانے میں استعمال کرنا گئی کاروں کے لحاظ سے بہت مہنگا ہے۔ جرمنی کاریں بنانے میں خصوصی ہو کر فائدہ اٹھاتا ہے۔", rm: "German kaarkin gaariyan banane mein bahut zyada paidaawarati hain. Unhen textile banane mein istemal karna gayi gaariyon ke lihaaz se bahut mahanga hai. Germany gaariyan banane mein khusosi ho kar faayda uthaata hai." },
    },
    {
      question: { en: "Pakistan imposes high tariffs on imported Chinese textiles to protect local industry. What is a likely consequence?", ur: "پاکستان مقامی صنعت کی حفاظت کے لیے درآمدی چینی ٹیکسٹائل پر اونچے ٹیرف لگاتا ہے۔ ممکنہ نتیجہ کیا ہے؟", rm: "Pakistan maqaami sanaaton ki hifaazat ke liye daraamdaati Cheeni textile par oonche tariff lagata hai. Mumkina nateeja kya hai?" },
      options: [
        { en: "Pakistani consumers pay more for textiles", ur: "پاکستانی صارفین ٹیکسٹائل کے لیے زیادہ ادا کرتے ہیں", rm: "Pakistani sarfeen textile ke liye zyada ada karte hain" },
        { en: "All Pakistani industries become more competitive globally", ur: "تمام پاکستانی صنعتیں عالمی سطح پر زیادہ مسابقتی بن جاتی ہیں", rm: "Tamam Pakistani sanaaten aalami satah par zyada musaabiqati ban jaati hain" },
        { en: "China stops exporting to Pakistan permanently", ur: "چین مستقل طور پر پاکستان کو برآمد کرنا بند کر دیتا ہے", rm: "China mustaqil tor par Pakistan ko baraadm karna band kar deta hai" },
        { en: "Pakistan's textile exports rise automatically", ur: "پاکستان کی ٹیکسٹائل برآمدات خودبخود بڑھتی ہیں", rm: "Pakistan ki textile baraamdaat khud-ba-khud barhti hain" },
      ],
      correctIndex: 0,
      explanation: { en: "Tariffs raise the price of imported goods for domestic consumers. They protect domestic producers but at the cost of higher prices for everyone who buys the product — and can invite retaliation from trading partners.", ur: "ٹیرف گھریلو صارفین کے لیے درآمدی اشیاء کی قیمت بڑھاتے ہیں۔ وہ گھریلو پیداواروں کو بچاتے ہیں لیکن ہر خریدار کے لیے زیادہ قیمت کی لاگت پر — اور تجارتی شراکت داروں سے جوابی کارروائی کو دعوت دے سکتے ہیں۔", rm: "Tariff ghareluu sarfeen ke liye daraamdaati cheezain ki qeemat barhate hain. Woh ghareluu paidawaaron ko bachate hain lekin har khareedar ke liye zyada qeemat ki lagat par." },
    },
    {
      question: { en: "Pakistan's IT sector exports $3+ billion/year. What kind of comparative advantage is this based on?", ur: "پاکستان کا IT شعبہ سالانہ $3+ ارب برآمد کرتا ہے۔ یہ کس قسم کی تقابلی فضیلت پر مبنی ہے؟", rm: "Pakistan ka IT shaabay saalaana $3+ arab baraadm karta hai. Yeh kis qism ki taqaabuli fazilat par mabni hai?" },
      options: [
        { en: "Natural resource advantage", ur: "قدرتی وسائل کی فضیلت", rm: "Qudrati wasail ki fazilat" },
        { en: "Skilled English-speaking labour at lower wages than Western countries", ur: "مغربی ممالک سے کم اجرت پر ہنر مند انگریزی بولنے والی مزدوری", rm: "Maghribi mumaalik se kam ujrat par hunar mand Angrezi bolne wali mazdoori" },
        { en: "Climate advantage", ur: "موسمی فضیلت", rm: "Mausami fazilat" },
        { en: "Government subsidies only", ur: "صرف حکومتی سبسڈی", rm: "Sirf hukomaati subsidy" },
      ],
      correctIndex: 1,
      explanation: { en: "Pakistan's IT comparative advantage is its large pool of English-speaking, technically educated young workers at wages far below Silicon Valley or London rates. This cost differential makes Pakistani IT services competitive globally, even without natural resource advantages.", ur: "پاکستان کی IT تقابلی فضیلت انگریزی بولنے والے، تکنیکی طور پر تعلیم یافتہ نوجوان کارکنوں کا بڑا تالاب ہے سیلیکن ویلی یا لندن کی اجرت سے بہت کم قیمتوں پر۔", rm: "Pakistan ki IT taqaabuli fazilat Angrezi bolne wale, takneeki tor par taaleem yaafta naujawaan kaarkinon ka bara taalab hai Silicon Valley ya London ki ujrat se bahut kam qeematon par." },
    },
  ],
  faq: [
    {
      question: { en: "Can a country create comparative advantage where it doesn't naturally exist?", ur: "کیا ملک وہاں تقابلی فضیلت پیدا کر سکتا ہے جہاں یہ قدرتی طور پر موجود نہیں؟", rm: "Kya mulk wahan taqaabuli fazilat paida kar sakta hai jahan yeh qudrati tor par maujood nahi?" },
      answer: { en: "Yes — this is what industrial policy is about. South Korea had no comparative advantage in electronics in 1970, but government support for companies like Samsung and LG, combined with heavy investment in technical education, created one. Taiwan did the same with semiconductors. It requires sustained government-industry coordination, R&D investment, and patience — but it works. Pakistan's IT sector is an emerging example of an acquired comparative advantage.", ur: "ہاں — یہی صنعتی پالیسی کی بات ہے۔ جنوبی کوریا کو 1970 میں الیکٹرانکس میں کوئی تقابلی فضیلت نہیں تھی، لیکن حکومتی تعاون اور تکنیکی تعلیم میں بھاری سرمایہ کاری سے پیدا ہوئی۔ پاکستان کا IT شعبہ حاصل شدہ تقابلی فضیلت کی ابھرتی مثال ہے۔", rm: "Haan — yahi sanaati policy ki baat hai. Janoobi Korea ko 1970 mein electronics mein koi taqaabuli fazilat nahi thi, lekin hukomaati taawun aur takneeki taaleem mein bhaari sarmaaya kaari se paida hui. Pakistan ka IT shaabay haasil shuda taqaabuli fazilat ki ubharti misaal hai." },
    },
  ],
};
