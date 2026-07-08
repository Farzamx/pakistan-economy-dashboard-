import type { Lesson } from "@/lib/academy/types";

export const savingsVsInvestmentLesson: Lesson = {
  slug: "savings-vs-investment",
  category: "beginner",
  title: { en: "Savings vs Investment: Where Money Goes to Grow", ur: "بچت بمقابلہ سرمایہ کاری: پیسہ کہاں بڑھنے جاتا ہے", rm: "Bachat Bamuqaabila Sarmaaya Kaari: Paisa Kahan Barhne Jaata Hai" },
  subtitle: {
    en: "The difference between saving and investing, why Pakistan saves too little, and how to make your money work",
    ur: "بچت اور سرمایہ کاری کا فرق، پاکستان بہت کم بچت کیوں کرتا ہے، اور اپنے پیسے کو کام پر کیسے لگائیں",
    rm: "Bachat aur sarmaaya kaari ka farq, Pakistan bahut kam bachat kyun karta hai, aur apne paise ko kaam par kaise lagayen",
  },
  level: "beginner",
  readMinutes: 7,
  isPremium: false,
  relatedIndicatorSlugs: [],
  relatedLessonSlugs: ["interest-rates-basics", "economic-growth-basics", "compound-interest"],
  content: {
    overview: {
      en: "Saving means not spending all your current income — setting some aside. Investment means putting money to work to generate more money in the future — buying shares, starting a business, or purchasing equipment. They're related but different. Pakistan's national savings rate (~13-15% of GDP) is among the lowest in Asia, meaning the country lacks the domestic capital to fund its own growth and must borrow abroad.",
      ur: "بچت کا مطلب ہے اپنی موجودہ آمدنی سب خرچ نہ کرنا — کچھ الگ رکھنا۔ سرمایہ کاری کا مطلب ہے مستقبل میں زیادہ پیسہ پیدا کرنے کے لیے پیسے کو کام پر لگانا۔ پاکستان کی قومی بچت کی شرح (~13-15% GDP) ایشیا میں سب سے کم ہے، اس لیے ملک اپنی ترقی کے لیے قرض پر انحصار کرتا ہے۔",
      rm: "Bachat ka matlab hai apni maujoodah aamdani sab kharch na karna — kuch alag rakhna. Sarmaaya kaari ka matlab hai mustaqbil mein zyada paisa paida karne ke liye paise ko kaam par lagana. Pakistan ki qoumi bachat ki shar (~13-15% GDP) Asia mein sab se kam hai, is liye mulk apni taraqqi ke liye qarz par inhisaar karta hai.",
    },
    whyItMatters: {
      en: "National investment requires national savings (or borrowing from abroad). When Pakistan's domestic savings rate is too low to fund needed investment, the gap must be filled by foreign capital (loans, FDI). This creates external debt dependency — making Pakistan vulnerable to global capital flow reversals. Countries with high savings (China ~45% of GDP, South Korea ~35%) had the fuel to invest massively in their own growth.",
      ur: "قومی سرمایہ کاری کے لیے قومی بچت (یا بیرون ملک سے قرض) درکار ہے۔ جب پاکستان کی گھریلو بچت کی شرح مطلوبہ سرمایہ کاری کے لیے بہت کم ہو، تو کمی غیر ملکی سرمایے سے پوری کرنی پڑتی ہے۔",
      rm: "Qoumi sarmaaya kaari ke liye qoumi bachat (ya bairun-e-mulk se qarz) darkar hai. Jab Pakistan ki ghareluu bachat ki shar matloba sarmaaya kaari ke liye bahut kam ho, toh kami ghair mulki sarmaaye se poori karni parti hai.",
    },
    explanation: {
      en: `**Savings:**
- Keeping money in a bank account (earns interest, but typically less than inflation in Pakistan)
- National Savings Certificates (government bonds with higher rates)
- Real estate (Pakistanis' favourite store of value)
- Gold (traditional hedge)
- Keeping cash at home (common in Pakistan — loses purchasing power over time)

**Investment (puts money to productive use):**
- Starting or expanding a business
- Buying stocks (PSX listed companies)
- Mutual funds
- Buying equipment that produces more goods
- Education and skills (human capital investment)

**The connection between savings and investment:** In a closed economy, savings = investment — every rupee saved is available to fund investment. In an open economy, countries can also invest using foreign capital. But heavy reliance on foreign savings (foreign loans) creates debt. Pakistan's fiscal deficit means the government itself is dissaving — spending more than it collects, which reduces national savings.

**Why Pakistanis save little:** Inflation erodes the real return on bank savings. Real estate provides better returns historically but is illiquid and expensive. Trust in formal financial institutions is limited (only ~21% of Pakistanis are banked). Poverty leaves little surplus to save.`,
      ur: `**بچت:**
- بینک کھاتے میں رقم (سود کماتا ہے، لیکن پاکستان میں عام طور پر مہنگائی سے کم)
- قومی بچت سرٹیفکیٹس
- جائداد (پاکستانیوں کی پسندیدہ قدر کا ذخیرہ)
- سونا (روایتی بچاؤ)

**سرمایہ کاری (پیسے کو نتیجہ خیز استعمال میں لاتی ہے):**
- کاروبار شروع یا توسیع کرنا
- حصص خریدنا (PSX)
- تعلیم اور مہارات (انسانی سرمایہ سرمایہ کاری)

**بچت اور سرمایہ کاری کا تعلق:** ہر بچایا ہوا روپیہ سرمایہ کاری کے لیے دستیاب ہے۔ پاکستان کا مالی خسارہ قومی بچت کم کرتا ہے۔`,
      rm: `**Bachat:**
- Bank khaate mein raqam (sood kamata hai, lekin Pakistan mein aam tor par mahangaai se kam)
- Qoumi bachat certificates
- Jaa-e-daaad (Pakistaniyon ki pasandida qadar ka zakheera)
- Sona (riwayati bachaao)

**Sarmaaya kaari (paise ko nateeja khaiz istemal mein laati hai):**
- Karobar shuru ya tawsee karna
- Hissas khareedna (PSX)
- Taaleem aur mahaaraten (insaani sarmaaya kaari)

**Bachat aur sarmaaya kaari ka taluq:** Har bachaya hua rupaya sarmaaya kaari ke liye dastyaab hai. Pakistan ka maali khisaara qoumi bachat kam karta hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Saving in a bank is always safe.** In Pakistan, bank deposit rates have often been below inflation — meaning the real purchasing power of your savings falls even while the nominal amount grows. Inflation eats your savings.

**Myth 2: Investment is only for the rich.** Mutual fund SIPs in Pakistan allow starting with as little as Rs 1,000/month. PSX allows small share purchases. Small business investment can start with household savings.

**Myth 3: Real estate is always the best investment.** Property is illiquid (hard to sell quickly), carries transaction costs (registration, capital gains tax), and is location-dependent. In many Pakistani cities, property prices have not kept up with inflation after adjusting for costs.`,
      ur: `**غلط فہمی 1: بینک میں بچت ہمیشہ محفوظ ہے۔** پاکستان میں بینک ڈپازٹ شرحیں اکثر مہنگائی سے کم رہی ہیں — آپ کی بچت کی حقیقی قوت خرید گرتی ہے۔

**غلط فہمی 2: سرمایہ کاری صرف امیروں کے لیے ہے۔** پاکستان میں میوچوئل فنڈ SIPs صرف 1,000 روپے/ماہ سے شروع ہوتے ہیں۔

**غلط فہمی 3: جائداد ہمیشہ بہترین سرمایہ کاری ہے۔** جائداد ناقابل منتقل ہے، لین دین کی لاگت ہے، اور مقام پر منحصر ہے۔`,
      rm: `**Ghalat fehmi 1: Bank mein bachat hamesha mahfooz hai.** Pakistan mein bank deposit sharayein aksar mahangaai se kam rahi hain — aap ki bachat ki haqeeqi quwwat-e-khureed girti hai.

**Ghalat fehmi 2: Sarmaaya kaari sirf ameron ke liye hai.** Pakistan mein mutual fund SIPs sirf 1,000 rupay/maah se shuru hote hain.

**Ghalat fehmi 3: Jaa-e-daaad hamesha behtareen sarmaaya kaari hai.** Jaa-e-daaad naaqabil-e-muntaqil hai, len-den ki lagat hai, aur maqaam par munsalik hai.`,
    },
    pakistanExample: {
      en: `**Pakistan's savings gap:** Pakistan's gross national savings rate has hovered around 13-15% of GDP — compared to 30-35% in India and 40%+ in China. This means Pakistan cannot fund adequate investment domestically. The investment-to-GDP ratio needs to be 25-30% for 6%+ growth, but with only 13-15% in savings, the rest must come from external borrowing. This structural savings gap is a root cause of Pakistan's chronic current account deficits and external debt buildup.`,
      ur: `**پاکستان کا بچت کا خلاء:** پاکستان کی مجموعی قومی بچت کی شرح GDP کے 13-15% کے آس پاس رہی ہے — بھارت میں 30-35% اور چین میں 40%+ کے مقابلے۔ یہ مطلب ہے کہ پاکستان مناسب سرمایہ کاری خود فنڈ نہیں کر سکتا۔ یہ ڈھانچائی بچت کا خلاء پاکستان کے دائمی جاری کھاتے کے خساروں کی جڑی وجہ ہے۔`,
      rm: `**Pakistan ka bachat ka khalaao:** Pakistan ki majmooee qoumi bachat ki shar GDP ke 13-15% ke aas paas rahi hai — Hindustan mein 30-35% aur China mein 40%+ ke muqaable. Yeh matlab hai ke Pakistan munaasib sarmaaya kaari khud fund nahi kar sakta. Yeh dhaanchaai bachat ka khalaao Pakistan ke daaimi jaari khaate ke khisaaron ki jaari wajah hai.`,
    },
    realWorld: {
      en: "Singapore's miracle is partly a forced savings story. The Central Provident Fund (CPF) requires workers and employers to contribute 20-37% of wages to mandatory savings accounts used for retirement, housing, and healthcare. Singapore's national savings rate exceeds 45% of GDP. This pool of capital funded Singapore's rapid development — instead of borrowing abroad, Singapore invested its own savings. A disciplined national savings framework can transform development trajectories.",
      ur: "سنگاپور کا معجزہ جزوی طور پر لازمی بچت کی کہانی ہے۔ سنٹرل پروویڈنٹ فنڈ (CPF) کارکنوں اور آجروں کو اجرت کا 20-37% لازمی بچت کھاتوں میں جمع کرنے کی ضرورت ہے۔ سنگاپور کی قومی بچت کی شرح GDP کا 45% سے زیادہ ہے۔",
      rm: "Singapore ka moajiza juzwi tor par laazmi bachat ki kahaani hai. CPF kaarkinon aur aajiron ko ujrat ka 20-37% laazmi bachat khaaton mein jama karne ki zaroorat hai. Singapore ki qoumi bachat ki shar GDP ka 45% se zyada hai.",
    },
    summary: {
      en: "• Saving = not spending all income; Investment = deploying money to earn more\n• Pakistan's savings rate (~13-15% of GDP) is dangerously low for an emerging economy\n• Low savings → insufficient domestic investment funding → external borrowing → debt\n• Inflation in Pakistan has often made bank savings deliver negative real returns\n• Options beyond banks: NSCs, mutual funds, PSX stocks, small business\n• The savings-investment gap is a structural cause of Pakistan's recurring crises",
      ur: "• بچت = تمام آمدنی خرچ نہ کرنا؛ سرمایہ کاری = زیادہ کمانے کے لیے پیسے لگانا\n• پاکستان کی بچت کی شرح (~13-15% GDP) ابھرتی معیشت کے لیے بہت کم\n• کم بچت → ناکافی گھریلو سرمایہ کاری → بیرونی قرض → قرض\n• اختیارات: NSCs، میوچوئل فنڈ، PSX، چھوٹا کاروبار\n• بچت-سرمایہ کاری کا خلاء پاکستان کے دائمی بحران کی ڈھانچائی وجہ ہے",
      rm: "• Bachat = tamam aamdani kharch na karna; Sarmaaya kaari = zyada kamane ke liye paise lagana\n• Pakistan ki bachat ki shar (~13-15% GDP) ubharti muaashat ke liye bahut kam\n• Kam bachat → nakaafi ghareluu sarmaaya kaari → baeruni qarz → qarz\n• Ikhtiyaraat: NSCs, mutual fund, PSX, chhota karobar\n• Bachat-sarmaaya kaari ka khalaao Pakistan ke daaimi bohran ki dhaanchaai wajah hai",
    },
  },
  quiz: [
    {
      question: { en: "What is the main difference between saving and investing?", ur: "بچت اور سرمایہ کاری کے درمیان بنیادی فرق کیا ہے؟", rm: "Bachat aur sarmaaya kaari ke darmiyan bunyaadi farq kya hai?" },
      options: [
        { en: "They are exactly the same thing", ur: "یہ بالکل ایک ہی چیز ہیں", rm: "Yeh bilkul ek hi cheez hain" },
        { en: "Saving preserves money; investment deploys money to generate returns", ur: "بچت پیسہ محفوظ رکھتی ہے؛ سرمایہ کاری منافع پیدا کرنے کے لیے پیسہ لگاتی ہے", rm: "Bachat paisa mahfooz rakhti hai; sarmaaya kaari munaafa paida karne ke liye paisa lagaati hai" },
        { en: "Investing is always safer than saving", ur: "سرمایہ کاری ہمیشہ بچت سے زیادہ محفوظ ہے", rm: "Sarmaaya kaari hamesha bachat se zyada mahfooz hai" },
        { en: "Saving is illegal in Islam", ur: "اسلام میں بچت غیر قانونی ہے", rm: "Islam mein bachat ghair qaanooni hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Saving stores value (bank account, NSC, gold). Investment actively puts money to work to earn a return — stocks, business, equipment. Investment involves risk; saving typically involves lower risk but also lower returns.", ur: "بچت قدر ذخیرہ کرتی ہے (بینک کھاتہ، NSC، سونا)۔ سرمایہ کاری فعال طور پر منافع کمانے کے لیے پیسے لگاتی ہے — حصص، کاروبار، آلات۔ سرمایہ کاری میں خطرہ شامل ہے۔", rm: "Bachat qadar zakheera karti hai (bank khaata, NSC, sona). Sarmaaya kaari faaal tor par munaafa kamane ke liye paise lagaati hai — hissas, karobar, aalaat. Sarmaaya kaari mein khatara shaamil hai." },
    },
    {
      question: { en: "If a bank pays 12% interest on deposits but inflation is 20%, what is the real return on savings?", ur: "اگر بینک ڈپازٹس پر 12% سود دیتا ہے لیکن مہنگائی 20% ہے، بچت پر حقیقی منافع کیا ہے؟", rm: "Agar bank deposits par 12% sood deta hai lekin mahangaai 20% hai, bachat par haqeeqi munaafa kya hai?" },
      options: [
        { en: "+12%", ur: "+12%", rm: "+12%" },
        { en: "+32%", ur: "+32%", rm: "+32%" },
        { en: "−8% (you are losing purchasing power)", ur: "−8% (آپ قوت خرید کھو رہے ہیں)", rm: "−8% (aap quwwat-e-khureed kho rahe hain)" },
        { en: "0%", ur: "0%", rm: "0%" },
      ],
      correctIndex: 2,
      explanation: { en: "Real return ≈ nominal return − inflation = 12% − 20% = −8%. Your savings are shrinking in real terms — each rupee buys 8% less purchasing power per year after inflation.", ur: "حقیقی منافع ≈ برائے نام منافع − مہنگائی = 12% − 20% = −8%۔ آپ کی بچت حقیقی لحاظ سے سکڑ رہی ہے۔", rm: "Haqeeqi munaafa ≈ baraae naam munaafa − mahangaai = 12% − 20% = −8%. Aap ki bachat haqeeqi lihaaz se sikur rahi hai." },
    },
    {
      question: { en: "Why does low national savings hurt Pakistan's economic growth?", ur: "کم قومی بچت پاکستان کی اقتصادی ترقی کو کیوں نقصان پہنچاتی ہے؟", rm: "Kam qoumi bachat Pakistan ki iqtisadi taraqqi ko kyun nuqsaan pahunchati hai?" },
      options: [
        { en: "It causes inflation directly", ur: "یہ براہ راست مہنگائی پیدا کرتی ہے", rm: "Yeh baraah-e-raast mahangaai paida karti hai" },
        { en: "Investment needs funding — low savings means more foreign borrowing", ur: "سرمایہ کاری کو فنڈنگ درکار ہے — کم بچت کا مطلب زیادہ غیر ملکی قرض", rm: "Sarmaaya kaari ko funding darkar hai — kam bachat ka matlab zyada ghair mulki qarz" },
        { en: "Savings destroy jobs", ur: "بچت ملازمتیں تباہ کرتی ہے", rm: "Bachat mulazmatein tabah karti hai" },
        { en: "Low savings prevent inflation", ur: "کم بچت مہنگائی روکتی ہے", rm: "Kam bachat mahangaai rokti hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Investment is funded by savings. If domestic savings are insufficient for the investment level needed, the gap must be filled by foreign capital (loans, FDI). Heavy foreign borrowing creates debt dependency and vulnerability to capital flow reversals.", ur: "سرمایہ کاری بچت سے فنڈ ہوتی ہے۔ اگر گھریلو بچت ناکافی ہو تو کمی غیر ملکی سرمایے سے پوری کرنی پڑتی ہے۔ بھاری غیر ملکی قرض انحصار پیدا کرتا ہے۔", rm: "Sarmaaya kaari bachat se fund hoti hai. Agar ghareluu bachat nakaafi ho toh kami ghair mulki sarmaaye se poori karni parti hai. Bhaari ghair mulki qarz inhisaar paida karta hai." },
    },
    {
      question: { en: "What is the minimum amount to start investing in Pakistani mutual funds (approximate)?", ur: "پاکستانی میوچوئل فنڈز میں سرمایہ کاری شروع کرنے کے لیے کم از کم رقم کتنی ہے (تقریباً)?", rm: "Pakistani mutual funds mein sarmaaya kaari shuru karne ke liye kam az kam raqam kitni hai (taqreeban)?" },
      options: [
        { en: "Rs 100,000", ur: "100,000 روپے", rm: "100,000 rupay" },
        { en: "Rs 1,000/month", ur: "1,000 روپے/ماہ", rm: "1,000 rupay/maah" },
        { en: "Rs 1,000,000", ur: "10,00,000 روپے", rm: "10,00,000 rupay" },
        { en: "You can only invest through a bank branch", ur: "آپ صرف بینک شاخ کے ذریعے سرمایہ کاری کر سکتے ہیں", rm: "Aap sirf bank shaakh ke zariye sarmaaya kaari kar sakte hain" },
      ],
      correctIndex: 1,
      explanation: { en: "Many Pakistani mutual funds allow systematic investment plans (SIPs) starting from Rs 1,000/month — making investing accessible even at low income levels. Apps like Meezan Investments, UBL Fund Managers, and others make this easy.", ur: "بہت سے پاکستانی میوچوئل فنڈ 1,000 روپے/ماہ سے منظم سرمایہ کاری کے منصوبوں (SIPs) کی اجازت دیتے ہیں — کم آمدنی پر بھی سرمایہ کاری قابل رسائی بناتے ہیں۔", rm: "Bahut se Pakistani mutual fund 1,000 rupay/maah se munazzam sarmaaya kaari ke mansobon (SIPs) ki ijaazat dete hain — kam aamdani par bhi sarmaaya kaari qaabil-e-rasaai banate hain." },
    },
  ],
  faq: [
    {
      question: { en: "Should I save in dollars or rupees in Pakistan?", ur: "کیا مجھے پاکستان میں ڈالر یا روپے میں بچت کرنی چاہیے؟", rm: "Kya mujhe Pakistan mein dollar ya rupay mein bachat karni chahiye?" },
      answer: { en: "Dollar savings protect against rupee depreciation but earn little interest in Pakistan. Rupee savings earn higher nominal interest but face inflation risk. A diversified approach — some rupees in NSCs or mutual funds, some dollars if you have international exposure or travel needs — is sensible. The SBP allows foreign currency accounts at Pakistani banks. Note: dollar savings don't protect against US inflation.", ur: "ڈالر بچت روپے کی کمی سے تحفظ دیتی ہے لیکن پاکستان میں کم سود کماتی ہے۔ روپے کی بچت زیادہ برائے نام سود کماتی ہے لیکن مہنگائی کا خطرہ ہے۔ متنوع نقطہ نظر سمجھداری ہے۔", rm: "Dollar bachat rupay ki kami se tahaffuz deti hai lekin Pakistan mein kam sood kamati hai. Rupay ki bachat zyada baraae naam sood kamati hai lekin mahangaai ka khatara hai. Mutanawwi nuqta-e-nazar samajhdaari hai." },
    },
  ],
};
