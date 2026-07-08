import type { Lesson } from "@/lib/academy/types";

export const marketTypesLesson: Lesson = {
  slug: "market-types",
  category: "beginner",
  title: { en: "Types of Markets: From Competition to Monopoly", ur: "بازار کی اقسام: مقابلے سے اجارہ داری تک", rm: "Baazaar ki Iqsaam: Muqaablay se Ijaara Daari tak" },
  subtitle: {
    en: "How market structure determines prices, quality, and innovation — and what that means for Pakistan's industries",
    ur: "بازار کا ڈھانچہ کس طرح قیمتیں، معیار اور اختراع طے کرتا ہے — اور پاکستان کی صنعتوں کے لیے اس کا کیا مطلب ہے",
    rm: "Baazaar ka dhaancha kis tarah qeematen, miyaar aur ikhtiraaa tay karta hai — aur Pakistan ki sanaaton ke liye is ka kya matlab hai",
  },
  level: "beginner",
  readMinutes: 7,
  isPremium: false,
  relatedIndicatorSlugs: [],
  relatedLessonSlugs: ["supply-and-demand", "market-failure", "price-signals"],
  content: {
    overview: {
      en: "Not all markets are the same. The number of sellers and their market power determines prices, quality, and innovation. At one extreme: perfect competition (many sellers, identical products, no pricing power). At the other: monopoly (one seller, controls price). Most real markets fall somewhere in between. Understanding market structure explains why mobile data was expensive before Jazz/Telenor competition and why WAPDA kept electricity expensive for decades.",
      ur: "تمام بازار ایک جیسے نہیں ہیں۔ فروخت کنندگان کی تعداد اور ان کی بازار طاقت قیمتیں، معیار اور اختراع طے کرتی ہے۔ ایک انتہا پر: کامل مقابلہ (بہت سے فروخت کنندگان، یکساں مصنوعات)۔ دوسری انتہا پر: اجارہ داری (ایک فروخت کنندہ)۔",
      rm: "Tamam baazaar ek jaise nahi hain. Farokht kunandagaan ki tadaad aur un ki baazaar taaqat qeematen, miyaar aur ikhtiraaa tay karti hai. Ek intiha par: kaamil muqaabla (bahut se farokht kunandagaan, yaksan masnooaat). Doosri intiha par: ijaara daari (ek farokht kunanda).",
    },
    whyItMatters: {
      en: "Pakistan has several heavily concentrated industries where a handful of firms control most of the market — cement (5 groups dominate), sugar (political-connected mills), fertiliser, media. In these oligopolies, consumers pay above-competitive prices and innovation lags. Understanding market structure helps you see why competition policy matters and why price regulation or antitrust enforcement exists.",
      ur: "پاکستان میں کئی انتہائی مرتکز صنعتیں ہیں جہاں مٹھی بھر کمپنیاں زیادہ تر بازار کنٹرول کرتی ہیں — سیمنٹ، چینی، کھاد، میڈیا۔ ان اولیگوپولیز میں، صارفین مسابقتی قیمتوں سے اوپر ادا کرتے ہیں۔",
      rm: "Pakistan mein kai intihaai mumarkkaz sanaaten hain jahan muthi bhar kampaniyaan zyada tar baazaar control karti hain — cement, cheeni, khaad, media. In oligopolies mein, sarfeen musaabiqati qeematon se oopar ada karte hain.",
    },
    explanation: {
      en: `**Four main market structures:**

**1. Perfect competition:** Many sellers, identical products, free entry/exit. No single seller has pricing power. Price = marginal cost. Example: Pakistan's vegetable markets, wheat farming. Efficient but rarely seen in modern industry.

**2. Monopolistic competition:** Many sellers, but differentiated products. Each has some pricing power due to brand/quality differences. Competition on quality, marketing, and slight price differences. Example: restaurants, clothing brands, pharmacies.

**3. Oligopoly:** Few large firms dominate. Decisions are interdependent — when one raises prices, others react. Can lead to tacit collusion (firms informally coordinate to keep prices high). Pakistan's cement industry: 5-6 groups control ~95% of capacity.

**4. Monopoly:** One seller with no close substitutes. Sets price to maximise profit — far above competitive levels. May arise through exclusive rights (PTCL before liberalisation), network effects (WhatsApp), or resource control. Governments often regulate natural monopolies (utilities).

**Competition policy:** Pakistan has the Competition Commission of Pakistan (CCP), established in 2007, to prevent anti-competitive practices — price fixing, abuse of dominance, anti-competitive mergers.`,
      ur: `**چار اہم بازار ڈھانچے:**

**1. کامل مقابلہ:** بہت سے فروخت کنندگان، یکساں مصنوعات، آزاد داخلہ۔ مثال: پاکستان کی سبزی کی منڈیاں۔

**2. اجارہ داری مقابلہ:** بہت سے فروخت کنندگان لیکن مختلف مصنوعات۔ مثال: ریستوران، لباس کے برانڈ۔

**3. اولیگوپولی:** چند بڑی کمپنیاں۔ پاکستان کی سیمنٹ صنعت: 5-6 گروپ ~95% صلاحیت کنٹرول کرتے ہیں۔

**4. اجارہ داری:** ایک فروخت کنندہ، کوئی قریبی متبادل نہیں۔ منافع کو زیادہ سے زیادہ کرنے کے لیے قیمت مقرر کرتا ہے۔

**مسابقتی پالیسی:** پاکستان کا Competition Commission of Pakistan (CCP) 2007 میں قائم ہوا۔`,
      rm: `**Chaar ahem baazaar dhaanche:**

**1. Kaamil muqaabla:** Bahut se farokht kunandagaan, yaksan masnooaat. Misaal: Pakistan ki sabzi ki mandiyan.

**2. Ijaara daari muqaabla:** Bahut se farokht kunandagaan lekin mukhtalif masnooaat. Misaal: rastoraan, libaas ke brands.

**3. Oligopoly:** Chand bari kampaniyaan. Pakistan ki cement sanaaton: 5-6 group ~95% salahiyat control karte hain.

**4. Ijaara daari:** Ek farokht kunanda, koi qareeb mutabadil nahi. Munaafe ko zyada se zyada karne ke liye qeemat muqarrar karta hai.

**Musaabiqati policy:** Pakistan ka CCP 2007 mein qaaim hua.`,
    },
    misconceptions: {
      en: `**Myth 1: Perfect competition is ideal in all industries.** Some industries need large scale to be efficient (power plants, railways) — called natural monopolies. Breaking these into many small firms would raise costs, not lower them.

**Myth 2: Monopolies are always bad.** Patent-protected monopolies give innovators time to recoup R&D investment — without them, no one would invest in new drugs or technologies. The question is whether the monopoly period is right.

**Myth 3: Pakistan's sugar and cement oligopolies are unavoidable.** They are partly the result of political connections that secured licences, protected importation, and limited competition. Stronger competition policy could reform them.`,
      ur: `**غلط فہمی 1: کامل مقابلہ تمام صنعتوں میں مثالی ہے۔** کچھ صنعتوں کو موثر ہونے کے لیے بڑے پیمانے کی ضرورت ہے — قدرتی اجارہ داری۔

**غلط فہمی 2: اجارہ داری ہمیشہ بری ہے۔** پیٹنٹ سے محفوظ اجارہ داریاں اختراع کنندگان کو سرمایہ کاری واپس لینے کا وقت دیتی ہیں۔

**غلط فہمی 3: پاکستان کی چینی اور سیمنٹ اولیگوپولیز ناگزیر ہیں۔** یہ جزوی طور پر سیاسی تعلقات کا نتیجہ ہیں۔`,
      rm: `**Ghalat fehmi 1: Kaamil muqaabla tamam sanaaton mein misaali hai.** Kuch sanaaton ko moassir hone ke liye bare paimane ki zaroorat hai — qudrati ijaara daari.

**Ghalat fehmi 2: Ijaara daari hamesha buri hai.** Patent se mahfooz ijaara daariyan ikhtiraaa kunandagaan ko sarmaaya kaari waapis lene ka waqt deti hain.

**Ghalat fehmi 3: Pakistan ki cheeni aur cement oligopolies naaguzeer hain.** Yeh juzwi tor par siyaasi taluqaat ka nateeja hain.`,
    },
    pakistanExample: {
      en: `**Pakistan's cement oligopoly:** Pakistan's cement industry is dominated by ~5-6 groups (Lucky Cement, DG Khan Cement, Maple Leaf, Bestway, Power Cement, etc.) that collectively control over 95% of capacity. Pakistan's cement prices have historically been among the highest in the region despite adequate domestic capacity — a sign of oligopolistic pricing behaviour. The CCP has investigated cement price-fixing several times but enforcement has been limited by political economy pressures.`,
      ur: `**پاکستان کی سیمنٹ اولیگوپولی:** پاکستان کی سیمنٹ صنعت ~5-6 گروپوں کے زیر تسلط ہے (لکی سیمنٹ، DG خان سیمنٹ، وغیرہ) جو مجموعی طور پر 95%+ صلاحیت کنٹرول کرتے ہیں۔ پاکستان کی سیمنٹ قیمتیں تاریخی طور پر خطے میں سب سے زیادہ رہی ہیں۔`,
      rm: `**Pakistan ki cement oligopoly:** Pakistan ki cement sanaaton ~5-6 groupon ke zer-e-tasallut hai (Lucky Cement, DG Khan Cement, waghera) jo majmooee tor par 95%+ salahiyat control karte hain. Pakistan ki cement qeematen taarikhhi tor par khitay mein sab se zyada rahi hain.`,
    },
    realWorld: {
      en: "Amazon's rise shows how a competitive market can become oligopolistic over time. In its early years, Amazon competed against thousands of online retailers. Today, Amazon controls ~40% of US e-commerce and uses its platform dominance, data advantage, and logistics network to maintain barriers to entry. US regulators are now investigating whether Amazon has become an illegal monopoly — showing that market structure evolves and requires ongoing oversight.",
      ur: "Amazon کا عروج دکھاتا ہے کہ مسابقتی بازار وقت کے ساتھ اولیگوپولسٹک کیسے بن سکتا ہے۔ آج Amazon US ای کامرس کا ~40% کنٹرول کرتا ہے۔ امریکی ریگولیٹرز اب تحقیقات کر رہے ہیں کہ آیا Amazon غیر قانونی اجارہ داری بن گیا ہے۔",
      rm: "Amazon ka uroooj dikhata hai ke musaabiqati baazaar waqt ke saath oligopolistic kaise ban sakta hai. Aaj Amazon US e-commerce ka ~40% control karta hai. Amriki regulators ab tahqeeqaat kar rahe hain ke aaya Amazon ghair qaanooni ijaara daari ban gaya hai.",
    },
    summary: {
      en: "• Perfect competition: many sellers, identical products, competitive prices\n• Monopolistic competition: many sellers, differentiated products, brand competition\n• Oligopoly: few dominant firms, interdependent pricing, risk of collusion\n• Monopoly: single seller, no substitutes, sets above-competitive prices\n• Pakistan's cement, sugar, fertiliser: heavily oligopolistic\n• CCP (Competition Commission of Pakistan) enforces competition law\n• Natural monopolies (utilities) are regulated rather than broken up",
      ur: "• کامل مقابلہ: بہت سے فروخت کنندگان، یکساں مصنوعات، مسابقتی قیمتیں\n• اجارہ داری مقابلہ: بہت سے فروخت کنندگان، مختلف مصنوعات\n• اولیگوپولی: چند غالب کمپنیاں، سازباز کا خطرہ\n• اجارہ داری: واحد فروخت کنندہ، مسابقت سے اوپر قیمتیں\n• پاکستان کی سیمنٹ، چینی، کھاد: انتہائی اولیگوپولسٹک\n• CCP مسابقتی قانون نافذ کرتا ہے",
      rm: "• Kaamil muqaabla: bahut se farokht kunandagaan, yaksan masnooaat, musaabiqati qeematen\n• Ijaara daari muqaabla: bahut se farokht kunandagaan, mukhtalif masnooaat\n• Oligopoly: chand ghaalib kampaniyaan, saaz-baaz ka khatara\n• Ijaara daari: waahid farokht kunanda, musaabiqat se oopar qeematen\n• Pakistan ki cement, cheeni, khaad: intihaai oligopolistic\n• CCP musaabiqati qaanoon naafiz karta hai",
    },
  },
  quiz: [
    {
      question: { en: "Pakistan's cement industry is dominated by 5-6 companies controlling 95%+ of capacity. This is an example of:", ur: "پاکستان کی سیمنٹ صنعت 5-6 کمپنیوں کے زیر تسلط ہے جو 95%+ صلاحیت کنٹرول کرتی ہیں۔ یہ اس کی مثال ہے:", rm: "Pakistan ki cement sanaaton 5-6 kampaniyon ke zer-e-tasallut hai jo 95%+ salahiyat control karti hain. Yeh is ki misaal hai:" },
      options: [
        { en: "Perfect competition", ur: "کامل مقابلہ", rm: "Kaamil muqaabla" },
        { en: "Oligopoly", ur: "اولیگوپولی", rm: "Oligopoly" },
        { en: "Monopoly", ur: "اجارہ داری", rm: "Ijaara daari" },
        { en: "Monopolistic competition", ur: "اجارہ داری مقابلہ", rm: "Ijaara daari muqaabla" },
      ],
      correctIndex: 1,
      explanation: { en: "When a small number of large firms dominate a market (as with Pakistan's cement sector), it's called an oligopoly. These firms have significant pricing power and may coordinate prices.", ur: "جب چند بڑی کمپنیاں بازار پر غالب ہوں (پاکستان کی سیمنٹ صنعت کی طرح)، اسے اولیگوپولی کہتے ہیں۔ ان کمپنیوں کے پاس اہم قیمت طاقت ہے۔", rm: "Jab chand bari kampaniyaan baazaar par ghaalib hon (Pakistan ki cement sanaaton ki tarah), ise oligopoly kehte hain. In kampaniyon ke paas ahem qeemat taaqat hai." },
    },
    {
      question: { en: "In which market structure is the seller a price-taker (has no ability to influence price)?", ur: "کس بازار ڈھانچے میں فروخت کنندہ قیمت لینے والا ہے (قیمت پر اثر ڈالنے کی کوئی صلاحیت نہیں)?", rm: "Kis baazaar dhaanche mein farokht kunanda qeemat lene wala hai (qeemat par asar daalne ki koi salahiyat nahi)?" },
      options: [
        { en: "Monopoly", ur: "اجارہ داری", rm: "Ijaara daari" },
        { en: "Oligopoly", ur: "اولیگوپولی", rm: "Oligopoly" },
        { en: "Perfect competition", ur: "کامل مقابلہ", rm: "Kaamil muqaabla" },
        { en: "Monopolistic competition", ur: "اجارہ داری مقابلہ", rm: "Ijaara daari muqaabla" },
      ],
      correctIndex: 2,
      explanation: { en: "In perfect competition, individual sellers are too small to influence market price — they must accept the market price (hence 'price-takers'). A wheat farmer in Sindh cannot charge more than the market wheat price.", ur: "کامل مقابلے میں، انفرادی فروخت کنندگان بازار قیمت پر اثر ڈالنے کے لیے بہت چھوٹے ہیں — انہیں بازار قیمت قبول کرنی پڑتی ہے۔", rm: "Kaamil muqaable mein, infiraadi farokht kunandagaan baazaar qeemat par asar daalne ke liye bahut chhote hain — unhen baazaar qeemat qabool karni parti hai." },
    },
    {
      question: { en: "Why might a government regulate a monopoly instead of breaking it up?", ur: "حکومت اجارہ داری کو توڑنے کی بجائے اسے ریگولیٹ کیوں کر سکتی ہے؟", rm: "Hukoomat ijaara daari ko todne ki bajaaye ise regulate kyun kar sakti hai?" },
      options: [
        { en: "It wants to protect the monopoly's profits", ur: "وہ اجارہ داری کے منافع کی حفاظت کرنا چاہتی ہے", rm: "Woh ijaara daari ke munaafe ki hifaazat karna chahti hai" },
        { en: "Some monopolies (utilities) are natural — breaking them raises costs", ur: "کچھ اجارہ داریاں (یوٹیلیٹیز) قدرتی ہیں — انہیں توڑنا لاگت بڑھاتا ہے", rm: "Kuch ijaara daariyan (utilities) qudrati hain — unhen todna lagat barhata hai" },
        { en: "Competition always reduces quality", ur: "مقابلہ ہمیشہ معیار کم کرتا ہے", rm: "Muqaabla hamesha miyaar kam karta hai" },
        { en: "Regulation is always cheaper than competition", ur: "ریگولیشن ہمیشہ مقابلے سے سستا ہے", rm: "Regulation hamesha muqaable se sasta hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Natural monopolies (power grids, water supply, railways) have high fixed costs and low marginal costs — competition would mean duplicating infrastructure wastefully. Instead, governments regulate price and service standards while allowing one operator.", ur: "قدرتی اجارہ داریوں (بجلی گرڈ، پانی کی فراہمی، ریلوے) میں زیادہ مقررہ لاگت اور کم حاشیائی لاگت ہوتی ہے — مقابلہ بنیادی ڈھانچہ ضائع طریقے سے دوگنا کرے گا۔", rm: "Qudrati ijaara daariyon (bijli grid, paani ki faraahami, railway) mein zyada muqarrara lagat aur kam haashiyaai lagat hoti hai — muqaabla bunyaadi dhaancha zaaya tareeqe se dugna karega." },
    },
    {
      question: { en: "Restaurants compete on quality, ambiance, and price. This is an example of:", ur: "ریستوران معیار، ماحول اور قیمت پر مقابلہ کرتے ہیں۔ یہ اس کی مثال ہے:", rm: "Rastoraan miyaar, maahuul aur qeemat par muqaabla karte hain. Yeh is ki misaal hai:" },
      options: [
        { en: "Perfect competition", ur: "کامل مقابلہ", rm: "Kaamil muqaabla" },
        { en: "Monopoly", ur: "اجارہ داری", rm: "Ijaara daari" },
        { en: "Monopolistic competition", ur: "اجارہ داری مقابلہ", rm: "Ijaara daari muqaabla" },
        { en: "Oligopoly", ur: "اولیگوپولی", rm: "Oligopoly" },
      ],
      correctIndex: 2,
      explanation: { en: "Monopolistic competition: many sellers, each with differentiated products (brand, quality, location give some pricing power). Restaurants compete on food quality, service, and atmosphere — not just price.", ur: "اجارہ داری مقابلہ: بہت سے فروخت کنندگان، ہر ایک مختلف مصنوعات کے ساتھ (برانڈ، معیار، مقام کچھ قیمت طاقت دیتے ہیں)۔ ریستوران کھانے کے معیار، خدمت اور ماحول پر مقابلہ کرتے ہیں۔", rm: "Ijaara daari muqaabla: bahut se farokht kunandagaan, har ek mukhtalif masnooaat ke saath (brand, miyaar, maqaam kuch qeemat taaqat dete hain). Rastoraan khaane ke miyaar, khidmat aur maahuul par muqaabla karte hain." },
    },
  ],
  faq: [
    {
      question: { en: "What is the Competition Commission of Pakistan (CCP) and what does it do?", ur: "پاکستان کا مسابقتی کمیشن (CCP) کیا ہے اور یہ کیا کرتا ہے؟", rm: "Pakistan ka musaabiqati commission (CCP) kya hai aur yeh kya karta hai?" },
      answer: { en: "The CCP, established in 2007, is Pakistan's competition regulator. It prevents: price-fixing cartels (e.g. cement companies secretly agreeing on prices), abuse of market dominance, and mergers that would reduce competition. The CCP has investigated cement, sugar, airlines, poultry, and banking sectors. Its effectiveness is limited by political economy — powerful industries lobby against enforcement, and fines imposed are often appealed for years in courts.", ur: "CCP، 2007 میں قائم، پاکستان کا مسابقتی ریگولیٹر ہے۔ یہ روکتا ہے: قیمت طے کرنے والی کارٹیل، بازار تسلط کا غلط استعمال، اور سادہ انضمام۔ CCP نے سیمنٹ، چینی، ایئر لائنز اور بینکاری شعبوں کی تحقیقات کی ہیں۔ اس کی تاثیر سیاسی معیشت سے محدود ہے۔", rm: "CCP، 2007 mein qaaim, Pakistan ka musaabiqati regulator hai. Yeh rokta hai: qeemat tay karne wali cartel, baazaar tasallut ka ghalat istemal, aur saada inzimaam. CCP ne cement, cheeni, airlines aur bainkari shahaayon ki tahqeeqaat ki hain." },
    },
  ],
};
