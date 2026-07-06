import type { CategoryMeta, Lesson, AcademyCategory } from "@/lib/academy/types";
import { inflationLesson } from "@/lib/academy/lessons/beginner/inflation";
import { gdpLesson } from "@/lib/academy/lessons/beginner/gdp";
import { policyRateLesson } from "@/lib/academy/lessons/banking/policyRate";
import { cpiPakistanLesson } from "@/lib/academy/lessons/pakistan-economy/cpi";

export const ALL_LESSONS: Lesson[] = [
  inflationLesson,
  gdpLesson,
  policyRateLesson,
  cpiPakistanLesson,
];

export const CATEGORY_META: CategoryMeta[] = [
  {
    slug: "beginner",
    title: { en: "Beginner Economics", ur: "ابتدائی معاشیات", rm: "Ibtidaai Maashiyaat" },
    description: {
      en: "Core economic concepts every Pakistani should understand — from inflation to GDP, explained simply",
      ur: "ہر پاکستانی کے لیے بنیادی اقتصادی تصورات — افراطِ زر سے GDP تک، آسان زبان میں",
      rm: "Har Pakistani ke liye bunyaadi iqtisaadi tasawwuraat — inflation se GDP tak, aasaan alfaaz mein",
    },
    icon: "📊",
    color: "blue",
  },
  {
    slug: "pakistan-economy",
    title: { en: "Pakistan Economy", ur: "پاکستانی معیشت", rm: "Pakistani Maashiyaat" },
    description: {
      en: "Pakistan-specific economics — CPI, SBP, PBS, forex reserves, trade, and what drives the rupee",
      ur: "پاکستان کی معاشی حقیقتیں — CPI، SBP، PBS، زرمبادلہ ذخائر، تجارت، اور روپے پر کیا اثر پڑتا ہے",
      rm: "Pakistan ki maashi haqeeqaten — CPI, SBP, PBS, zar-e-mubadla zakhayir, tijaarat, aur rupay par kya asar parta hai",
    },
    icon: "🇵🇰",
    color: "emerald",
  },
  {
    slug: "banking",
    title: { en: "Banking & Monetary Policy", ur: "بینکاری اور مالیاتی پالیسی", rm: "Banking aur Maaliyaati Policy" },
    description: {
      en: "How the SBP controls money, sets interest rates, and manages Pakistan's financial system",
      ur: "SBP کیسے پیسے کنٹرول کرتا ہے، شرح سود مقرر کرتا ہے، اور پاکستان کے مالیاتی نظام کا انتظام کرتا ہے",
      rm: "SBP kaise paise control karta hai, share sood muqarrar karta hai, aur Pakistan ke maaliyaati nizaam ka intizaam karta hai",
    },
    icon: "🏦",
    color: "purple",
  },
  {
    slug: "inflation",
    title: { en: "Inflation", ur: "افراطِ زر", rm: "Inflation" },
    description: {
      en: "Deep dives into CPI, core inflation, SPI, and what drives prices in Pakistan's economy",
      ur: "CPI، بنیادی افراطِ زر، SPI، اور پاکستانی معیشت میں قیمتوں کو کیا چلاتا ہے",
      rm: "CPI, bunyaadi inflation, SPI, aur Pakistani maashiyat mein qeematon ko kya chalata hai",
    },
    icon: "📈",
    color: "rose",
  },
  {
    slug: "monetary-policy",
    title: { en: "Monetary Policy", ur: "مالیاتی پالیسی", rm: "Maaliyaati Policy" },
    description: {
      en: "Interest rates, repo, open market operations, KIBOR, and how central banks steer the economy",
      ur: "شرح سود، ریپو، کھلی منڈی کی کارروائیاں، KIBOR، اور مرکزی بینک معیشت کو کیسے چلاتے ہیں",
      rm: "Share sood, repo, khuli mandi ki karrawayian, KIBOR, aur markazi bank maashiyat ko kaise chalate hain",
    },
    icon: "⚙️",
    color: "cyan",
  },
  {
    slug: "fiscal-policy",
    title: { en: "Fiscal Policy", ur: "مالیاتی پالیسی", rm: "Maali Policy" },
    description: {
      en: "Government spending, taxation, deficits, and how budget decisions affect Pakistan's economy",
      ur: "حکومتی اخراجات، ٹیکس، خسارے، اور بجٹ فیصلے پاکستانی معیشت کو کیسے متاثر کرتے ہیں",
      rm: "Hukoomati akhraajaat, tax, khassaray, aur budget faislay Pakistani maashiyat ko kaise mutassir karte hain",
    },
    icon: "🏛️",
    color: "amber",
  },
  {
    slug: "government-budget",
    title: { en: "Government Budget", ur: "حکومتی بجٹ", rm: "Hukoomati Budget" },
    description: {
      en: "Pakistan's federal and provincial budgets — revenue, expenditure, and where the money goes",
      ur: "پاکستان کے وفاقی اور صوبائی بجٹ — آمدنی، اخراجات، اور پیسہ کہاں جاتا ہے",
      rm: "Pakistan ke wafaqi aur soobayi budget — aamdani, akhraajaat, aur paisa kahan jaata hai",
    },
    icon: "📋",
    color: "indigo",
  },
  {
    slug: "taxation",
    title: { en: "Taxation", ur: "ٹیکس", rm: "Tax" },
    description: {
      en: "FBR, income tax, sales tax, customs, and Pakistan's tax reform journey",
      ur: "FBR، آمدنی ٹیکس، سیلز ٹیکس، کسٹمز، اور پاکستان کا ٹیکس اصلاحات کا سفر",
      rm: "FBR, aamdani tax, sales tax, customs, aur Pakistan ka tax islaahaat ka safar",
    },
    icon: "📝",
    color: "orange",
  },
  {
    slug: "international-trade",
    title: { en: "International Trade", ur: "بین الاقوامی تجارت", rm: "Bayn-ul-Aqwami Tijaarat" },
    description: {
      en: "Exports, imports, trade balance, and Pakistan's role in global supply chains",
      ur: "برآمدات، درآمدات، تجارتی توازن، اور عالمی سپلائی چین میں پاکستان کا کردار",
      rm: "Baraamdaat, daraamdaat, tijarati tawaazun, aur aalami supply chain mein Pakistan ka kirdaar",
    },
    icon: "🌐",
    color: "teal",
  },
  {
    slug: "foreign-exchange",
    title: { en: "Foreign Exchange", ur: "زرمبادلہ", rm: "Zar-e-Mubadla" },
    description: {
      en: "PKR/USD, REER, NEER, current account, and what drives Pakistan's exchange rate",
      ur: "PKR/USD، REER، NEER، جاری کھاتہ، اور پاکستانی شرح تبادلہ کو کیا چلاتا ہے",
      rm: "PKR/USD, REER, NEER, jaari khaata, aur Pakistani share tabadlah ko kya chalata hai",
    },
    icon: "💱",
    color: "emerald",
  },
  {
    slug: "capital-markets",
    title: { en: "Capital Markets", ur: "سرمایہ منڈیاں", rm: "Sarmaya Mandiyan" },
    description: {
      en: "KSE-100, PSX, equity investing, and how Pakistan's stock market works",
      ur: "KSE-100، PSX، ایکوئٹی سرمایہ کاری، اور پاکستان کی اسٹاک مارکیٹ کیسے کام کرتی ہے",
      rm: "KSE-100, PSX, equity sarmaya kaari, aur Pakistan ki stock market kaise kaam karti hai",
    },
    icon: "📈",
    color: "violet",
  },
  {
    slug: "stock-market",
    title: { en: "Stock Market", ur: "اسٹاک مارکیٹ", rm: "Stock Market" },
    description: {
      en: "How stocks work, valuation, PSX sectors, and equity analysis for Pakistani investors",
      ur: "حصص کیسے کام کرتے ہیں، تشخیص، PSX شعبے، اور پاکستانی سرمایہ کاروں کے لیے ایکوئٹی تجزیہ",
      rm: "Hissas kaise kaam karte hain, tashkhees, PSX shobay, aur Pakistani sarmayakaaron ke liye equity tajziya",
    },
    icon: "📊",
    color: "blue",
  },
  {
    slug: "bonds",
    title: { en: "Bonds & Fixed Income", ur: "بانڈز اور ثابت آمدنی", rm: "Bonds aur Saabit Aamdani" },
    description: {
      en: "Treasury bills, PIBs, yields, duration, and Pakistan's sovereign debt market",
      ur: "خزانہ بلز، PIBs، منافع، مدت، اور پاکستان کا خودمختار قرضی بازار",
      rm: "Khazana bills, PIBs, munafa, muddat, aur Pakistan ka khudmukhtaar qarzay ka baazaar",
    },
    icon: "🏦",
    color: "amber",
  },
  {
    slug: "mutual-funds",
    title: { en: "Mutual Funds", ur: "میوچل فنڈز", rm: "Mutual Funds" },
    description: {
      en: "How mutual funds work, types available in Pakistan, NAV, and fund selection",
      ur: "میوچل فنڈز کیسے کام کرتے ہیں، پاکستان میں دستیاب اقسام، NAV، اور فنڈ کا انتخاب",
      rm: "Mutual funds kaise kaam karte hain, Pakistan mein dastiyaab aqsaam, NAV, aur fund ka intikhaab",
    },
    icon: "🗂️",
    color: "teal",
  },
  {
    slug: "derivatives",
    title: { en: "Derivatives", ur: "مشتقات", rm: "Mushtuqqaat" },
    description: {
      en: "Futures, options, hedging strategies, and how derivatives are used in Pakistan",
      ur: "فیوچرز، آپشنز، ہیجنگ حکمت عملی، اور پاکستان میں مشتقات کا استعمال",
      rm: "Futures, options, hedging hikmat-e-amli, aur Pakistan mein mushtuqqaat ka istemaal",
    },
    icon: "📐",
    color: "rose",
  },
  {
    slug: "islamic-finance",
    title: { en: "Islamic Finance", ur: "اسلامی مالیات", rm: "Islaami Maaliyaat" },
    description: {
      en: "Sukuk, Murabaha, Ijarah, and the principles of Shariah-compliant finance in Pakistan",
      ur: "سکوک، مرابحہ، اجارہ، اور پاکستان میں شریعت کے مطابق مالیات کے اصول",
      rm: "Sukuk, Murabaha, Ijarah, aur Pakistan mein Sharia ke mutaabiq maaliyaat ke usool",
    },
    icon: "☪️",
    color: "emerald",
  },
  {
    slug: "economic-indicators",
    title: { en: "Economic Indicators", ur: "معاشی اشارے", rm: "Maashi Ashariye" },
    description: {
      en: "How to read and interpret GDP, CPI, unemployment, PMI, and other key economic data",
      ur: "GDP، CPI، بے روزگاری، PMI، اور دیگر اہم معاشی ڈیٹا کو کیسے پڑھیں اور سمجھیں",
      rm: "GDP, CPI, be-rozgari, PMI, aur doosray aham maashi data ko kaise parhen aur samjhein",
    },
    icon: "📉",
    color: "cyan",
  },
  {
    slug: "data-interpretation",
    title: { en: "Data Interpretation", ur: "ڈیٹا کی تشریح", rm: "Data ki Tashreeh" },
    description: {
      en: "How to read economic charts, understand YoY vs MoM, and avoid common data mistakes",
      ur: "معاشی چارٹ کیسے پڑھیں، YoY بمقابلہ MoM کو سمجھیں، اور عام غلطیوں سے بچیں",
      rm: "Maashi charts kaise parhen, YoY bmuqabla MoM samjhein, aur aam ghaltiyon se bachein",
    },
    icon: "🔢",
    color: "indigo",
  },
  {
    slug: "financial-statements",
    title: { en: "Financial Statements", ur: "مالی بیانات", rm: "Maali Bayaanat" },
    description: {
      en: "Reading balance sheets, income statements, and cash flow statements of Pakistani companies",
      ur: "پاکستانی کمپنیوں کی بیلنس شیٹ، آمدنی کا بیان، اور نقد روانی کا بیان پڑھنا",
      rm: "Pakistani companies ki balance sheet, aamdani ka bayaan, aur naqad rawani ka bayaan parrhna",
    },
    icon: "📑",
    color: "orange",
  },
  {
    slug: "investing-fundamentals",
    title: { en: "Investing Fundamentals", ur: "سرمایہ کاری کی بنیادیں", rm: "Sarmaya Kaari ki Bunyaadein" },
    description: {
      en: "Risk vs. return, asset allocation, diversification, and investment planning for Pakistanis",
      ur: "خطرہ بمقابلہ منافع، اثاثہ مختص، تنوع، اور پاکستانیوں کے لیے سرمایہ کاری کی منصوبہ بندی",
      rm: "Khatrah bmuqabla munafa, asaasa mukhtas, tanawwu, aur Pakistaniyon ke liye sarmaya kaari ki mansooba bandi",
    },
    icon: "💼",
    color: "purple",
  },
  {
    slug: "risk-management",
    title: { en: "Risk Management", ur: "خطرے کا انتظام", rm: "Khatray ka Intizaam" },
    description: {
      en: "Identifying, measuring, and managing financial risk in investments and business",
      ur: "سرمایہ کاری اور کاروبار میں مالی خطرے کی شناخت، پیمائش، اور انتظام",
      rm: "Sarmaya kaari aur karobaar mein maali khatray ki shanakht, pemaish, aur intizaam",
    },
    icon: "⚠️",
    color: "rose",
  },
  {
    slug: "behavioral-finance",
    title: { en: "Behavioral Finance", ur: "رویے کی مالیات", rm: "Rawayye ki Maaliyaat" },
    description: {
      en: "How psychology affects investment decisions — biases, herd behavior, and irrational markets",
      ur: "نفسیات سرمایہ کاری کے فیصلوں کو کیسے متاثر کرتی ہے — تعصبات، بھیڑ کا رویہ، اور غیر منطقی منڈیاں",
      rm: "Nafsiyaat sarmaya kaari ke faislon ko kaise mutassir karti hai — ta'ssub, bheer ka rawayya, aur ghair-mantaqi mandiyan",
    },
    icon: "🧠",
    color: "violet",
  },
  {
    slug: "personal-finance",
    title: { en: "Personal Finance", ur: "ذاتی مالیات", rm: "Zaati Maaliyaat" },
    description: {
      en: "Budgeting, saving, investing, and building wealth for Pakistani households",
      ur: "بجٹ بنانا، بچت، سرمایہ کاری، اور پاکستانی گھرانوں کے لیے دولت بنانا",
      rm: "Budget banana, bachaat, sarmaya kaari, aur Pakistani gharanon ke liye dolat banana",
    },
    icon: "🏠",
    color: "teal",
  },
  {
    slug: "global-economy",
    title: { en: "Global Economy", ur: "عالمی معیشت", rm: "Aalami Maashiyaat" },
    description: {
      en: "How global trends — US Fed, oil prices, China, and emerging markets — affect Pakistan",
      ur: "عالمی رجحانات — امریکی فیڈ، تیل کی قیمتیں، چین، اور ابھرتی منڈیاں — پاکستان کو کیسے متاثر کرتی ہیں",
      rm: "Aalami rujhaanaat — Amreeki Fed, tail ki qeematen, China, aur ubhrti mandiyan — Pakistan ko kaise mutassir karti hain",
    },
    icon: "🌍",
    color: "blue",
  },
  {
    slug: "imf-world-bank",
    title: { en: "IMF & World Bank", ur: "IMF اور ورلڈ بینک", rm: "IMF aur World Bank" },
    description: {
      en: "Pakistan's relationship with the IMF and World Bank — programs, conditionalities, and debt",
      ur: "IMF اور ورلڈ بینک کے ساتھ پاکستان کا تعلق — پروگرام، شرائط، اور قرض",
      rm: "IMF aur World Bank ke saath Pakistan ka taluq — programs, shraait, aur qarz",
    },
    icon: "🏛️",
    color: "amber",
  },
  {
    slug: "sbp",
    title: { en: "State Bank of Pakistan", ur: "اسٹیٹ بینک آف پاکستان", rm: "State Bank of Pakistan" },
    description: {
      en: "SBP's mandate, tools, decisions, and how Pakistan's central bank shapes the economy",
      ur: "SBP کا مینڈیٹ، ٹولز، فیصلے، اور پاکستان کا مرکزی بینک معیشت کو کیسے تشکیل دیتا ہے",
      rm: "SBP ka mandate, tools, faislay, aur Pakistan ka markazi bank maashiyat ko kaise tashkeel deta hai",
    },
    icon: "🏦",
    color: "emerald",
  },
  {
    slug: "pbs",
    title: { en: "Pakistan Bureau of Statistics", ur: "پاکستان بیورو آف اسٹیٹسٹکس", rm: "Pakistan Bureau of Statistics" },
    description: {
      en: "How PBS measures GDP, CPI, employment, and produces Pakistan's official economic data",
      ur: "PBS کیسے GDP، CPI، روزگار ماپتا ہے، اور پاکستان کا سرکاری معاشی ڈیٹا تیار کرتا ہے",
      rm: "PBS kaise GDP, CPI, rozgaar mapata hai, aur Pakistan ka sarkari maashi data taiyaar karta hai",
    },
    icon: "📊",
    color: "indigo",
  },
  {
    slug: "intermediate",
    title: { en: "Intermediate Economics", ur: "درمیانی معاشیات", rm: "Darmiyanaa Maashiyaat" },
    description: {
      en: "Beyond the basics — deeper analysis of markets, policy, and economic theory",
      ur: "بنیادیات سے آگے — منڈیوں، پالیسی، اور معاشی نظریے کا گہرا تجزیہ",
      rm: "Bunyaadiyaat se aagey — mandiyon, policy, aur maashi nazriyay ka gehra tajziya",
    },
    icon: "📚",
    color: "orange",
  },
  {
    slug: "psx",
    title: { en: "PSX — Pakistan Stock Exchange", ur: "PSX — پاکستان اسٹاک ایکسچینج", rm: "PSX — Pakistan Stock Exchange" },
    description: {
      en: "How to trade on PSX, listing rules, corporate governance, and Pakistan equity markets",
      ur: "PSX پر کیسے ٹریڈ کریں، لسٹنگ کے قوانین، کارپوریٹ گورننس، اور پاکستانی ایکوئٹی بازار",
      rm: "PSX par kaise trade karein, listing ke qawaaneen, corporate governance, aur Pakistani equity baazaar",
    },
    icon: "💹",
    color: "cyan",
  },
  {
    slug: "advanced",
    title: { en: "Advanced Topics", ur: "اعلی موضوعات", rm: "Aala Mawzoo'aat" },
    description: {
      en: "IMF programs, debt sustainability, structural reform, and macro theory for the serious economist",
      ur: "IMF پروگرام، قرض کی پائیداری، ساختی اصلاح، اور سنجیدہ ماہر معاشیات کے لیے کلی نظریہ",
      rm: "IMF programs, qarz ki paaydaari, saakhtaati islaah, aur sanjeedah maahhir maashiyaat ke liye kulli nazriya",
    },
    icon: "🎓",
    color: "rose",
  },
];

