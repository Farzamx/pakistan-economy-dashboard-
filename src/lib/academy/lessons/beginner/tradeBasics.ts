import type { Lesson } from "@/lib/academy/types";

export const tradeBasicsLesson: Lesson = {
  slug: "trade-basics",
  category: "beginner",
  title: { en: "International Trade: Exports, Imports & Trade Balance", ur: "بین الاقوامی تجارت: برآمدات، درآمدات اور تجارتی توازن", rm: "Bayn-ul-Aqwaami Tijarat: Baraamdaat, Daraamdaat aur Tijarati Tawazun" },
  subtitle: {
    en: "Why countries trade, what Pakistan exports and imports, and why the trade deficit matters",
    ur: "ممالک تجارت کیوں کرتے ہیں، پاکستان کیا برآمد اور درآمد کرتا ہے، اور تجارتی خسارہ کیوں اہم ہے",
    rm: "Mumaalik tijarat kyun karte hain, Pakistan kya baraadm aur daraadm karta hai, aur tijarati khisaara kyun ahem hai",
  },
  level: "beginner",
  readMinutes: 8,
  isPremium: false,
  relatedIndicatorSlugs: ["trade-balance-pakistan", "exports-pakistan"],
  relatedLessonSlugs: ["exchange-rates-basics", "comparative-advantage", "pakistan-economy-overview"],
  content: {
    overview: {
      en: "International trade is buying and selling between countries. Exports are goods/services a country sells to foreigners; imports are what it buys from them. If imports exceed exports, there's a trade deficit. Pakistan consistently runs large trade deficits — importing far more (especially energy and machinery) than it exports (mainly textiles). This deficit has to be financed somehow, which is a core driver of Pakistan's recurring balance-of-payments crises.",
      ur: "بین الاقوامی تجارت ممالک کے درمیان خریدو فروخت ہے۔ برآمدات وہ اشیاء/خدمات ہیں جو ملک غیر ملکیوں کو بیچتا ہے؛ درآمدات وہ ہیں جو وہ ان سے خریدتا ہے۔ اگر درآمدات برآمدات سے زیادہ ہوں، تجارتی خسارہ ہوتا ہے۔",
      rm: "Bayn-ul-Aqwaami tijarat mumaalik ke darmiyan khareedu farokht hai. Baraamdaat woh cheezain/khadamaat hain jo mulk ghair mulkiyon ko bechta hai; daraamdaat woh hain jo woh un se khareedta hai. Agar daraamdaat baraamdaat se zyada hon, tijarati khisaara hota hai.",
    },
    whyItMatters: {
      en: "Pakistan's trade deficit has repeatedly triggered currency crises. In FY2022, Pakistan's trade deficit hit a record $48 billion — imports far exceeded exports. This created massive demand for dollars (to pay importers), exhausted foreign reserves, and crashed the rupee. Understanding trade helps explain why Pakistan's economic health so often depends on IMF bailouts and why boosting exports is a strategic national priority.",
      ur: "پاکستان کے تجارتی خسارے نے بار بار کرنسی بحران پیدا کیا ہے۔ FY2022 میں پاکستان کا تجارتی خسارہ ریکارڈ 48 ارب ڈالر تک پہنچا۔ اس سے ڈالر کی بہت زیادہ طلب پیدا ہوئی، زرمبادلہ ذخائر ختم ہوئے، اور روپیہ گرا۔",
      rm: "Pakistan ke tijarati khisaare ne baar baar currency bohran paida kiya hai. FY2022 mein Pakistan ka tijarati khisaara record 48 arab dollar tak pahuncha. Is se dollar ki bahut zyada talab paida hui, zarmbadla zakheray khatam hue, aur rupaya gira.",
    },
    explanation: {
      en: `**Why countries trade:**
Countries trade because they're better at producing certain things than others — this is comparative advantage (covered in a separate lesson). Trade lets Pakistan buy petroleum cheaply from the Middle East instead of producing it domestically at far higher cost, while selling textiles to Europe where labour is far more expensive.

**Pakistan's exports:**
- Textiles and garments: ~55-60% of total exports (~$18-20 billion)
- Rice: second largest export
- Sports goods, leather, surgical instruments, chemicals
- IT/software services: growing rapidly (now ~$3 billion/year)

**Pakistan's imports:**
- Petroleum and energy products: typically 20-25% of total imports
- Machinery and equipment
- Edible oils (palm oil from Indonesia/Malaysia)
- Chemicals and fertilisers
- Iron and steel

**Trade balance:** Exports minus imports = trade balance. Pakistan usually runs $25-30 billion deficit on goods. Services partially offset this (e.g., IT exports). Combined goods+services is the trade deficit in the current account.`,
      ur: `**ممالک تجارت کیوں کرتے ہیں:**
ممالک تجارت کرتے ہیں کیونکہ وہ کچھ چیزیں دوسروں سے بہتر بناتے ہیں — یہ تقابلی فضیلت ہے۔

**پاکستان کی برآمدات:**
- ٹیکسٹائل اور لباس: کل برآمدات کا ~55-60%
- چاول، کھیلوں کا سامان، چمڑا، سرجیکل آلات
- IT خدمات: تیزی سے بڑھ رہی ہیں (~3 ارب ڈالر سالانہ)

**پاکستان کی درآمدات:**
- پیٹرولیم اور توانائی: عام طور پر درآمدات کا 20-25%
- مشینری، خوردنی تیل، کیمیکل، لوہا اور اسٹیل`,
      rm: `**Mumaalik tijarat kyun karte hain:**
Mumaalik tijarat karte hain kyunke woh kuch cheezain doosron se behtar banate hain — yeh taqaabuli fazilat hai.

**Pakistan ki baraamdaat:**
- Textile aur libaas: kul baraamdaat ka ~55-60%
- Chaawal, khelon ka saamaan, chamra, surgical aalaat
- IT khadamaat: tezi se barh rahi hain (~3 arab dollar saalaana)

**Pakistan ki daraamdaat:**
- Petroleum aur tawanaayi: aam tor par daraamdaat ka 20-25%
- Machinery, khordani tel, chemicals, loha aur steel`,
    },
    misconceptions: {
      en: `**Myth 1: Trade deficits are always bad.** A trade deficit means a country is consuming more than it produces — which can be fine if financed by productive investment (as the US has run deficits for decades). It becomes problematic when financed by unsustainable debt or reserve depletion — Pakistan's recurring issue.

**Myth 2: Restricting imports fixes the trade deficit.** Import bans or tariffs raise costs for domestic industries that use imported inputs (fertiliser, machinery, raw materials) and can trigger trade wars. Pakistan's ad-hoc import bans in 2022-23 caused severe shortages in industry.

**Myth 3: Pakistan's textile dominance is a strength only.** Depending on one sector (60% of exports from textiles) makes Pakistan extremely vulnerable to global textile demand shocks, competition from cheaper producers (Bangladesh, Vietnam), and cotton crop failures.`,
      ur: `**غلط فہمی 1: تجارتی خسارہ ہمیشہ برا ہے۔** تجارتی خسارہ کا مطلب ہے ملک پیداوار سے زیادہ استعمال کر رہا ہے — اگر نتیجہ خیز سرمایہ کاری سے فنانس ہو تو ٹھیک ہو سکتا ہے۔

**غلط فہمی 2: درآمدات پر پابندی تجارتی خسارہ ٹھیک کرتی ہے۔** پاکستان کی 2022-23 درآمدی پابندیوں نے صنعت میں شدید کمی پیدا کی۔

**غلط فہمی 3: ٹیکسٹائل میں پاکستان کا غلبہ صرف مضبوطی ہے۔** ایک شعبے پر انحصار (60% ٹیکسٹائل) پاکستان کو بہت کمزور بناتا ہے۔`,
      rm: `**Ghalat fehmi 1: Tijarati khisaara hamesha bura hai.** Tijarati khisaara ka matlab hai mulk paidawar se zyada istemal kar raha hai — agar nateeja khaiz sarmaaya kaari se finance ho toh theek ho sakta hai.

**Ghalat fehmi 2: Daraamdaat par paabandi tijarati khisaara theek karti hai.** Pakistan ki 2022-23 daraamdaati paabandion ne sanaaat mein shadeed kami paida ki.

**Ghalat fehmi 3: Textile mein Pakistan ka ghalba sirf mazbooti hai.** Ek shaabay par inhisaar (60% textile) Pakistan ko bahut kamzor banata hai.`,
    },
    pakistanExample: {
      en: `**FY2022 trade crisis:** Pakistan's import bill surged to $80 billion (driven by high global energy and commodity prices post-COVID, plus domestic demand surge under the Imran Khan government). Exports were around $32 billion — leaving a massive $48 billion goods trade deficit. With remittances of ~$31 billion, the current account deficit was still $17 billion. Pakistan's reserves fell to dangerously low levels, triggering the currency crisis. This sequence — import surge → reserve depletion → currency crisis → IMF bailout — has repeated several times in Pakistan's history.`,
      ur: `**FY2022 تجارتی بحران:** پاکستان کا درآمدی بل $80 ارب تک بڑھا (عالمی توانائی قیمتوں میں اضافے سے)۔ برآمدات تقریباً $32 ارب تھیں — $48 ارب کا وسیع تجارتی خسارہ۔ ذخائر خطرناک حد تک گرے، کرنسی بحران آیا، IMF کا بیل آؤٹ ہوا۔`,
      rm: `**FY2022 tijarati bohran:** Pakistan ka daraamdaati bill $80 arab tak barha (aalami tawanaayi qeematon mein izaafe se). Baraamdaat taqreeban $32 arab thin — $48 arab ka wasee tijarati khisaara. Zakheray khatarnaak hadd tak gire, currency bohran aaya, IMF ka bail-out hua.`,
    },
    realWorld: {
      en: "China's trade surplus (exporting far more than it imports) has been a geopolitical lightning rod — the US blames it for American manufacturing job losses. China's strategy of undervaluing its currency (the yuan) and subsidising exports gave Chinese manufacturers cost advantages. This US-China trade tension led to tariff wars starting in 2018, disrupting global supply chains and raising prices worldwide — showing how trade imbalances have real geopolitical consequences.",
      ur: "چین کا تجارتی فاضل (درآمدات سے بہت زیادہ برآمدات) ایک جغرافیائی سیاسی بجلی کی چھڑی رہا ہے۔ امریکہ اسے امریکی مینوفیکچرنگ نوکریوں کے نقصان کا ذمہ دار ٹھہراتا ہے۔ اس سے 2018 سے ٹیرف جنگیں شروع ہوئیں۔",
      rm: "China ka tijarati faazil (daraamdaat se bahut zyada baraamdaat) ek jughraafiaayi siyaasi bijli ki chhuri raha hai. America use Amriki manufacturing naukriyon ke nuqsaan ka zimmaadaar thahraata hai. Is se 2018 se tariff jangein shuru huin.",
    },
    summary: {
      en: "• Exports = sell to foreigners; Imports = buy from foreigners\n• Trade balance = Exports − Imports; Pakistan usually has a deficit\n• Pakistan exports mainly textiles (~60%) and rice\n• Pakistan imports mainly petroleum (~25%), machinery, edible oils\n• Persistent deficits must be financed: remittances, FDI, loans, reserve drawdowns\n• Large deficits → dollar demand → rupee depreciation → inflation",
      ur: "• برآمدات = غیر ملکیوں کو بیچنا؛ درآمدات = غیر ملکیوں سے خریدنا\n• تجارتی توازن = برآمدات − درآمدات؛ پاکستان میں عام طور پر خسارہ ہوتا ہے\n• پاکستان بنیادی طور پر ٹیکسٹائل (~60%) اور چاول برآمد کرتا ہے\n• پاکستان بنیادی طور پر پیٹرولیم (~25%)، مشینری، خوردنی تیل درآمد کرتا ہے\n• بڑے خسارے → ڈالر طلب → روپیہ کمزور → مہنگائی",
      rm: "• Baraamdaat = ghair mulkiyon ko bechna; Daraamdaat = ghair mulkiyon se khareedna\n• Tijarati tawazun = baraamdaat − daraamdaat; Pakistan mein aam tor par khisaara hota hai\n• Pakistan bunyaadi tor par textile (~60%) aur chaawal baraadm karta hai\n• Pakistan bunyaadi tor par petroleum (~25%), machinery, khordani tel daraadm karta hai\n• Bare khisaare → dollar talab → rupaya kamzor → mahangaai",
    },
  },
  quiz: [
    {
      question: { en: "Pakistan sells rice to Saudi Arabia. This is an example of:", ur: "پاکستان سعودی عرب کو چاول بیچتا ہے۔ یہ اس کی مثال ہے:", rm: "Pakistan Saudi Arabia ko chaawal bechta hai. Yeh is ki misaal hai:" },
      options: [
        { en: "An import for Pakistan", ur: "پاکستان کے لیے ایک درآمد", rm: "Pakistan ke liye ek daraamd" },
        { en: "An export for Pakistan", ur: "پاکستان کے لیے ایک برآمد", rm: "Pakistan ke liye ek baraadm" },
        { en: "A trade deficit for Pakistan", ur: "پاکستان کے لیے تجارتی خسارہ", rm: "Pakistan ke liye tijarati khisaara" },
        { en: "An import for Saudi Arabia", ur: "سعودی عرب کے لیے ایک درآمد", rm: "Saudi Arabia ke liye ek daraamd" },
      ],
      correctIndex: 1,
      explanation: { en: "When Pakistan sells goods to foreign countries, those are Pakistan's exports. Saudi Arabia is importing the rice, but from Pakistan's perspective it's an export.", ur: "جب پاکستان غیر ملکیوں کو سامان بیچتا ہے، یہ پاکستان کی برآمدات ہیں۔ سعودی عرب کے نقطہ نظر سے یہ درآمد ہے، لیکن پاکستان کے نقطہ نظر سے یہ برآمد ہے۔", rm: "Jab Pakistan ghair mulkiyon ko saamaan bechta hai, yeh Pakistan ki baraamdaat hain. Saudi Arabia ke nuqta-e-nazar se yeh daraamd hai, lekin Pakistan ke nuqta-e-nazar se yeh baraadm hai." },
    },
    {
      question: { en: "Pakistan's exports are $30 billion and imports are $55 billion. What is the trade balance?", ur: "پاکستان کی برآمدات $30 ارب اور درآمدات $55 ارب ہیں۔ تجارتی توازن کیا ہے؟", rm: "Pakistan ki baraamdaat $30 arab aur daraamdaat $55 arab hain. Tijarati tawazun kya hai?" },
      options: [
        { en: "$25 billion surplus", ur: "$25 ارب فاضل", rm: "$25 arab faazil" },
        { en: "$25 billion deficit", ur: "$25 ارب خسارہ", rm: "$25 arab khisaara" },
        { en: "$85 billion balance", ur: "$85 ارب توازن", rm: "$85 arab tawazun" },
        { en: "Zero — they balance out", ur: "صفر — وہ برابر ہو جاتے ہیں", rm: "Sifar — woh barabar ho jaate hain" },
      ],
      correctIndex: 1,
      explanation: { en: "$30bn exports − $55bn imports = −$25bn (a $25 billion trade deficit). Pakistan imports $25 billion more than it exports.", ur: "$30 ارب برآمدات − $55 ارب درآمدات = −$25 ارب (25 ارب ڈالر کا تجارتی خسارہ)۔ پاکستان برآمدات سے $25 ارب زیادہ درآمد کرتا ہے۔", rm: "$30 arab baraamdaat − $55 arab daraamdaat = −$25 arab ($25 arab dollar ka tijarati khisaara). Pakistan baraamdaat se $25 arab zyada daraamd karta hai." },
    },
    {
      question: { en: "Which sector dominates Pakistan's exports?", ur: "پاکستان کی برآمدات میں کون سا شعبہ غالب ہے؟", rm: "Pakistan ki baraamdaat mein kaun sa shaabay ghaalib hai?" },
      options: [
        { en: "Oil and gas", ur: "تیل اور گیس", rm: "Tel aur gas" },
        { en: "Textiles and garments", ur: "ٹیکسٹائل اور لباس", rm: "Textile aur libaas" },
        { en: "Software and IT", ur: "سافٹ ویئر اور IT", rm: "Software aur IT" },
        { en: "Automobiles", ur: "موٹر گاڑیاں", rm: "Motor gaariyan" },
      ],
      correctIndex: 1,
      explanation: { en: "Textiles and garments account for approximately 55-60% of Pakistan's total exports — making Pakistan heavily dependent on one sector.", ur: "ٹیکسٹائل اور لباس پاکستان کی کل برآمدات کا تقریباً 55-60% ہیں — پاکستان کو ایک شعبے پر بہت زیادہ انحصار کرتا ہے۔", rm: "Textile aur libaas Pakistan ki kul baraamdaat ka taqreeban 55-60% hain — Pakistan ko ek shaabay par bahut zyada inhisaar karta hai." },
    },
    {
      question: { en: "A persistent trade deficit (Pakistan imports much more than it exports) tends to cause:", ur: "مستقل تجارتی خسارہ (پاکستان برآمدات سے بہت زیادہ درآمد کرتا ہے) عام طور پر کیا پیدا کرتا ہے؟", rm: "Mustaqil tijarati khisaara (Pakistan baraamdaat se bahut zyada daraamd karta hai) aam tor par kya paida karta hai?" },
      options: [
        { en: "Stronger rupee and lower inflation", ur: "مضبوط روپیہ اور کم مہنگائی", rm: "Mazboot rupaya aur kam mahangaai" },
        { en: "Dollar demand, rupee depreciation, and inflation", ur: "ڈالر طلب، روپے کی کمی، اور مہنگائی", rm: "Dollar talab, rupay ki kami, aur mahangaai" },
        { en: "Higher exports automatically next year", ur: "اگلے سال خودبخود زیادہ برآمدات", rm: "Agle saal khud-ba-khud zyada baraamdaat" },
        { en: "Lower interest rates", ur: "کم شرح سود", rm: "Kam shar-e-sood" },
      ],
      correctIndex: 1,
      explanation: { en: "Persistent deficits require dollars to pay for excess imports. This increases demand for dollars, weakening the rupee, which raises import costs in rupee terms, fuelling inflation.", ur: "مستقل خسارے زیادہ درآمدات کی ادائیگی کے لیے ڈالر درکار کرتے ہیں۔ اس سے ڈالر کی طلب بڑھتی ہے، روپیہ کمزور ہوتا ہے، درآمدات مہنگی ہوتی ہیں، مہنگائی بڑھتی ہے۔", rm: "Mustaqil khisaare zyada daraamdaat ki adaaigi ke liye dollar darkar karte hain. Is se dollar ki talab barhti hai, rupaya kamzor hota hai, daraamdaat mahangi hoti hain, mahangaai barhti hai." },
    },
  ],
  faq: [
    {
      question: { en: "Why can't Pakistan just ban imports to fix the trade deficit?", ur: "پاکستان تجارتی خسارہ ٹھیک کرنے کے لیے صرف درآمدات پر پابندی کیوں نہیں لگا سکتا؟", rm: "Pakistan tijarati khisaara theek karne ke liye sirf daraamdaat par paabandi kyun nahi laga sakta?" },
      answer: { en: "Many Pakistani imports are essential inputs for domestic production — petroleum powers factories and transport, machinery is needed for manufacturing, fertilisers grow food crops. Banning them kills production. Pakistan tried ad-hoc import bans in 2022-23, causing severe shortages in industry, rising costs, and factory closures. The real solution is boosting export competitiveness and energy self-sufficiency over time.", ur: "پاکستان کی بہت سی درآمدات گھریلو پیداوار کے لیے ضروری ہیں — پیٹرولیم فیکٹریاں چلاتا ہے، کھادیں فصلیں اگاتی ہیں۔ ان پر پابندی پیداوار ختم کرتی ہے۔ اصل حل برآمدی مسابقت کو وقت کے ساتھ بڑھانا ہے۔", rm: "Pakistan ki bahut si daraamdaat ghar ka paidawar ke liye zaroori hain — petroleum factories chalata hai, khaadein faslen ugaati hain. In par paabandi paidawar khatam karti hai. Asl hal baraamdaati muqaabat ko waqt ke saath barhana hai." },
    },
    {
      question: { en: "What role do remittances play in Pakistan's trade/current account picture?", ur: "پاکستان کے تجارتی/جاری کھاتے کی تصویر میں ترسیلات زر کا کیا کردار ہے؟", rm: "Pakistan ke tijarati/jaari khaate ki tasweer mein tarseelaate zer ka kya kirdar hai?" },
      answer: { en: "Remittances (money sent home by overseas Pakistanis) are now over $27 billion/year — larger than Pakistan's total export earnings from goods alone. They're recorded in the current account as a credit, partially offsetting the trade deficit. Without remittances, Pakistan's current account deficit would be catastrophically larger. This makes the diaspora's economic contribution vital — more than any single export category.", ur: "ترسیلات زر (بیرون ملک پاکستانیوں کی بھیجی رقم) اب $27 ارب سے زیادہ سالانہ ہیں — اشیاء کی برآمدات سے زیادہ۔ یہ جاری کھاتے میں کریڈٹ کے طور پر ریکارڈ ہوتی ہیں، تجارتی خسارے کو جزوی طور پر متوازن کرتی ہیں۔", rm: "Tarseelaate zer (bairun-e-mulk Pakistaniyon ki bhejee raqam) ab $27 arab se zyada saalaana hain — cheezain ki baraamdaat se zyada. Yeh jaari khaate mein credit ke tor par record hoti hain, tijarati khisaare ko juzwi tor par mutawazin karti hain." },
    },
  ],
};
