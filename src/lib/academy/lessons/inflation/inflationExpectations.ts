import type { Lesson } from "@/lib/academy/types";

export const inflationExpectationsLesson: Lesson = {
  slug: "inflation-expectations",
  category: "inflation",
  title: { en: "Inflation Expectations: The Self-Fulfilling Prophecy", ur: "افراط زر کی توقعات: خود پوری ہونے والی پیشین گوئی", rm: "Inflation ki Tawaqquaat: Khud Poori Hone Wali Pesh-goi" },
  subtitle: {
    en: "Why what people believe about future prices shapes what future prices actually become",
    ur: "لوگ مستقبل کی قیمتوں کے بارے میں جو یقین رکھتے ہیں وہ مستقبل کی حقیقی قیمتوں کو کیوں شکل دیتا ہے",
    rm: "Log mustaqbil ki qeematon ke baare mein jo yaqeen rakhte hain woh mustaqbil ki haqeeqi qeematon ko kyun shakal deta hai",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan", "policy-rate"],
  relatedLessonSlugs: ["types-of-inflation", "cost-push", "sbp-role"],
  content: {
    overview: {
      en: "Inflation expectations are what people, businesses, and workers believe future inflation will be. This matters enormously because these beliefs shape behaviour that can make the expectation come true. If workers expect 25% inflation next year, they demand 25%+ wage increases now. If businesses expect costs to keep rising, they raise prices preemptively. If consumers expect prices to rise, they buy now rather than later, boosting demand. These behaviours can create the very inflation that was expected — a self-fulfilling prophecy. Managing expectations is one of the most important, and hardest, jobs of a central bank like the SBP.",
      ur: "افراط زر کی توقعات وہ ہیں جو لوگ، کاروبار اور کارکن یقین رکھتے ہیں کہ مستقبل کا افراط زر کیا ہوگا۔ یہ بہت اہم ہے کیونکہ یہ یقین رویے کو شکل دیتے ہیں جو توقع کو حقیقت بنا سکتے ہیں۔ اگر مزدور اگلے سال 25٪ افراط زر کی توقع رکھتے ہیں، وہ ابھی 25٪+ اجرت اضافے مانگتے ہیں۔",
      rm: "Inflation ki tawaqquaat woh hain jo log, kaarobaar aur kaarkin yaqeen rakhte hain ke mustaqbil ka inflation kya hoga. Yeh bahut ahem hai kyunke yeh yaqeen rawayye ko shakal dete hain jo tawaqqu ko haqeeqat bana sakte hain. Agar mazdoor agle saal 25% inflation ki tawaqqu rakhte hain, woh abhi 25%+ ujrat izaafey maangten hain.",
    },
    whyItMatters: {
      en: "Central bank credibility is largely about managing inflation expectations. If people trust that the SBP will keep inflation low, they don't preemptively raise wages and prices — making actual inflation lower and more stable. If people don't trust the SBP (because of past broken promises, fiscal dominance, or currency instability), expectations become unanchored — people assume high inflation will continue regardless of what the SBP says, making inflation more persistent and harder to reduce. This explains why Pakistan's SBP raised rates so aggressively in 2022-23: partly to demonstrate credible commitment to reducing inflation, not just to mechanically reduce demand.",
      ur: "مرکزی بینک کی ساکھ زیادہ تر افراط زر کی توقعات کو منظم کرنے کے بارے میں ہے۔ اگر لوگ اعتماد کرتے ہیں کہ SBP افراط زر کو کم رکھے گا، وہ پیشگی طور پر اجرتیں اور قیمتیں نہیں بڑھاتے — حقیقی افراط زر کو کم اور زیادہ مستحکم بناتے ہیں۔",
      rm: "Markazi bank ki saakh zyada tar inflation ki tawaqquaat ko munazzam karne ke baare mein hai. Agar log aitmaad karte hain ke SBP inflation ko kam rakhega, woh peshgi tor par ujraten aur qeematen nahin barhate — haqeeqi inflation ko kam aur zyada mustahkam banate hain.",
    },
    explanation: {
      en: `**How expectations become self-fulfilling:**

**1. Wage-setting behaviour:** Workers and unions negotiate wages based on expected future inflation, not just past inflation. If workers expect 20% inflation, they demand 20%+ wage increases to protect real purchasing power. These higher wages raise firms' costs, which firms pass to consumers as higher prices — validating the original expectation.

**2. Price-setting behaviour:** Businesses set prices for the future, not just react to current costs. If a manufacturer expects input costs to rise 15% over the next year, they may raise prices now to avoid having to make several smaller price changes.

**3. Consumer behaviour:** If consumers expect prices to rise significantly, they may accelerate purchases (buy now before prices go up further), which increases current demand and can itself push prices higher.

**4. Investor/saver behaviour:** If savers expect high inflation, they demand higher interest rates on deposits and bonds to compensate — raising the cost of borrowing throughout the economy.

**Anchored vs. unanchored expectations:**
- Anchored: People trust the central bank's inflation target and expect inflation to return to that level even after temporary shocks (common in economies with credible, independent central banks)
- Unanchored: People don't trust promises about future inflation and instead extrapolate from recent experience — if inflation has been high recently, they expect it to stay high, regardless of central bank statements

**Why Pakistan's expectations are relatively unanchored:** Pakistan's history of high, volatile inflation (repeated crises in 2008, 2011-13, 2018-19, 2022-23) means firms and workers have learned not to fully trust official inflation targets. This makes inflation more persistent in Pakistan than in economies with a longer track record of low, stable inflation — even similar economic shocks produce more inflation "stickiness" in Pakistan.

**Breaking unanchored expectations:** Requires sustained, credible policy commitment over years — not just one good inflation report. This is why the SBP's independence (formalised via the 2022 SBP Amendment Act) matters: an independent central bank is more likely to be believed when it commits to fighting inflation, because it's less subject to political pressure to loosen policy prematurely.`,
      ur: `**توقعات خود پوری کیسے ہوتی ہیں:**

**1. اجرت مقرر کرنے کا رویہ:** مزدور اور یونینز متوقع مستقبل کے افراط زر کی بنیاد پر اجرتوں پر بات چیت کرتے ہیں، صرف ماضی کے افراط زر کی نہیں۔

**2. قیمت مقرر کرنے کا رویہ:** کاروبار مستقبل کے لیے قیمتیں مقرر کرتے ہیں۔ اگر ایک مینوفیکچرر توقع رکھتا ہے کہ آدان لاگت اگلے سال 15٪ بڑھے گی، وہ ابھی قیمتیں بڑھا سکتا ہے۔

**3. صارف رویہ:** اگر صارفین توقع رکھتے ہیں کہ قیمتیں نمایاں طور پر بڑھیں گی، وہ خریداری تیز کر سکتے ہیں۔

**4. سرمایہ کار/بچت کنندہ رویہ:** اگر بچت کرنے والے اعلی افراط زر کی توقع رکھتے ہیں، وہ معاوضے کے لیے اعلی سود شرح مانگتے ہیں۔

**پاکستان کی توقعات نسبتاً غیر لنگر انداز کیوں ہیں:** پاکستان کی اعلی، غیر مستحکم افراط زر کی تاریخ کا مطلب ہے کہ کاروبار اور مزدوروں نے سرکاری افراط زر اہداف پر مکمل اعتماد نہ کرنا سیکھا ہے۔`,
      rm: `**Tawaqquaat khud poori kaise hoti hain:**

**1. Ujrat muqarrar karne ka rawayya:** Mazdoor aur unions mutawaqqa mustaqbil ke inflation ki bunyaad par ujraton par baat-cheet karte hain, sirf maazi ke inflation ki nahin.

**2. Qeemat muqarrar karne ka rawayya:** Kaarobaar mustaqbil ke liye qeematen muqarrar karte hain. Agar ek manufacturer tawaqqu rakhta hai ke aadaan lagat agle saal 15% barhegi, woh abhi qeematen barha sakta hai.

**3. Saraaf rawayya:** Agar saraafeen tawaqqu rakhte hain ke qeematen numaayan tor par barhengi, woh khareedari tez kar sakte hain.

**4. Sarmaaya kaar/bachat kunanda rawayya:** Agar bachat karne wale aali inflation ki tawaqqu rakhte hain, woh muaawiza ke liye aali sood shar maangten hain.

**Pakistan ki tawaqquaat nisbatan ghair langar-andaaz kyun hain:** Pakistan ki aali, ghair mustahkam inflation ki taareekh ka matlab hai ke kaarobaar aur mazduron ne sarkari inflation ahdaaf par mukammal aitmaad na karna seekha hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Inflation expectations are just guesses that don't actually affect real economic outcomes.** They demonstrably shape wage negotiations, pricing decisions, and consumption timing — all of which feed directly into actual inflation. Central banks track surveys of inflation expectations precisely because they're a real economic force, not just a psychological curiosity.

**Myth 2: Once inflation falls, expectations automatically adjust immediately.** Expectations often lag reality — people who've experienced years of high inflation remain skeptical even after several months of improved data, requiring a sustained track record before trust rebuilds.

**Myth 3: Central bank communication doesn't matter, only actual policy actions do.** Communication (forward guidance, clear inflation targets, transparent decision-making) is itself a policy tool — it directly shapes expectations, which then shape actual economic behaviour, independent of the specific interest rate level chosen.`,
      ur: `**غلط فہمی 1: افراط زر کی توقعات صرف اندازے ہیں جو حقیقی معاشی نتائج کو متاثر نہیں کرتیں۔** وہ ثابت طور پر اجرت مذاکرات، قیمت کے فیصلوں اور استعمال کے وقت کو شکل دیتی ہیں۔

**غلط فہمی 2: ایک بار افراط زر گرنے کے بعد، توقعات خودکار طور پر فوری طور پر ایڈجسٹ ہوتی ہیں۔** توقعات اکثر حقیقت سے پیچھے رہتی ہیں۔

**غلط فہمی 3: مرکزی بینک کا رابطہ اہم نہیں، صرف اصل پالیسی اقدامات۔** رابطہ خود ایک پالیسی آلہ ہے۔`,
      rm: `**Ghalat fehmi 1: Inflation ki tawaqquaat sirf andaaze hain jo haqeeqi muaashi nataayij ko mutaassir nahin karteeN.** Woh saabit tor par ujrat muzaakiraat, qeemat ke faislon aur istemal ke waqt ko shakal deti hain.

**Ghalat fehmi 2: Ek baar inflation girne ke baad, tawaqquaat khudkaar tor par fori tor par adjust hoti hain.** Tawaqquaat aksar haqeeqat se peechhe rehti hain.

**Ghalat fehmi 3: Markazi bank ka raabita ahem nahin, sirf asal policy iqdaamaat.** Raabita khud ek policy aala hai.`,
    },
    pakistanExample: {
      en: `**2023 government wage hikes and expectations:** In the FY2024 budget, the government announced 35% salary increases for government employees, partly in response to and partly reinforcing high inflation expectations. This large jump signalled to private sector workers and unions that a comparable adjustment was needed to maintain living standards, contributing to broader wage-price pressure. Simultaneously, businesses across Pakistan, having experienced years of unpredictable and high inflation, began adopting shorter pricing cycles (adjusting prices monthly or even weekly rather than annually) — a direct behavioural response to unanchored inflation expectations that itself makes inflation more persistent and visible.`,
      ur: `**2023 سرکاری اجرت اضافے اور توقعات:** FY2024 بجٹ میں، حکومت نے سرکاری ملازمین کے لیے 35٪ تنخواہ اضافے کا اعلان کیا، جزوی طور پر اعلی افراط زر توقعات کے جواب میں اور جزوی طور پر انہیں مضبوط کرتے ہوئے۔ اس بڑی چھلانگ نے نجی شعبے کے کارکنوں کو اشارہ دیا کہ رہن سہن کے معیار کو برقرار رکھنے کے لیے موازنہ کرنے والی ایڈجسٹمنٹ کی ضرورت ہے۔`,
      rm: `**2023 sarkari ujrat izaafey aur tawaqquaat:** FY2024 budget mein, hukoomat ne sarkari mulaazmeen ke liye 35% tankhaah izaafe ka elaan kiya, juz'wi tor par aali inflation tawaqquaat ke jawaab mein aur juz'wi tor par unhen mazboot karte hue. Is bari chhalaang ne niji shube ke kaarkinoN ko ishaara diya ke rehen sehen ke miyaar ko barqaraar rakhne ke liye muwaazna karne wali adjustment ki zaroorat hai.`,
    },
    realWorld: {
      en: "The Volcker disinflation of the early 1980s (US) is a landmark case in expectations management. When Paul Volcker took over the US Federal Reserve in 1979, inflation had been high for over a decade and expectations were deeply entrenched (people simply assumed high inflation would continue). Volcker's dramatic, sustained rate hikes (to nearly 20%) were partly designed to demonstrate unwavering commitment — proving to markets and workers that the Fed would tolerate a severe recession rather than back down. This costly demonstration eventually broke inflation expectations: once people believed inflation would genuinely fall, wage and price-setting behaviour changed, and inflation fell faster than pure demand reduction alone would predict. This episode is the foundational case study for why central bank credibility matters so much.",
      ur: "1980s کے اوائل کا Volcker غیر افراط زر (امریکہ) توقعات کے انتظام میں ایک تاریخی کیس ہے۔ جب پال وولکر نے 1979 میں امریکی فیڈرل ریزرو کا چارج سنبھالا، افراط زر ایک دہائی سے زیادہ عرصے سے اعلی رہا تھا۔ وولکر کے ڈرامائی، مستقل شرح اضافوں کا مقصد جزوی طور پر غیر متزلزل عزم ظاہر کرنا تھا۔",
      rm: "1980s ke awaail ka Volcker ghair-inflation (America) tawaqquaat ke intzaam mein ek taareekhi case hai. Jab Paul Volcker ne 1979 mein Amreeki Federal Reserve ka charge sambhala, inflation ek dahaayi se zyada arse se aali raha tha. Volcker ke dramaayi, mustaqil shar izaafon ka maqsad juz'wi tor par ghair-mutazalzil azm zaahir karna tha.",
    },
    summary: {
      en: "• Inflation expectations: beliefs about future inflation that shape wage, pricing, and spending decisions today\n• Self-fulfilling mechanism: expecting inflation causes behaviour that creates inflation\n• Anchored expectations (trust in central bank) → inflation stays lower and more stable\n• Unanchored expectations (Pakistan's case, due to history of crises) → inflation more persistent\n• Central bank credibility and communication are policy tools, not just interest rates\n• Breaking unanchored expectations requires sustained, credible commitment over years",
      ur: "• افراط زر کی توقعات: مستقبل کے افراط زر کے بارے میں یقین جو آج اجرت، قیمت، اور خرچ کے فیصلوں کو شکل دیتا ہے\n• خود پوری ہونے کا طریقہ کار: افراط زر کی توقع رویہ پیدا کرتی ہے جو افراط زر بناتی ہے\n• لنگر انداز توقعات → افراط زر کم اور زیادہ مستحکم رہتا ہے\n• غیر لنگر انداز توقعات (پاکستان کا کیس) → افراط زر زیادہ پائیدار\n• مرکزی بینک کی ساکھ اور رابطہ پالیسی آلات ہیں\n• غیر لنگر انداز توقعات کو توڑنے کے لیے سالوں تک پائیدار عزم چاہیے",
      rm: "• Inflation ki tawaqquaat: mustaqbil ke inflation ke baare mein yaqeen jo aaj ujrat, qeemat, aur kharch ke faislon ko shakal deta hai\n• Khud poori hone ka tareeqa-kaar: inflation ki tawaqqu rawayya paida karti hai jo inflation banati hai\n• Langar-andaaz tawaqquaat → inflation kam aur zyada mustahkam rehta hai\n• Ghair-langar-andaaz tawaqquaat (Pakistan ka case) → inflation zyada paayidaar\n• Markazi bank ki saakh aur raabita policy aalaat hain\n• Ghair-langar-andaaz tawaqquaat ko toRne ke liye salon tak paayidaar azm chahiye",
    },
  },
  quiz: [
    {
      question: { en: "How can inflation expectations become 'self-fulfilling'?", ur: "افراط زر کی توقعات 'خود پوری' کیسے ہو سکتی ہیں؟", rm: "Inflation ki tawaqquaat 'khud poori' kaise ho sakti hain?" },
      options: [
        { en: "They can't — expectations have no effect on actual economic outcomes", ur: "وہ نہیں ہو سکتیں — توقعات کا حقیقی معاشی نتائج پر کوئی اثر نہیں ہوتا", rm: "Woh nahin ho sakteeN — tawaqquaat ka haqeeqi muaashi nataayij par koi asar nahin hota" },
        { en: "When workers demand higher wages and businesses raise prices in anticipation of inflation, these actions themselves cause the inflation they expected", ur: "جب مزدور اعلی اجرتیں مانگتے ہیں اور کاروبار افراط زر کی توقع میں قیمتیں بڑھاتے ہیں، تو یہ اقدامات خود وہ افراط زر پیدا کرتے ہیں جس کی انہیں توقع تھی", rm: "Jab mazdoor aali ujraten maangten hain aur kaarobaar inflation ki tawaqqu mein qeematen barhate hain, to yeh iqdaamaat khud woh inflation paida karte hain jis ki unhen tawaqqu thi" },
        { en: "Only government-set prices can be self-fulfilling", ur: "صرف حکومت کی مقررہ قیمتیں خود پوری ہو سکتی ہیں", rm: "Sirf hukoomat ki muqarrar qeematen khud poori ho sakti hain" },
        { en: "Expectations only matter for the stock market, not for goods and services", ur: "توقعات صرف اسٹاک مارکیٹ کے لیے اہم ہیں، اشیاء اور خدمات کے لیے نہیں", rm: "Tawaqquaat sirf stock market ke liye ahem hain, ashaaya aur khadamaat ke liye nahin" },
      ],
      correctIndex: 1,
      explanation: { en: "When people believe prices will rise, they act accordingly: workers demand wage increases, businesses raise prices preemptively, consumers buy sooner rather than later. These behaviours collectively create the demand and cost pressures that produce the very inflation that was expected — a feedback loop that makes expectations a real economic force.", ur: "جب لوگ یقین رکھتے ہیں کہ قیمتیں بڑھیں گی، وہ اس کے مطابق عمل کرتے ہیں: مزدور اجرت اضافے مانگتے ہیں، کاروبار پیشگی طور پر قیمتیں بڑھاتے ہیں، صارفین جلدی خریدتے ہیں۔ یہ رویے مجموعی طور پر طلب اور لاگت کے دباؤ پیدا کرتے ہیں۔", rm: "Jab log yaqeen rakhte hain ke qeematen barhengi, woh is ke mutaabiq amal karte hain: mazdoor ujrat izaafey maangten hain, kaarobaar peshgi tor par qeematen barhate hain, saraafeen jaldi khareedte hain. Yeh rawayye majmooee tor par talab aur lagat ke dabaao paida karte hain." },
    },
    {
      question: { en: "What's the difference between 'anchored' and 'unanchored' inflation expectations?", ur: "'لنگر انداز' اور 'غیر لنگر انداز' افراط زر کی توقعات میں کیا فرق ہے؟", rm: "'Langar-andaaz' aur 'ghair-langar-andaaz' inflation ki tawaqquaat mein kya faraq hai?" },
      options: [
        { en: "They're the same thing", ur: "وہ ایک ہی چیز ہیں", rm: "Woh ek hi cheez hain" },
        { en: "Anchored: people trust the central bank's target and expect inflation to return there; unanchored: people don't trust official targets and instead extrapolate from recent experience", ur: "لنگر انداز: لوگ مرکزی بینک کے ہدف پر اعتماد کرتے ہیں؛ غیر لنگر انداز: لوگ سرکاری اہداف پر اعتماد نہیں کرتے اور حالیہ تجربے سے اندازہ لگاتے ہیں", rm: "Langar-andaaz: log markazi bank ke hadaf par aitmaad karte hain; ghair-langar-andaaz: log sarkari ahdaaf par aitmaad nahin karte aur haaliya tajrube se andaaza lagate hain" },
        { en: "Anchored expectations only exist in developing countries", ur: "لنگر انداز توقعات صرف ترقی پذیر ممالک میں موجود ہیں", rm: "Langar-andaaz tawaqquaat sirf taraqqi pazeer mumaalik mein maujood hain" },
        { en: "Unanchored expectations are always lower than anchored ones", ur: "غیر لنگر انداز توقعات ہمیشہ لنگر انداز سے کم ہوتی ہیں", rm: "Ghair-langar-andaaz tawaqquaat hamesha langar-andaaz se kam hoti hain" },
      ],
      correctIndex: 1,
      explanation: { en: "In economies with credible, independent central banks and a long track record of low inflation, people's expectations stay 'anchored' near the target even during temporary shocks — they trust the bank will bring inflation back down. In economies with a history of high, volatile inflation (like Pakistan), expectations become 'unanchored' — people assume recent high inflation will persist, regardless of central bank promises.", ur: "قابل اعتماد، آزاد مرکزی بینکوں اور کم افراط زر کے طویل ٹریک ریکارڈ والی معیشتوں میں، لوگوں کی توقعات عارضی جھٹکوں کے دوران بھی ہدف کے قریب 'لنگر انداز' رہتی ہیں۔", rm: "Qaabil-e-aitemaad, aazaad markazi bankon aur kam inflation ke taweel track record wali muaashaton mein, logon ki tawaqquaat aarzi jhatkon ke dauran bhi hadaf ke qareeb 'langar-andaaz' rehti hain." },
    },
    {
      question: { en: "Why did FY2024's 35% government salary increase potentially worsen inflation expectations?", ur: "FY2024 کے 35٪ سرکاری تنخواہ اضافے نے افراط زر کی توقعات کو ممکنہ طور پر کیوں بدتر بنایا؟", rm: "FY2024 ke 35% sarkari tankhaah izaafe ne inflation ki tawaqquaat ko mumkina tor par kyun badtar banaya?" },
      options: [
        { en: "It had no effect on anyone else's behaviour", ur: "اس کا کسی اور کے رویے پر کوئی اثر نہیں ہوا", rm: "Is ka kisi aur ke rawayye par koi asar nahin hua" },
        { en: "It signalled to private sector workers that a similar large adjustment was needed, reinforcing wage-price spiral dynamics", ur: "اس نے نجی شعبے کے کارکنوں کو اشارہ دیا کہ ایک جیسی بڑی ایڈجسٹمنٹ ضروری ہے، اجرت-قیمت سرپل حرکیات کو مضبوط کیا", rm: "Is ne niji shube ke kaarkinoN ko ishaara diya ke ek jaisi bari adjustment zaroori hai, ujrat-qeemat spiral harkiyaat ko mazboot kiya" },
        { en: "It immediately reduced inflation to zero", ur: "اس نے فوری طور پر افراط زر کو صفر تک کم کیا", rm: "Is ne fori tor par inflation ko sifar tak kam kiya" },
        { en: "It only affected government employees and had zero spillover", ur: "اس نے صرف سرکاری ملازمین کو متاثر کیا اور کوئی اثر نہیں پھیلا", rm: "Is ne sirf sarkari mulaazmeen ko mutaassir kiya aur koi asar nahin phaila" },
      ],
      correctIndex: 1,
      explanation: { en: "Large government wage increases don't happen in isolation — they signal to private sector workers, unions, and businesses that a similar cost-of-living adjustment is warranted. This contributes to the wage-price spiral dynamic covered in the built-in inflation lesson, where wage demands and price increases reinforce each other.", ur: "بڑے سرکاری اجرت اضافے تنہائی میں نہیں ہوتے — وہ نجی شعبے کے کارکنوں، یونینز اور کاروباروں کو اشارہ دیتے ہیں کہ ایک جیسی رہن سہن کی لاگت ایڈجسٹمنٹ ضروری ہے۔", rm: "Bare sarkari ujrat izaafey tanhaai mein nahin hote — woh niji shube ke kaarkinoN, unions aur kaarobaaron ko ishaara dete hain ke ek jaisi rehen sehen ki lagat adjustment zaroori hai." },
    },
  ],
  faq: [
    {
      question: { en: "How does the SBP measure inflation expectations if they're just beliefs in people's heads?", ur: "SBP افراط زر کی توقعات کو کیسے ناپتا ہے اگر وہ صرف لوگوں کے ذہنوں میں یقین ہیں؟", rm: "SBP inflation ki tawaqquaat ko kaise naapata hai agar woh sirf logon ke zehnon mein yaqeen hain?" },
      answer: { en: "Central banks including the SBP use several tools: (1) Surveys — regularly polling businesses, consumers, and professional forecasters about their expected inflation over the next 6-12 months and beyond; (2) Market-based measures — comparing yields on regular government bonds versus inflation-indexed bonds (if available), where the difference reflects market-implied inflation expectations; (3) Wage settlement data — tracking negotiated wage increases as a proxy for embedded inflation assumptions. The SBP publishes results from its Inflation Expectations Survey, which helps policymakers gauge whether their communication and policy actions are successfully anchoring expectations near the target, or whether expectations remain elevated and unanchored, requiring further policy tightening or clearer communication.", ur: "SBP سمیت مرکزی بینک کئی آلات استعمال کرتے ہیں: (1) سروے — کاروباروں، صارفین اور پیشہ ور پیش گوئی کرنے والوں سے باقاعدگی سے پول کرنا؛ (2) بازار پر مبنی پیمانے؛ (3) اجرت تصفیہ ڈیٹا۔ SBP اپنے افراط زر توقعات سروے کے نتائج شائع کرتا ہے۔", rm: "SBP samet markazi bank kayi aalaat istemal karte hain: (1) Survey — kaarobaaron, saraafeen aur peshawar pesh-goi karne walon se baqaaidgi se poll karna; (2) Baazaar par mabni paimaane; (3) Ujrat tasfiya data. SBP apne inflation tawaqquaat survey ke nataayij shaaya karta hai." },
    },
  ],
};
