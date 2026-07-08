import type { Lesson } from "@/lib/academy/types";

export const economicGrowthBasicsLesson: Lesson = {
  slug: "economic-growth-basics",
  category: "beginner",
  title: { en: "Economic Growth: What It Is and What Drives It", ur: "اقتصادی ترقی: یہ کیا ہے اور اسے کیا چلاتا ہے", rm: "Iqtisadi Taraqqi: Yeh Kya Hai aur Ise Kya Chalata Hai" },
  subtitle: {
    en: "Why some countries grow rich while others stay poor — and what Pakistan needs to do",
    ur: "کچھ ممالک امیر کیوں ہو جاتے ہیں جبکہ دوسرے غریب رہتے ہیں — اور پاکستان کو کیا کرنا ہے",
    rm: "Kuch mumaalik ameer kyun ho jaate hain jabke doosre ghareeb rahte hain — aur Pakistan ko kya karna hai",
  },
  level: "beginner",
  readMinutes: 8,
  isPremium: false,
  relatedIndicatorSlugs: ["gdp-growth-pakistan"],
  relatedLessonSlugs: ["gdp", "economic-cycles", "productivity"],
  content: {
    overview: {
      en: "Economic growth means an increase in a country's real output of goods and services over time — measured as the percentage change in real GDP. Growth matters because it's the main way living standards improve. Without sustained growth, a population growing at 2% means per-capita income stagnates or falls. Pakistan needs 6%+ real growth consistently to make meaningful dents in poverty — it has averaged only 3-4%.",
      ur: "اقتصادی ترقی کا مطلب وقت کے ساتھ ملک کی اشیاء اور خدمات کی حقیقی پیداوار میں اضافہ ہے — حقیقی GDP میں فیصد تبدیلی کے طور پر ناپا جاتا ہے۔ پاکستان کو غربت کم کرنے کے لیے مستقل طور پر 6%+ حقیقی ترقی کی ضرورت ہے — اوسطاً صرف 3-4% رہا ہے۔",
      rm: "Iqtisadi taraqqi ka matlab waqt ke saath mulk ki cheezain aur khadamaat ki haqeeqi paidawar mein izaafa hai — haqeeqi GDP mein feesad tabdeeli ke tor par naapa jaata hai. Pakistan ko ghurbat kam karne ke liye mustaqil tor par 6%+ haqeeqi taraqqi ki zaroorat hai — ausat sirf 3-4% raha hai.",
    },
    whyItMatters: {
      en: "Growth compounding is extraordinary: at 2% growth, income doubles every 35 years. At 7% growth, it doubles every 10 years. China grew at ~10% for 30 years and lifted 800 million people out of poverty. South Korea went from poorer than Pakistan in 1960 to a high-income country today through sustained 7-8% growth. Pakistan's inability to sustain high growth is the fundamental reason it remains a lower-middle-income country.",
      ur: "ترقی کا مرکب اثر غیر معمولی ہے: 2% ترقی پر آمدنی 35 سال میں دوگنی ہوتی ہے۔ 7% پر، 10 سال میں۔ چین نے 30 سال تک ~10% ترقی کرتے ہوئے 80 کروڑ لوگوں کو غربت سے نکالا۔ پاکستان کی اعلی ترقی برقرار رکھنے میں ناکامی اس کی نچلی متوسط آمدنی ملک رہنے کی بنیادی وجہ ہے۔",
      rm: "Taraqqi ka marakkab asar ghair mamooli hai: 2% taraqqi par aamdani 35 saal mein dugni hoti hai. 7% par, 10 saal mein. China ne 30 saal tak ~10% taraqqi karte hue 80 crore logon ko ghurbat se nikaala. Pakistan ki aala taraqqi baqaraari rakhne mein naakamyabi is ki nichli mutawassit aamdani mulk rahne ki bunyaadi wajah hai.",
    },
    explanation: {
      en: `**Four sources of economic growth:**

**1. Capital accumulation:** More machinery, factories, infrastructure, and equipment per worker increases productivity. When Pakistan builds motorways, this increases the efficiency of trade and logistics, raising output.

**2. Labour force growth:** More workers producing more output. But population growth without skill improvement can be a burden — each additional worker needs education, healthcare, and jobs.

**3. Technological progress:** Better ways of doing things allow more output per unit of input. This is the most powerful and sustainable driver. The Green Revolution (high-yield seeds) transformed Pakistan's agriculture productivity in the 1960s-70s.

**4. Human capital (education and health):** A skilled, healthy, educated workforce produces more. Pakistan's low education spending (1.7% of GDP) and poor school quality are major growth constraints.

**Measuring growth:** Real GDP growth strips out inflation. If nominal GDP rose 15% but inflation was 20%, real GDP actually fell 5% — people got poorer despite higher numbers on paper.`,
      ur: `**اقتصادی ترقی کے چار ذرائع:**

**1. سرمائے کا جمع:** فی کارکن زیادہ مشینری، فیکٹریاں، بنیادی ڈھانچہ پیداواریت بڑھاتا ہے۔

**2. افرادی قوت کی ترقی:** زیادہ کارکن زیادہ پیداوار۔ لیکن مہارت کے بغیر آبادی میں اضافہ بوجھ ہو سکتا ہے۔

**3. تکنیکی ترقی:** کام کرنے کے بہتر طریقے فی اکائی زیادہ پیداوار دیتے ہیں۔ سبز انقلاب نے پاکستان کی زراعت کی پیداواریت تبدیل کی۔

**4. انسانی سرمایہ:** ہنر مند، صحت مند، تعلیم یافتہ افرادی قوت زیادہ پیدا کرتی ہے۔`,
      rm: `**Iqtisadi taraqqi ke chaar zaraaiye:**

**1. Sarmaaye ka jama:** Fi kaarkin zyada machinery, factories, bunyaadi dhaancha paidaawariyat barhata hai.

**2. Afraadi quwwat ki taraqqi:** Zyada kaarkin zyada paidawar. Lekin maharat ke baghair abaadi mein izaafa bojh ho sakta hai.

**3. Takneeki taraqqi:** Kaam karne ke behtar tareeqe fi ikaai zyada paidawar dete hain. Sabz inqilaab ne Pakistan ki ziraat ki paidaawariyat tabdeel ki.

**4. Insaani sarmaaya:** Hunar mand, sehatmand, taaleem yaafta afraadi quwwat zyada paida karti hai.`,
    },
    misconceptions: {
      en: `**Myth 1: GDP growth automatically means everyone benefits.** If growth is concentrated at the top (billionaires getting richer while workers' wages stagnate), GDP rises but most people don't benefit. Inclusive growth requires attention to distribution.

**Myth 2: High population growth helps economic growth.** More people add to the workforce, but they also add to demand for education, healthcare, and food. Pakistan's 2% population growth rate (one of Asia's highest) means any economic gains are quickly diluted per-capita.

**Myth 3: Economic growth is unlimited.** Unsustainable growth can deplete natural resources, cause environmental damage, and create instability. Pakistan's water scarcity, soil degradation, and smog crises show real environmental limits.`,
      ur: `**غلط فہمی 1: GDP ترقی خودبخود سب کو فائدہ دیتی ہے۔** اگر ترقی اوپر مرتکز ہو تو GDP بڑھتا ہے لیکن زیادہ تر لوگوں کو فائدہ نہیں ہوتا۔

**غلط فہمی 2: زیادہ آبادی ترقی میں مدد کرتی ہے۔** پاکستان کی 2% آبادی کی ترقی کسی بھی اقتصادی فائدے کو فی کس تیزی سے کمزور کرتی ہے۔

**غلط فہمی 3: اقتصادی ترقی لامحدود ہے۔** پاکستان کی پانی کی قلت اور فضائی آلودگی حقیقی ماحولیاتی حدود ہیں۔`,
      rm: `**Ghalat fehmi 1: GDP taraqqi khud-ba-khud sab ko faayda deti hai.** Agar taraqqi oopar mumarkkaz ho toh GDP barhta hai lekin zyada tar logon ko faayda nahi hota.

**Ghalat fehmi 2: Zyada abaadi taraqqi mein madad karti hai.** Pakistan ki 2% abaadi ki taraqqi kisi bhi iqtisadi faayde ko fi kass tezi se kamzor karti hai.

**Ghalat fehmi 3: Iqtisadi taraqqi laamahdood hai.** Pakistan ki paani ki qillat aur fizaayi aaludagi haqeeqi maahulaati hududd hain.`,
    },
    pakistanExample: {
      en: `**Pakistan's growth challenge:** Pakistan's real GDP growth averaged around 4-5% in good periods (2013-18, CPEC-driven) but has been volatile and insufficient. The key structural problems: (1) Investment rate is too low (~14% of GDP vs 30%+ needed for 7% growth). (2) Export diversification is poor — textiles dominate. (3) Energy costs are globally uncompetitive. (4) Education quality is poor — 60%+ of children can't read by age 10 (ASER data). (5) Political instability raises risk and deters investment. These structural barriers mean Pakistan cannot achieve the sustained high growth that transforms developing economies.`,
      ur: `**پاکستان کا ترقی کا چیلنج:** پاکستان کی حقیقی GDP ترقی اچھے ادوار میں اوسطاً 4-5% رہی ہے لیکن غیر مستحکم اور ناکافی رہی ہے۔ بنیادی ساختی مسائل: (1) سرمایہ کاری کی شرح بہت کم (~GDP کا 14%)۔ (2) برآمدی تنوع کمزور۔ (3) توانائی کی لاگت عالمی سطح پر غیر مسابقتی۔ (4) تعلیم کا معیار خراب۔ (5) سیاسی عدم استحکام سرمایہ کاری روکتا ہے۔`,
      rm: `**Pakistan ka taraqqi ka challenge:** Pakistan ki haqeeqi GDP taraqqi achi adwaar mein ausat 4-5% rahi hai lekin ghair mustahkam aur nakaafi rahi hai. Bunyaadi saakhti masaail: (1) Sarmaaya kaari ki shar bahut kam (~GDP ka 14%). (2) Baraamdaati tanawwu kamzor. (3) Tawanaayi ki lagat aalami satah par ghair musaabiqati. (4) Taaleem ka miyaar kharaab. (5) Siyaasi adam-istihkaam sarmaaya kaari rokta hai.`,
    },
    realWorld: {
      en: "South Korea's 'miracle': In 1960, South Korea's per-capita income was lower than Pakistan's. By deliberate policies — investing heavily in education, targeting export-led manufacturing, building infrastructure, and maintaining political stability — South Korea sustained 7-9% growth for 30 years. Today its per-capita income exceeds $35,000 vs Pakistan's ~$1,500. The contrast shows growth is not inevitable — it requires the right policies, institutions, and sustained commitment.",
      ur: "جنوبی کوریا کا 'معجزہ': 1960 میں جنوبی کوریا کی فی کس آمدنی پاکستان سے کم تھی۔ جان بوجھ کر پالیسیوں سے — تعلیم میں بھاری سرمایہ کاری، برآمد کی قیادت میں مینوفیکچرنگ — جنوبی کوریا نے 30 سال تک 7-9% ترقی برقرار رکھی۔ آج اس کی فی کس آمدنی $35,000 سے زیادہ ہے بمقابلہ پاکستان کے ~$1,500۔",
      rm: "Janoobi Korea ka 'moajiza': 1960 mein Janoobi Korea ki fi kass aamdani Pakistan se kam thi. Jaanboojhkar polisiyon se — taaleem mein bhaari sarmaaya kaari, baraadm ki qiyaadat mein manufacturing — Janoobi Korea ne 30 saal tak 7-9% taraqqi baqaraari rakhi. Aaj is ki fi kass aamdani $35,000 se zyada hai bamuqaabla Pakistan ke ~$1,500.",
    },
    summary: {
      en: "• Economic growth = % increase in real GDP per year\n• 4 drivers: capital, labour, technology, human capital (education+health)\n• At 2% growth, income doubles in 35 years; at 7%, in 10 years\n• Pakistan needs 6%+ sustained growth to meaningfully reduce poverty\n• Key barriers: low investment rate, poor education, energy costs, instability\n• Growth alone isn't enough — it must be inclusive and environmentally sustainable",
      ur: "• اقتصادی ترقی = سالانہ حقیقی GDP میں % اضافہ\n• 4 محرکات: سرمایہ، محنت، ٹیکنالوجی، انسانی سرمایہ\n• 2% ترقی پر 35 سال میں آمدنی دوگنی؛ 7% پر 10 سال میں\n• پاکستان کو غربت کم کرنے کے لیے مستقل 6%+ ترقی درکار\n• رکاوٹیں: کم سرمایہ کاری، خراب تعلیم، توانائی لاگت، عدم استحکام\n• تنہا ترقی کافی نہیں — اسے سب کو شامل اور ماحولیاتی طور پر پائیدار ہونا چاہیے",
      rm: "• Iqtisadi taraqqi = saalaana haqeeqi GDP mein % izaafa\n• 4 muhirrikaat: sarmaaya, mehnat, technology, insaani sarmaaya\n• 2% taraqqi par 35 saal mein aamdani dugni; 7% par 10 saal mein\n• Pakistan ko ghurbat kam karne ke liye mustaqil 6%+ taraqqi darkar\n• Rukaavatein: kam sarmaaya kaari, kharaab taaleem, tawanaayi lagat, adam-istihkaam",
    },
  },
  quiz: [
    {
      question: { en: "If real GDP grows at 7% annually, approximately how many years does it take to double?", ur: "اگر حقیقی GDP سالانہ 7% بڑھے، تو دوگنا ہونے میں تقریباً کتنے سال لگتے ہیں؟", rm: "Agar haqeeqi GDP saalaana 7% barhe, toh dugna hone mein taqreeban kitne saal lagte hain?" },
      options: [
        { en: "35 years", ur: "35 سال", rm: "35 saal" },
        { en: "20 years", ur: "20 سال", rm: "20 saal" },
        { en: "10 years", ur: "10 سال", rm: "10 saal" },
        { en: "5 years", ur: "5 سال", rm: "5 saal" },
      ],
      correctIndex: 2,
      explanation: { en: "Using the Rule of 72: 72 ÷ 7 ≈ 10 years. At 2% growth it takes 36 years. This compounding difference explains why sustained high growth transforms economies.", ur: "72 کے اصول کا استعمال: 72 ÷ 7 ≈ 10 سال۔ 2% ترقی پر 36 سال لگتے ہیں۔ یہ مرکب فرق بتاتا ہے کہ پائیدار اعلی ترقی معیشتوں کو کیوں تبدیل کرتی ہے۔", rm: "72 ke usool ka istemal: 72 ÷ 7 ≈ 10 saal. 2% taraqqi par 36 saal lagte hain. Yeh marakkab farq batata hai ke paaydaar aala taraqqi muaashaton ko kyun tabdeel karti hai." },
    },
    {
      question: { en: "Pakistan's nominal GDP grew 18% in one year, but inflation was 25%. What happened to real GDP?", ur: "پاکستان کا برائے نام GDP ایک سال میں 18% بڑھا، لیکن مہنگائی 25% تھی۔ حقیقی GDP کا کیا ہوا؟", rm: "Pakistan ka baraae naam GDP ek saal mein 18% barha, lekin mahangaai 25% thi. Haqeeqi GDP ka kya hua?" },
      options: [
        { en: "It grew 18%", ur: "یہ 18% بڑھا", rm: "Yeh 18% barha" },
        { en: "It fell by approximately 7%", ur: "یہ تقریباً 7% گرا", rm: "Yeh taqreeban 7% gira" },
        { en: "It grew 43%", ur: "یہ 43% بڑھا", rm: "Yeh 43% barha" },
        { en: "It stayed the same", ur: "یہ وہی رہا", rm: "Yeh wahi raha" },
      ],
      correctIndex: 1,
      explanation: { en: "Real GDP growth ≈ nominal growth − inflation = 18% − 25% = −7%. Despite more money changing hands, the actual quantity of goods produced fell — people were poorer in real terms.", ur: "حقیقی GDP ترقی ≈ برائے نام ترقی − مہنگائی = 18% − 25% = −7%۔ زیادہ پیسے تبادلے کے باوجود، پیداوار کی اصل مقدار کم ہوئی — لوگ حقیقی لحاظ سے غریب ہوئے۔", rm: "Haqeeqi GDP taraqqi ≈ baraae naam taraqqi − mahangaai = 18% − 25% = −7%. Zyada paise tabaadlay ke baawajood, paidawar ki asl miqdar kam hui — log haqeeqi lihaaz se ghareeb hue." },
    },
    {
      question: { en: "Which factor is considered the most powerful long-run driver of economic growth?", ur: "کس عامل کو اقتصادی ترقی کے سب سے طاقتور طویل مدتی محرک کے طور پر سمجھا جاتا ہے؟", rm: "Kis aamil ko iqtisadi taraqqi ke sab se taaqatwar taweel muddat muhirrik ke tor par samjha jaata hai?" },
      options: [
        { en: "More workers entering the labour force", ur: "افرادی قوت میں زیادہ کارکنوں کا داخل ہونا", rm: "Afraadi quwwat mein zyada kaarkinon ka daakhil hona" },
        { en: "Technological progress and productivity improvements", ur: "تکنیکی ترقی اور پیداواریت میں بہتری", rm: "Takneeki taraqqi aur paidaawariyat mein behtari" },
        { en: "Higher government spending", ur: "زیادہ حکومتی اخراجات", rm: "Zyada hukomaati ikhraajahat" },
        { en: "More foreign debt", ur: "زیادہ غیر ملکی قرض", rm: "Zyada ghair mulki qarz" },
      ],
      correctIndex: 1,
      explanation: { en: "Technological progress allows more output from the same inputs — it's not limited by physical resources. Education, R&D, and innovation drive this. Capital and labour have diminishing returns; technology does not.", ur: "تکنیکی ترقی ایک ہی وسائل سے زیادہ پیداوار دیتی ہے — یہ جسمانی وسائل سے محدود نہیں۔ تعلیم، R&D، اور اختراع اسے چلاتی ہے۔", rm: "Takneeki taraqqi ek hi wasail se zyada paidawar deti hai — yeh jismaani wasail se mahdood nahi. Taaleem, R&D, aur ikhtiraaa ise chalati hai." },
    },
    {
      question: { en: "South Korea grew from poorer than Pakistan (1960) to a high-income country. What was the key factor?", ur: "جنوبی کوریا پاکستان سے زیادہ غریب (1960) سے ایک اعلی آمدنی والا ملک بنا۔ اہم عامل کیا تھا؟", rm: "Janoobi Korea Pakistan se zyada ghareeb (1960) se ek aala aamdani wala mulk bana. Ahem aamil kya tha?" },
      options: [
        { en: "Large oil reserves discovered", ur: "بڑے تیل کے ذخائر دریافت ہوئے", rm: "Bare tel ke zakheray daryaaft hue" },
        { en: "Sustained high growth driven by education, exports, and industrial policy", ur: "تعلیم، برآمدات اور صنعتی پالیسی سے مستقل اعلی ترقی", rm: "Taaleem, baraamdaat aur sanaati policy se mustaqil aala taraqqi" },
        { en: "Receiving more foreign aid than any other country", ur: "کسی بھی دوسرے ملک سے زیادہ غیر ملکی امداد وصول کرنا", rm: "Kisi bhi doosre mulk se zyada ghair mulki imdaad wasool karna" },
        { en: "Natural resource abundance", ur: "قدرتی وسائل کی فراوانی", rm: "Qudrati wasail ki faraawani" },
      ],
      correctIndex: 1,
      explanation: { en: "South Korea invested massively in education, built export-oriented manufacturing (electronics, cars, shipbuilding), and maintained consistent industrial policy over decades. No oil, no major aid — just policy discipline.", ur: "جنوبی کوریا نے تعلیم میں بھاری سرمایہ کاری کی، برآمد کی قیادت میں مینوفیکچرنگ بنائی، اور دہائیوں تک مستقل صنعتی پالیسی برقرار رکھی۔", rm: "Janoobi Korea ne taaleem mein bhaari sarmaaya kaari ki, baraadm ki qiyaadat mein manufacturing banaai, aur dahaayon tak mustaqil sanaati policy baqaraari rakhi." },
    },
  ],
  faq: [
    {
      question: { en: "What growth rate does Pakistan need to eliminate poverty?", ur: "پاکستان کو غربت ختم کرنے کے لیے کس شرح ترقی کی ضرورت ہے؟", rm: "Pakistan ko ghurbat khatam karne ke liye kis shar taraqqi ki zaroorat hai?" },
      answer: { en: "Economists estimate Pakistan needs sustained real GDP growth of 6-7%+ per year for 15-20 years to significantly reduce poverty. At 2.5% population growth, even 5% GDP growth means only 2.5% per-capita income growth. Pakistan has rarely sustained 6%+ for more than 2-3 consecutive years — political cycles, external shocks, and structural weaknesses repeatedly derail growth momentum.", ur: "ماہرین اقتصادیات کا تخمینہ ہے کہ پاکستان کو غربت کم کرنے کے لیے 15-20 سال تک مستقل 6-7%+ حقیقی GDP ترقی درکار ہے۔ 2.5% آبادی کی ترقی پر، 5% GDP ترقی بھی صرف 2.5% فی کس آمدنی ترقی کا مطلب ہے۔", rm: "Maahireen iqtisadiyaat ka takhmina hai ke Pakistan ko ghurbat kam karne ke liye 15-20 saal tak mustaqil 6-7%+ haqeeqi GDP taraqqi darkar hai. 2.5% abaadi ki taraqqi par, 5% GDP taraqqi bhi sirf 2.5% fi kass aamdani taraqqi ka matlab hai." },
    },
  ],
};
