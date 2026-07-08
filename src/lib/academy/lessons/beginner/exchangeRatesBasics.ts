import type { Lesson } from "@/lib/academy/types";

export const exchangeRatesBasicsLesson: Lesson = {
  slug: "exchange-rates-basics",
  category: "beginner",
  title: { en: "Exchange Rates: How Currency Values Work", ur: "شرح تبادلہ: کرنسی کی قدر کیسے کام کرتی ہے", rm: "Shar-e-Tabaadla: Currency ki Qadar Kaise Kaam Karti Hai" },
  subtitle: {
    en: "Why the rupee fell from 160 to 300 per dollar — and what that means for you",
    ur: "روپیہ 160 سے 300 فی ڈالر کیوں گرا — اور آپ کے لیے اس کا کیا مطلب ہے",
    rm: "Rupaya 160 se 300 fi dollar kyun gira — aur aap ke liye is ka kya matlab hai",
  },
  level: "beginner",
  readMinutes: 7,
  isPremium: false,
  relatedIndicatorSlugs: ["exchange-rate-pkr-usd"],
  relatedLessonSlugs: ["money-and-currency", "inflation", "trade-basics"],
  content: {
    overview: {
      en: "An exchange rate is the price of one currency in terms of another. If the USD/PKR rate is 278, it means you need Rs 278 to buy one US dollar. Exchange rates change constantly, reflecting supply and demand for each currency. A falling rupee makes imports more expensive and exports cheaper — with huge ripple effects across Pakistan's economy.",
      ur: "شرح تبادلہ ایک کرنسی کی دوسری کے لحاظ سے قیمت ہے۔ اگر USD/PKR ریٹ 278 ہے، تو آپ کو ایک امریکی ڈالر خریدنے کے لیے 278 روپے درکار ہیں۔ گرتا روپیہ درآمدات مہنگی اور برآمدات سستی بناتا ہے۔",
      rm: "Shar-e-tabaadla ek currency ki doosri ke lihaaz se qeemat hai. Agar USD/PKR rate 278 hai, toh aap ko ek Amriki dollar khareedne ke liye 278 rupay darkar hain. Girta rupaya daraamdaat mahangi aur baraamdaat sasti banata hai.",
    },
    whyItMatters: {
      en: "Pakistan imports nearly everything it doesn't produce domestically — petroleum, machinery, edible oils, fertilisers, medicines. When the rupee falls, every import costs more in rupee terms. A 50% rupee depreciation (like Pakistan saw 2020-2023) effectively adds 50% to the cost of every import, fuelling inflation. Conversely, a weak rupee helps exporters — textile exporters earn dollars and convert to more rupees, improving their margins.",
      ur: "پاکستان تقریباً وہ سب کچھ درآمد کرتا ہے جو وہ خود نہیں بناتا — پیٹرولیم، مشینری، خوردنی تیل، کھادیں، دوائیں۔ روپے کی کمی سے ہر درآمد روپے کے لحاظ سے مہنگی ہوتی ہے۔",
      rm: "Pakistan taqreeban woh sab kuch daraamd karta hai jo woh khud nahi banata — petroleum, machinery, khordani tel, khaadein, dawaaein. Rupay ki kami se har daraamd rupay ke lihaaz se mahangi hoti hai.",
    },
    explanation: {
      en: `**What determines exchange rates:**

Supply and demand — just like goods. If Pakistanis want more dollars (to buy imports, invest abroad, or repay foreign debt), demand for dollars rises and the rupee falls. If foreigners send more dollars to Pakistan (through exports, remittances, or investment), rupee demand rises and its value strengthens.

**Fixed vs floating rates:**
- **Fixed/pegged:** Government keeps the currency at a set rate by buying/selling foreign reserves. Easier to plan trade, but requires large reserves and can lead to crises if reserves run out.
- **Floating:** Market determines the rate. Pakistan uses a managed float — SBP intervenes when volatility is extreme but generally lets the market work.

**Real vs nominal exchange rate:**
The nominal rate is the raw number (Rs 278/dollar). The real effective exchange rate (REER) adjusts for inflation differences — if Pakistan has 30% inflation but the US has 3%, Pakistan's goods become more expensive even if the nominal rate is unchanged. SBP publishes the REER monthly.`,
      ur: `**شرح تبادلہ کیا طے کرتی ہے:**

طلب اور رسد — بالکل اشیاء کی طرح۔ اگر پاکستانی زیادہ ڈالر چاہتے ہیں تو ڈالر کی طلب بڑھتی ہے اور روپیہ گرتا ہے۔ اگر غیر ملکی زیادہ ڈالر پاکستان بھیجیں تو روپے کی طلب بڑھتی ہے۔

**مقررہ بمقابلہ تیرتی شرح:**
- **مقررہ:** حکومت ذخائر خرید/بیچ کر کرنسی کو ایک مقررہ شرح پر رکھتی ہے۔
- **تیرتی:** بازار شرح طے کرتا ہے۔ پاکستان ایک منظم فلوٹ استعمال کرتا ہے۔`,
      rm: `**Shar-e-tabaadla kya tay karti hai:**

Talab aur rasad — bilkul cheezain ki tarah. Agar Pakistani zyada dollar chahte hain toh dollar ki talab barhti hai aur rupaya girta hai. Agar ghair mulki zyada dollar Pakistan bhejein toh rupay ki talab barhti hai.

**Muqarrara bamuqaabila teerta shar:**
- **Muqarrara:** Hukoomat zakheray khareedo/beche kar currency ko ek muqarrara shar par rakhti hai.
- **Teerta:** Baazaar shar tay karta hai. Pakistan ek munazzam float istemal karta hai.`,
    },
    misconceptions: {
      en: `**Myth 1: A weaker currency always means a poorer country.** A weaker currency hurts importers but helps exporters and makes tourism attractive. Japan and China have at times deliberately kept currencies weak to boost exports.

**Myth 2: SBP can always defend the rupee.** SBP can only buy rupees by spending foreign reserves. When reserves are depleted (as in Pakistan, 2022-23), SBP cannot sustain the defence — the currency must fall to its market equilibrium.

**Myth 3: Rupee depreciation is always caused by government mismanagement.** Global factors matter hugely — when the US Federal Reserve raises rates, capital flows out of emerging markets like Pakistan, weakening their currencies regardless of domestic policy.`,
      ur: `**غلط فہمی 1: کمزور کرنسی ہمیشہ غریب ملک کا مطلب ہے۔** کمزور کرنسی درآمد کنندگان کو نقصان پہنچاتی ہے لیکن برآمد کنندگان کی مدد کرتی ہے۔

**غلط فہمی 2: SBP ہمیشہ روپے کا دفاع کر سکتا ہے۔** SBP صرف زرمبادلہ ذخائر خرچ کرکے روپے خرید سکتا ہے۔ جب ذخائر ختم ہو جائیں تو دفاع جاری نہیں رہ سکتا۔

**غلط فہمی 3: روپے کی کمی ہمیشہ حکومتی بدانتظامی کی وجہ سے ہے۔** عالمی عوامل بہت اہم ہیں۔`,
      rm: `**Ghalat fehmi 1: Kamzor currency hamesha ghareeb mulk ka matlab hai.** Kamzor currency daraadm kunandagaan ko nuqsaan pahunchati hai lekin baraadm kunandagaan ki madad karti hai.

**Ghalat fehmi 2: SBP hamesha rupay ka difaa kar sakta hai.** SBP sirf zarmbadla zakheray kharch karke rupay khareeed sakta hai.

**Ghalat fehmi 3: Rupay ki kami hamesha hukomaati badintizaami ki wajah se hai.** Aalami awaamileen bahut ahem hain.`,
    },
    pakistanExample: {
      en: `**The 2022-23 rupee crisis:** In 2021, USD/PKR was around Rs 160. By mid-2023 it had crashed to over Rs 300 — nearly halving the rupee's value. The causes were layered: Pakistan's current account deficit surged as imports rose (driven by post-COVID consumption and energy imports). Foreign reserves fell dangerously low (covering only 3-4 weeks of imports at one point). Political uncertainty delayed the IMF programme. This perfect storm collapsed the rupee, directly feeding into the 38% CPI peak — because Pakistan imports so much, especially energy.`,
      ur: `**2022-23 روپے کا بحران:** 2021 میں USD/PKR تقریباً 160 روپے تھا۔ 2023 کے وسط تک 300 روپے سے تجاوز کر گیا۔ وجوہات: جاری کھاتے کا خسارہ بڑھا، زرمبادلہ ذخائر گھٹ کر صرف 3-4 ہفتوں کی درآمدات کے قابل رہ گئے، سیاسی غیر یقینی نے IMF پروگرام تاخیر سے کرایا۔ اس کے نتیجے میں 38% CPI عروج ہوئی۔`,
      rm: `**2022-23 rupay ka bohran:** 2021 mein USD/PKR taqreeban 160 rupay tha. 2023 ke wust tak 300 rupay se tajaaoz kar gaya. Wajohaat: jaari khaate ka khisaara barha, zarmbadla zakheray ghatt kar sirf 3-4 hafton ki daraamdaat ke qaabil reh gaye, siyaasi ghair yaqeeni ne IMF programme taakheer se karaya. Is ke nateeje mein 38% CPI uroooj hua.`,
    },
    realWorld: {
      en: "In 1997, the Asian Financial Crisis caused currencies like the Thai baht, Indonesian rupiah, and South Korean won to collapse by 30-80% within months. Countries that had borrowed heavily in dollars (their debts became unrepayable), imported goods became unaffordable, and millions were pushed into poverty. This shows the devastating impact exchange rate crises can have — and why Pakistan's central bank watches reserves so carefully.",
      ur: "1997 میں، ایشیائی مالیاتی بحران نے تھائی بھاٹ، انڈونیشی روپیہ، اور کورین وون جیسی کرنسیوں کو مہینوں میں 30-80% گرا دیا۔ ڈالر میں بھاری قرض والے ممالک کے قرضے ناقابل ادائیگی ہو گئے۔",
      rm: "1997 mein, Aisiyai maaliyaati bohran ne Thai baht, Indonesi rupiah, aur Korean won jaisi currenciyon ko maheenon mein 30-80% gira diya. Dollar mein bhaari qarz wale mumaalik ke qarzay naaqabil adaaigi ho gaye.",
    },
    summary: {
      en: "• Exchange rate = price of one currency in terms of another\n• Determined by supply and demand for currencies\n• Rupee falls when: imports exceed exports, reserves are low, political uncertainty\n• Weak rupee: hurts importers, helps exporters, fuels inflation\n• Strong rupee: helps importers, hurts exporters, controls import inflation\n• Pakistan uses a managed float — SBP intervenes when needed",
      ur: "• شرح تبادلہ = ایک کرنسی کی دوسری کے لحاظ سے قیمت\n• کرنسیوں کی طلب اور رسد سے طے ہوتی ہے\n• روپیہ گرتا ہے جب: درآمدات برآمدات سے زیادہ، ذخائر کم، سیاسی غیر یقینی\n• کمزور روپیہ: درآمد کنندگان کو نقصان، برآمد کنندگان کی مدد، مہنگائی بڑھائے\n• پاکستان منظم فلوٹ استعمال کرتا ہے",
      rm: "• Shar-e-tabaadla = ek currency ki doosri ke lihaaz se qeemat\n• Currenciyon ki talab aur rasad se tay hoti hai\n• Rupaya girta hai jab: daraamdaat baraamdaat se zyada, zakheray kam, siyaasi ghair yaqeeni\n• Kamzor rupaya: daraadm kunandagaan ko nuqsaan, baraadm kunandagaan ki madad, mahangaai barhaaye\n• Pakistan munazzam float istemal karta hai",
    },
  },
  quiz: [
    {
      question: { en: "If USD/PKR goes from 200 to 280, what happened to the rupee?", ur: "اگر USD/PKR 200 سے 280 ہو جائے، روپے کا کیا ہوا؟", rm: "Agar USD/PKR 200 se 280 ho jaaye, rupay ka kya hua?" },
      options: [
        { en: "The rupee strengthened", ur: "روپیہ مضبوط ہوا", rm: "Rupaya mazboot hua" },
        { en: "The rupee depreciated (lost value)", ur: "روپیہ کمزور ہوا (قدر کھوئی)", rm: "Rupaya kamzor hua (qadar khoi)" },
        { en: "The dollar weakened", ur: "ڈالر کمزور ہوا", rm: "Dollar kamzor hua" },
        { en: "No change in currency value", ur: "کرنسی کی قدر میں کوئی تبدیلی نہیں", rm: "Currency ki qadar mein koi tabdeeli nahi" },
      ],
      correctIndex: 1,
      explanation: { en: "More rupees needed per dollar means the rupee is worth less — it depreciated. Going from 200 to 280 means the rupee lost 28.5% of its dollar value.", ur: "فی ڈالر زیادہ روپے کا مطلب روپیہ کم قیمتی ہے — یہ کمزور ہوا۔ 200 سے 280 جانے کا مطلب روپے نے اپنی ڈالر قدر کا 28.5% کھویا۔", rm: "Fi dollar zyada rupay ka matlab rupaya kam qeemti hai — yeh kamzor hua. 200 se 280 jaane ka matlab rupay ne apni dollar qadar ka 28.5% khoya." },
    },
    {
      question: { en: "A Pakistani textile exporter earns dollars. When the rupee depreciates, their profit in rupees:", ur: "ایک پاکستانی ٹیکسٹائل برآمد کنندہ ڈالر کماتا ہے۔ جب روپیہ کمزور ہو، روپے میں ان کا منافع:", rm: "Ek Pakistani textile baraadm kunanda dollar kamata hai. Jab rupaya kamzor ho, rupay mein un ka munaafa:" },
      options: [
        { en: "Falls because imports are more expensive", ur: "گرتا ہے کیونکہ درآمدات مہنگی ہیں", rm: "Girta hai kyunke daraamdaat mahangi hain" },
        { en: "Rises because each dollar converts to more rupees", ur: "بڑھتا ہے کیونکہ ہر ڈالر زیادہ روپوں میں بدلتا ہے", rm: "Barhta hai kyunke har dollar zyada rupon mein badalta hai" },
        { en: "Stays the same — dollars don't change", ur: "وہی رہتا ہے — ڈالر نہیں بدلتے", rm: "Wahi rahta hai — dollar nahi badalte" },
        { en: "Disappears due to inflation", ur: "مہنگائی کی وجہ سے غائب ہو جاتا ہے", rm: "Mahangaai ki wajah se ghaaib ho jaata hai" },
      ],
      correctIndex: 1,
      explanation: { en: "If an exporter earns $1,000 and converts at Rs 200/$, they get Rs 200,000. At Rs 280/$, they get Rs 280,000 for the same dollar earnings — a 40% boost in rupee terms. Depreciation helps exporters.", ur: "اگر برآمد کنندہ $1,000 کماتا ہے اور 200 روپے/$ پر بدلے، 2 لاکھ روپے ملتے ہیں۔ 280 روپے/$ پر 2.8 لاکھ روپے ملتے ہیں — روپے کے لحاظ سے 40% اضافہ۔", rm: "Agar baraadm kunanda $1,000 kamata hai aur 200 rupay/$ par badle, 2 laakh rupay milte hain. 280 rupay/$ par 2.8 laakh rupay milte hain — rupay ke lihaaz se 40% izaafa." },
    },
    {
      question: { en: "What is Pakistan's exchange rate system called?", ur: "پاکستان کے شرح تبادلہ نظام کو کیا کہا جاتا ہے؟", rm: "Pakistan ke shar-e-tabaadla nizaam ko kya kaha jaata hai?" },
      options: [
        { en: "Fixed peg to the US dollar", ur: "امریکی ڈالر کے ساتھ مقررہ پیگ", rm: "Amriki dollar ke saath muqarrara peg" },
        { en: "Managed float", ur: "منظم فلوٹ", rm: "Munazzam float" },
        { en: "Currency board", ur: "کرنسی بورڈ", rm: "Currency board" },
        { en: "Gold standard", ur: "سونے کا معیار", rm: "Sone ka miyaar" },
      ],
      correctIndex: 1,
      explanation: { en: "Pakistan uses a managed float — the rupee is primarily market-determined but the SBP can intervene by buying/selling foreign exchange when volatility becomes excessive.", ur: "پاکستان منظم فلوٹ استعمال کرتا ہے — روپیہ بنیادی طور پر بازار سے طے ہوتا ہے لیکن SBP ضرورت پر مداخلت کر سکتا ہے۔", rm: "Pakistan munazzam float istemal karta hai — rupaya bunyaadi tor par baazaar se tay hota hai lekin SBP zaroorat par mudaakhalat kar sakta hai." },
    },
    {
      question: { en: "When Pakistan's import bill rises faster than export earnings, what pressure does it put on the rupee?", ur: "جب پاکستان کا درآمدی بل برآمدی کمائی سے تیز بڑھتا ہے، روپے پر کیا دباؤ پڑتا ہے؟", rm: "Jab Pakistan ka daraamdaati bill baraamdaati kamaai se tez barhta hai, rupay par kya dabaao parta hai?" },
      options: [
        { en: "Upward pressure — rupee strengthens", ur: "اوپر کا دباؤ — روپیہ مضبوط ہوتا ہے", rm: "Oopar ka dabaao — rupaya mazboot hota hai" },
        { en: "Downward pressure — rupee depreciates", ur: "نیچے کا دباؤ — روپیہ کمزور ہوتا ہے", rm: "Neeche ka dabaao — rupaya kamzor hota hai" },
        { en: "No effect", ur: "کوئی اثر نہیں", rm: "Koi asar nahi" },
        { en: "Rupee becomes pegged to dollar", ur: "روپیہ ڈالر سے منسلک ہو جاتا ہے", rm: "Rupaya dollar se munsalik ho jaata hai" },
      ],
      correctIndex: 1,
      explanation: { en: "A rising import bill means more demand for dollars. More demand for dollars with limited supply puts downward pressure on the rupee — it depreciates.", ur: "بڑھتا درآمدی بل ڈالر کی بڑھتی طلب کا مطلب ہے۔ محدود رسد کے ساتھ ڈالر کی زیادہ طلب روپے پر نیچے کا دباؤ ڈالتی ہے — یہ کمزور ہوتا ہے۔", rm: "Barhta daraamdaati bill dollar ki barhti talab ka matlab hai. Mahdood rasad ke saath dollar ki zyada talab rupay par neeche ka dabaao daaalti hai — yeh kamzor hota hai." },
    },
  ],
  faq: [
    {
      question: { en: "Why did Pakistan keep the rupee artificially strong before 2023?", ur: "پاکستان نے 2023 سے پہلے روپے کو مصنوعی طور پر مضبوط کیوں رکھا؟", rm: "Pakistan ne 2023 se pehle rupay ko masnooi tor par mazboot kyun rakha?" },
      answer: { en: "Administrations sometimes maintain an overvalued exchange rate to keep import prices low (controlling inflation) and to avoid the political backlash of visible depreciation. But this burns through foreign reserves as SBP buys rupees to support the rate. When reserves run out, the forced correction is sharp and painful — which is exactly what happened in 2022-23.", ur: "انتظامیہ بعض اوقات مصنوعی طور پر اونچی شرح تبادلہ برقرار رکھتی ہے تاکہ درآمدی قیمتیں کم رکھیں اور سیاسی ردعمل سے بچیں۔ لیکن یہ ذخائر جلا دیتا ہے۔ جب ذخائر ختم ہوں تو زبردستی اصلاح تیز اور تکلیف دہ ہوتی ہے۔", rm: "Intizaamiya baaz auqaat masnooi tor par oonchi shar-e-tabaadla baqaraari rakhti hai taake daraamdaati qeematen kam rakhen aur siyaasi rad-e-amal se bachen. Lekin yeh zakheray jala deta hai." },
    },
    {
      question: { en: "What are Pakistan's main sources of dollar inflows that support the rupee?", ur: "پاکستان کے ڈالر آمد کے اہم ذرائع کیا ہیں جو روپے کی حمایت کرتے ہیں؟", rm: "Pakistan ke dollar aamad ke ahem zaraaiye kya hain jo rupay ki himaayat karte hain?" },
      answer: { en: "Pakistan's main dollar inflows are: (1) Exports (textiles account for ~55-60% of all exports), (2) Worker remittances (over $27 billion/year — the single largest source), (3) Foreign direct investment (FDI), (4) Foreign portfolio investment, (5) External loans (IMF, World Bank, bilateral), and (6) SBP's own reserves drawdowns. Remittances are especially vital — they're more stable than exports or FDI.", ur: "پاکستان کے اہم ڈالر آمد ذرائع: (1) برآمدات (ٹیکسٹائل ~55-60%)، (2) ترسیلات زر ($27 ارب سے زیادہ سالانہ — سب سے بڑا ذریعہ)، (3) غیر ملکی براہ راست سرمایہ کاری، (4) بیرونی قرضے، (5) SBP کے اپنے ذخائر۔", rm: "Pakistan ke ahem dollar aamad zaraaiye: (1) baraamdaat (textile ~55-60%), (2) tarseelaate zer ($27 arab se zyada saalaana — sab se bara zariya), (3) ghair mulki baraah-e-raast sarmaaya kaari, (4) baeruni qarzay, (5) SBP ke apne zakheray." },
    },
  ],
};