export function getLessonsByCategory(category: string): Lesson[] {
  return ALL_LESSONS.filter((l) => l.category === category);
}

export function getLessonBySlug(slug: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.slug === slug);
}

export function getLessonByCategoryAndSlug(category: string, slug: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.category === category && l.slug === slug);
}

export function getCategoryMeta(slug: string): CategoryMeta | undefined {
  return CATEGORY_META.find((c) => c.slug === slug);
}

export function getCategoryColors(color: string): { border: string; bg: string; text: string; icon: string } {
  const map: Record<string, { border: string; bg: string; text: string; icon: string }> = {
    blue: { border: "border-neon-blue/25 hover:border-neon-blue/45", bg: "bg-neon-blue/5 hover:bg-neon-blue/10", text: "text-neon-blue", icon: "bg-neon-blue/10" },
    purple: { border: "border-neon-purple/25 hover:border-neon-purple/45", bg: "bg-neon-purple/5 hover:bg-neon-purple/10", text: "text-neon-purple", icon: "bg-neon-purple/10" },
    emerald: { border: "border-emerald-400/25 hover:border-emerald-400/45", bg: "bg-emerald-400/5 hover:bg-emerald-400/10", text: "text-emerald-400", icon: "bg-emerald-400/10" },
    amber: { border: "border-amber-400/25 hover:border-amber-400/45", bg: "bg-amber-400/5 hover:bg-amber-400/10", text: "text-amber-400", icon: "bg-amber-400/10" },
    rose: { border: "border-rose-400/25 hover:border-rose-400/45", bg: "bg-rose-400/5 hover:bg-rose-400/10", text: "text-rose-400", icon: "bg-rose-400/10" },
    cyan: { border: "border-cyan-400/25 hover:border-cyan-400/45", bg: "bg-cyan-400/5 hover:bg-cyan-400/10", text: "text-cyan-400", icon: "bg-cyan-400/10" },
    violet: { border: "border-violet-400/25 hover:border-violet-400/45", bg: "bg-violet-400/5 hover:bg-violet-400/10", text: "text-violet-400", icon: "bg-violet-400/10" },
    orange: { border: "border-orange-400/25 hover:border-orange-400/45", bg: "bg-orange-400/5 hover:bg-orange-400/10", text: "text-orange-400", icon: "bg-orange-400/10" },
    teal: { border: "border-teal-400/25 hover:border-teal-400/45", bg: "bg-teal-400/5 hover:bg-teal-400/10", text: "text-teal-400", icon: "bg-teal-400/10" },
    indigo: { border: "border-indigo-400/25 hover:border-indigo-400/45", bg: "bg-indigo-400/5 hover:bg-indigo-400/10", text: "text-indigo-400", icon: "bg-indigo-400/10" },
  };
  return map[color] ?? map.blue;
}
