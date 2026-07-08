import type { Lesson } from "@/lib/academy/types";

export const fiscalVsMonetaryLesson: Lesson = {
  slug: "fiscal-vs-monetary",
  category: "beginner",
  title: { en: "Fiscal vs Monetary Policy", ur: "مالی بمقابلہ مالیاتی پالیسی", rm: "Maali Bamuqaabila Maaliyaati Policy" },
  subtitle: {
    en: "The two main tools governments and central banks use to steer the economy — and how they interact in Pakistan",
    ur: "وہ دو اہم اوزار جو حکومتیں اور مرکزی بینک معیشت کو سنبھالنے کے لیے استعمال کرتے ہیں",
    rm: "Woh do ahem auzaar jo hukoomaten aur markazi bank muaashat ko sambhalne ke liye istemal karte hain",
  },
  level: "beginner",
  readMinutes: 7,
  isPremium: false,
  relatedIndicatorSlugs: ["policy-rate-pakistan", "fiscal-deficit-pakistan"],
  relatedLessonSlugs: ["taxes-intro", "government-spending-basics", "interest-rates-basics"],
  content: {
    overview: {
      en: "Fiscal policy uses government spending and taxes to influence the economy — it's run by the Ministry of Finance. Monetary policy uses interest rates and money supply — it's run by the central bank (SBP in Pakistan). Together, these are the two levers governments use to stabilise economies: fighting inflation, preventing recession, and managing growth. When they pull in opposite directions (as often happens in Pakistan), they undermine each other.",
      ur: "مالی پالیسی معیشت کو متاثر کرنے کے لیے حکومتی اخراجات اور ٹیکس استعمال کرتی ہے — وزارت خزانہ چلاتی ہے۔ مالیاتی پالیسی شرح سود اور رقم کی فراہمی استعمال کرتی ہے — SBP چلاتا ہے۔",
      rm: "Maali policy muaashat ko mutaassir karne ke liye hukomaati ikhraajahat aur tax istemal karti hai — Wazaarat-e-Khizaana chalati hai. Maaliyaati policy shar-e-sood aur raqam ki faraahami istemal karti hai — SBP chalata hai.",
    },
    whyItMatters: {
      en: "Understanding the difference helps decode economic news. 'SBP cuts rates' = monetary easing (stimulative). 'Government widens deficit' = fiscal expansion (also stimulative). 'IMF demands fiscal consolidation' = cutting government spending or raising taxes. 'SBP raises rates to fight inflation' = monetary tightening. Knowing which lever is being pulled — and whether it's expansionary or contractionary — tells you what the government thinks about current economic conditions.",
      ur: "فرق سمجھنا اقتصادی خبریں سمجھنے میں مدد کرتا ہے۔ 'SBP شرحیں کم کرتا ہے' = مالیاتی آسانی۔ 'IMF مالی استحکام مانگتا ہے' = حکومتی اخراجات کاٹنا یا ٹیکس بڑھانا۔",
      rm: "Farq samajhna iqtisadi khabrein samajhne mein madad karta hai. 'SBP sharayein kam karta hai' = maaliyaati aasaani. 'IMF maali istihkaam maangta hai' = hukomaati ikhraajahat kaatna ya tax barhana.",
    },
    explanation: {
      en: `**Fiscal Policy:**
- **Expansionary:** Increase government spending OR cut taxes → more money in economy → more demand → growth (but also potentially more debt and inflation)
- **Contractionary:** Cut spending OR raise taxes → less money in economy → less demand → slower inflation (but potentially slower growth)
- Set by: Ministry of Finance, approved by parliament
- Takes effect: slowly (budget is annual, spending takes time to deploy)

**Monetary Policy:**
- **Expansionary (loose):** Cut interest rates → cheaper borrowing → more spending and investment → growth
- **Contractionary (tight):** Raise interest rates → expensive borrowing → less spending → cooling inflation
- Set by: SBP's Monetary Policy Committee (MPC), meets every 8 weeks
- Takes effect: faster than fiscal (rates change immediately)

**Pakistan's challenge:** Fiscal policy has often been expansionary (deficit spending) while monetary policy is tightened to fight the resulting inflation. This is like pressing the accelerator and brake simultaneously. The fiscal side needs to consolidate (reduce deficit) for monetary policy to work effectively.`,
      ur: `**مالی پالیسی:**
- **وسیع کرنے والی:** حکومتی اخراجات بڑھانا یا ٹیکس کاٹنا → معیشت میں زیادہ پیسہ → ترقی
- **تنگ کرنے والی:** اخراجات کاٹنا یا ٹیکس بڑھانا → کم طلب → کم مہنگائی
- وزارت خزانہ مقرر کرتی ہے

**مالیاتی پالیسی:**
- **آسان:** شرحیں کم → سستا قرض → زیادہ خرچ → ترقی
- **سخت:** شرحیں بڑھانا → مہنگا قرض → کم خرچ → ٹھنڈی مہنگائی
- SBP MPC مقرر کرتی ہے

**پاکستان کا چیلنج:** مالی پالیسی اکثر وسیع کرتی ہے جبکہ مالیاتی پالیسی تنگ ہوتی ہے۔ یہ ایکسیلریٹر اور بریک بیک وقت دبانا ہے۔`,
      rm: `**Maali policy:**
- **Wasee karne wali:** Hukomaati ikhraajahat barhana ya tax kaatna → muaashat mein zyada paisa → taraqqi
- **Tang karne wali:** Ikhraajahat kaatna ya tax barhana → kam talab → kam mahangaai
- Wazaarat-e-Khizaana muqarrar karti hai

**Maaliyaati policy:**
- **Aasaan:** Sharayein kam → sasta qarz → zyada kharch → taraqqi
- **Sakht:** Sharayein barhana → mahanga qarz → kam kharch → thandi mahangaai
- SBP MPC muqarrar karti hai

**Pakistan ka challenge:** Maali policy aksar wasee karti hai jabke maaliyaati policy tang hoti hai. Yeh accelerator aur brake bek waqt dabana hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Only one policy is needed.** Both work best together. If monetary policy cuts rates but fiscal policy is also running large deficits, the stimulative effect doubles — potentially overshooting into inflation.

**Myth 2: SBP takes orders from government.** SBP has operational autonomy (amended SBP Act 2022). The MPC sets rates independent of the government's borrowing needs — though political pressure remains a reality.

**Myth 3: Government spending always crowds out private investment.** In a depressed economy with idle capacity, government spending can 'crowd in' private activity by creating demand. In an overheated economy, it crowds out by competing for limited resources.`,
      ur: `**غلط فہمی 1: صرف ایک پالیسی کافی ہے۔** دونوں مل کر بہترین کام کرتی ہیں۔

**غلط فہمی 2: SBP حکومت کے احکامات مانتا ہے۔** SBP کی آپریشنل خودمختاری ہے (ترمیم شدہ SBP ایکٹ 2022)۔

**غلط فہمی 3: حکومتی اخراجات ہمیشہ نجی سرمایہ کاری ہٹاتے ہیں۔** کساد زدہ معیشت میں حکومتی اخراجات نجی سرگرمی کو 'کراؤڈ ان' کر سکتے ہیں۔`,
      rm: `**Ghalat fehmi 1: Sirf ek policy kaafi hai.** Dono mil kar behtareen kaam karti hain.

**Ghalat fehmi 2: SBP hukoomat ke ahkamaat maanta hai.** SBP ki operational khudmukhtaari hai (tarmeem shuda SBP Act 2022).

**Ghalat fehmi 3: Hukomaati ikhraajahat hamesha naaji sarmaaya kaari hatate hain.** Kasaad zada muaashat mein hukomaati ikhraajahat naaji sargarmi ko 'crowd in' kar sakte hain.`,
    },
    pakistanExample: {
      en: `**Pakistan's 2022-23 policy conflict:** The government's fiscal deficit remained stubbornly large (6-7% of GDP) — requiring heavy government borrowing from the banking system. SBP simultaneously raised rates to 22% to fight inflation. But the government's own large borrowing was adding to inflationary pressure and crowding out private sector credit. This policy conflict (loose fiscal + tight monetary) is a recurring feature of Pakistan's macroeconomic instability.`,
      ur: `**پاکستان 2022-23 پالیسی تنازعہ:** حکومت کا مالی خسارہ بڑا رہا (GDP کا 6-7%)۔ SBP نے بیک وقت مہنگائی سے لڑنے کے لیے شرحیں 22% تک بڑھائیں۔ لیکن حکومت کا بڑا قرض مہنگائی کے دباؤ میں اضافہ کر رہا تھا۔ یہ پالیسی تنازعہ (ڈھیلا مالی + سخت مالیاتی) پاکستان کے میکرو اقتصادی عدم استحکام کی بار بار آنے والی خصوصیت ہے۔`,
      rm: `**Pakistan 2022-23 policy tanaaza:** Hukoomat ka maali khisaara bara raha (GDP ka 6-7%). SBP ne bek waqt mahangaai se larne ke liye sharayein 22% tak barhaain. Lekin hukoomat ka bara qarz mahangaai ke dabaao mein izaafa kar raha tha. Yeh policy tanaaza (dhila maali + sakht maaliyaati) Pakistan ke macro iqtisadi adam-istihkaam ki baar baar aane wali khasosiyat hai.`,
    },
    realWorld: {
      en: "The US COVID response (2020-21) showed fiscal and monetary policy working together in the same direction: the Federal Reserve cut rates to near zero (monetary easing) while Congress approved $5 trillion in stimulus spending (massive fiscal expansion). Both were expansionary — boosting the economy rapidly. The downside: when that combined stimulus proved too large, it contributed to 9% inflation in 2022, requiring the Fed to sharply reverse with rate hikes.",
      ur: "امریکہ COVID ردعمل (2020-21) نے مالی اور مالیاتی پالیسی کو ایک ہی سمت میں مل کر کام کرتے دکھایا: فیڈرل ریزرو نے شرحیں تقریباً صفر کر دیں اور کانگریس نے 5 ٹریلین ڈالر کا محرک منظور کیا۔ منفی پہلو: اس نے 2022 میں 9% مہنگائی میں حصہ ڈالا۔",
      rm: "America COVID rad-e-amal (2020-21) ne maali aur maaliyaati policy ko ek hi simt mein mil kar kaam karte dikhaya: Federal Reserve ne sharayein taqreeban sifar kar diin aur Congress ne 5 trillion dollar ka muhrik manzoor kiya. Manfi pehlu: is ne 2022 mein 9% mahangaai mein hissa daala.",
    },
    summary: {
      en: "• Fiscal policy: government spending + taxes (Ministry of Finance)\n• Monetary policy: interest rates + money supply (SBP)\n• Expansionary: stimulate growth (spend more, cut rates)\n• Contractionary: fight inflation (spend less, raise rates)\n• Both working same direction = powerful combined effect\n• Working opposite directions (Pakistan's common problem) = undermines effectiveness\n• SBP has operational independence since 2022 amendment",
      ur: "• مالی پالیسی: حکومتی اخراجات + ٹیکس (وزارت خزانہ)\n• مالیاتی پالیسی: شرح سود + رقم کی فراہمی (SBP)\n• وسیع کرنے والی: ترقی کی حوصلہ افزائی (زیادہ خرچ، شرحیں کم)\n• تنگ کرنے والی: مہنگائی سے لڑنا (کم خرچ، شرحیں بڑھانا)\n• دونوں ایک سمت = طاقتور مشترکہ اثر\n• مخالف سمتوں میں کام کرنا (پاکستان کا عام مسئلہ) = تاثیر کمزور کرتا ہے",
      rm: "• Maali policy: hukomaati ikhraajahat + tax (Wazaarat-e-Khizaana)\n• Maaliyaati policy: shar-e-sood + raqam ki faraahami (SBP)\n• Wasee karne wali: taraqqi ki hosla afzaai (zyada kharch, sharayein kam)\n• Tang karne wali: mahangaai se larna (kam kharch, sharayein barhana)\n• Dono ek simt = taaqatwar mushtarak asar\n• Mukhalif simton mein kaam karna (Pakistan ka aam masla) = taaseer kamzor karta hai",
    },
  },
  quiz: [
    {
      question: { en: "When SBP cuts the policy rate, this is an example of:", ur: "جب SBP پالیسی ریٹ کم کرتا ہے، یہ اس کی مثال ہے:", rm: "Jab SBP policy rate kam karta hai, yeh is ki misaal hai:" },
      options: [
        { en: "Contractionary fiscal policy", ur: "تنگ کرنے والی مالی پالیسی", rm: "Tang karne wali maali policy" },
        { en: "Expansionary monetary policy", ur: "وسیع کرنے والی مالیاتی پالیسی", rm: "Wasee karne wali maaliyaati policy" },
        { en: "Fiscal consolidation", ur: "مالی استحکام", rm: "Maali istihkaam" },
        { en: "Contractionary monetary policy", ur: "تنگ کرنے والی مالیاتی پالیسی", rm: "Tang karne wali maaliyaati policy" },
      ],
      correctIndex: 1,
      explanation: { en: "Cutting interest rates (a monetary tool) makes borrowing cheaper, encouraging more spending and investment — it's expansionary monetary policy.", ur: "شرح سود کم کرنا (مالیاتی اوزار) قرض سستا کرتا ہے، زیادہ خرچ اور سرمایہ کاری کی حوصلہ افزائی کرتا ہے — یہ وسیع کرنے والی مالیاتی پالیسی ہے۔", rm: "Shar-e-sood kam karna (maaliyaati auzaar) qarz sasta karta hai, zyada kharch aur sarmaaya kaari ki hosla afzaai karta hai — yeh wasee karne wali maaliyaati policy hai." },
    },
    {
      question: { en: "Who is responsible for fiscal policy in Pakistan?", ur: "پاکستان میں مالی پالیسی کا ذمہ دار کون ہے؟", rm: "Pakistan mein maali policy ka zimmadaar kaun hai?" },
      options: [
        { en: "State Bank of Pakistan (SBP)", ur: "اسٹیٹ بینک آف پاکستان (SBP)", rm: "State Bank of Pakistan (SBP)" },
        { en: "Ministry of Finance and Parliament", ur: "وزارت خزانہ اور پارلیمنٹ", rm: "Wazaarat-e-Khizaana aur Parliament" },
        { en: "Federal Board of Revenue (FBR)", ur: "فیڈرل بورڈ آف ریونیو (FBR)", rm: "Federal Board of Revenue (FBR)" },
        { en: "International Monetary Fund (IMF)", ur: "بین الاقوامی مالیاتی فنڈ (IMF)", rm: "International Monetary Fund (IMF)" },
      ],
      correctIndex: 1,
      explanation: { en: "Fiscal policy (spending and taxation) is the responsibility of the federal government — the Ministry of Finance proposes the budget and parliament approves it. SBP handles monetary policy independently.", ur: "مالی پالیسی (اخراجات اور ٹیکس) وفاقی حکومت کی ذمہ داری ہے — وزارت خزانہ بجٹ تجویز کرتی ہے اور پارلیمنٹ منظور کرتی ہے۔ SBP مالیاتی پالیسی آزادانہ طور پر سنبھالتا ہے۔", rm: "Maali policy (ikhraajahat aur tax) wafaaqi hukoomat ki zimmaadaari hai — Wazaarat-e-Khizaana budget tajweez karti hai aur Parliament manzoor karti hai. SBP maaliyaati policy aazaadaana tor par sambhalta hai." },
    },
    {
      question: { en: "What is the likely consequence when fiscal policy is expansionary (big deficit) while monetary policy is contractionary (high rates)?", ur: "جب مالی پالیسی وسیع کرنے والی ہو (بڑا خسارہ) اور مالیاتی پالیسی تنگ کرنے والی ہو (اونچی شرحیں)، ممکنہ نتیجہ کیا ہے؟", rm: "Jab maali policy wasee karne wali ho (bara khisaara) aur maaliyaati policy tang karne wali ho (oonchi sharayein), mumkina nateeja kya hai?" },
      options: [
        { en: "Both work perfectly together", ur: "دونوں مل کر بالکل کام کرتی ہیں", rm: "Dono mil kar bilkul kaam karti hain" },
        { en: "Monetary policy is undermined by continued fiscal stimulus", ur: "مالیاتی پالیسی مسلسل مالی محرک سے کمزور ہو جاتی ہے", rm: "Maaliyaati policy musalsal maali muhrik se kamzor ho jaati hai" },
        { en: "Fiscal policy always wins over monetary policy", ur: "مالی پالیسی ہمیشہ مالیاتی پالیسی پر غالب رہتی ہے", rm: "Maali policy hamesha maaliyaati policy par ghaalib rahti hai" },
        { en: "Both cancel each other perfectly with no effect", ur: "دونوں ایک دوسرے کو بالکل منسوخ کر دیتی ہیں", rm: "Dono ek doosre ko bilkul mansookh kar deti hain" },
      ],
      correctIndex: 1,
      explanation: { en: "When the government runs large deficits (fiscal expansion), it adds demand and inflationary pressure. High interest rates (monetary tightening) try to counteract this — but the fiscal stimulus makes monetary policy less effective and requires higher rates to achieve the same inflation-reducing effect.", ur: "جب حکومت بڑے خسارے چلاتی ہے (مالی توسیع)، یہ طلب اور مہنگائی کا دباؤ شامل کرتی ہے۔ اونچی شرحیں اس کا مقابلہ کرنے کی کوشش کرتی ہیں — لیکن مالی محرک مالیاتی پالیسی کو کم موثر بناتا ہے۔", rm: "Jab hukoomat bare khisaare chalati hai (maali tausee), yeh talab aur mahangaai ka dabaao shaamil karti hai. Oonchi sharayein is ka muqaabla karne ki koshish karti hain — lekin maali muhrik maaliyaati policy ko kam moassir banata hai." },
    },
    {
      question: { en: "Which policy tool works faster?", ur: "کون سا پالیسی اوزار تیزی سے کام کرتا ہے؟", rm: "Kaun sa policy auzaar tezi se kaam karta hai?" },
      options: [
        { en: "Fiscal policy — government can spend instantly", ur: "مالی پالیسی — حکومت فوری خرچ کر سکتی ہے", rm: "Maali policy — hukoomat fori kharch kar sakti hai" },
        { en: "Monetary policy — interest rate changes take effect quickly", ur: "مالیاتی پالیسی — شرح سود کی تبدیلیاں تیزی سے اثر کرتی ہیں", rm: "Maaliyaati policy — shar-e-sood ki tabdeeliyan tezi se asar karti hain" },
        { en: "Both are equally fast", ur: "دونوں یکساں تیز ہیں", rm: "Dono yaksan tez hain" },
        { en: "Neither has any effect in the short run", ur: "قلیل مدت میں کسی کا اثر نہیں", rm: "Qaleel muddat mein kisi ka asar nahi" },
      ],
      correctIndex: 1,
      explanation: { en: "Interest rate changes (monetary policy) take effect within weeks as borrowing costs change across the economy. Fiscal policy is slower — budgets are annual, spending projects take months to procure and deploy. That's why central banks respond faster to economic shocks.", ur: "شرح سود کی تبدیلیاں (مالیاتی پالیسی) ہفتوں میں اثر کرتی ہیں جب پوری معیشت میں قرض لینے کی لاگت بدلتی ہے۔ مالی پالیسی سست ہے — بجٹ سالانہ ہے۔", rm: "Shar-e-sood ki tabdeeliyan (maaliyaati policy) hafton mein asar karti hain. Maali policy sust hai — budget saalaana hai." },
    },
  ],
  faq: [
    {
      question: { en: "What is 'fiscal consolidation' and why does the IMF keep asking Pakistan to do it?", ur: "مالی استحکام کیا ہے اور IMF پاکستان سے یہ کیوں مانگتا رہتا ہے؟", rm: "Maali istihkaam kya hai aur IMF Pakistan se yeh kyun maangta rahta hai?" },
      answer: { en: "Fiscal consolidation means reducing the fiscal deficit — either by raising revenues (more taxes) or cutting spending. IMF programmes require Pakistan to consolidate because large deficits are financed by borrowing, which adds to already unsustainable debt. Without consolidation, Pakistan's debt servicing would consume an ever-larger share of revenue, leaving nothing for development. The painful medicine of consolidation is meant to restore fiscal sustainability so Pakistan doesn't need another bailout in 3-5 years.", ur: "مالی استحکام کا مطلب مالی خسارہ کم کرنا ہے — یا تو آمدنی بڑھا کر (زیادہ ٹیکس) یا اخراجات کاٹ کر۔ IMF پروگراموں میں پاکستان سے استحکام کی ضرورت ہے کیونکہ بڑے خسارے قرض لینے سے فنانس ہوتے ہیں۔", rm: "Maali istihkaam ka matlab maali khisaara kam karna hai — ya toh aamdani barha kar (zyada tax) ya ikhraajahat kaat kar. IMF programmoon mein Pakistan se istihkaam ki zaroorat hai kyunke bare khisaare qarz lene se finance hote hain." },
    },
  ],
};
