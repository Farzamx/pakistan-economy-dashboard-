import type { Lesson } from "@/lib/academy/types";

export const marketFailureLesson: Lesson = {
  slug: "market-failure",
  category: "beginner",
  title: { en: "Market Failure: When Markets Get It Wrong", ur: "بازار کی ناکامی: جب بازار غلطی کرتے ہیں", rm: "Baazaar ki Naakamyi: Jab Baazaar Ghalti karte hain" },
  subtitle: {
    en: "Why free markets sometimes produce bad outcomes — and when government intervention is justified",
    ur: "آزاد بازار کبھی کبھی برے نتائج کیوں پیدا کرتے ہیں — اور سرکاری مداخلت کب جائز ہے",
    rm: "Aazaad baazaar kabhi kabhi bure nataayij kyun paida karte hain — aur sarkari mudaakhalat kab jaayez hai",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: [],
  relatedLessonSlugs: ["price-signals", "market-types", "government-spending-basics"],
  content: {
    overview: {
      en: "Markets are powerful mechanisms for allocating resources efficiently — but they fail in predictable ways. Market failure occurs when free markets, left alone, produce outcomes that are inefficient or unfair: too much pollution, too little education, monopoly prices, or information asymmetry where sellers know more than buyers. These failures justify government intervention — not to replace markets, but to correct specific distortions. Pakistan faces all four main types of market failure, which explains much of its regulatory and policy landscape.",
      ur: "بازار وسائل کو مؤثر طریقے سے مختص کرنے کے لیے طاقتور طریقہ کار ہیں — لیکن وہ قابل پیش گوئی طریقوں سے ناکام ہوتے ہیں۔ بازار کی ناکامی اس وقت ہوتی ہے جب آزاد بازار، تنہا چھوڑے جائیں، ایسے نتائج پیدا کریں جو غیر مؤثر یا ناانصاف ہوں۔ پاکستان کو بازار کی ناکامی کی چاروں اہم اقسام کا سامنا ہے۔",
      rm: "Baazaar wasail ko moassir tareeqe se mukhtas karne ke liye taaqatwar tareeqa-kayr hain — lekin woh qaabil-e-pesh-gooi tareeqon se naakaam hote hain. Baazaar ki naakamyi us waqt hoti hai jab aazaad baazaar, tanha chhaade jayen, aise nataayij paida karen jo ghair-moassir ya na-insaafi hon. Pakistan ko baazaar ki naakamyi ki chaaron ahem aqsaam ka saamna hai.",
    },
    whyItMatters: {
      en: "Understanding market failure explains Pakistan's biggest policy challenges: Why does the government provide subsidised electricity (energy market failure — natural monopoly)? Why should it fund public schools (education market failure — undersupply without intervention)? Why does Pakistan need an Environmental Protection Agency (pollution externality)? Why does the Securities and Exchange Commission of Pakistan (SECP) regulate the stock market (information asymmetry)? Market failure theory gives a principled basis for deciding when government should and shouldn't intervene.",
      ur: "بازار کی ناکامی کو سمجھنا پاکستان کے سب سے بڑے پالیسی چیلنجوں کی وضاحت کرتا ہے: حکومت سبسڈی والی بجلی کیوں فراہم کرتی ہے (توانائی بازار کی ناکامی)؟ اسے سرکاری سکول کیوں فنڈ کرنے چاہئیں (تعلیم بازار کی ناکامی)؟ پاکستان کو EPA کی ضرورت کیوں ہے (آلودگی بیرونیت)؟",
      rm: "Baazaar ki naakamyi ko samajhna Pakistan ke sab se bare policy challenges ki wazaahat karta hai: Hukoomat subsidy waali bijli kyun faraahim karti hai (tawanaayi baazaar ki naakamyi)? Use sarkari school kyun fund karne chahiye (taleem baazaar ki naakamyi)? Pakistan ko EPA ki zaroorat kyun hai (aaolodgi baironiyat)?",
    },
    explanation: {
      en: `**The four main types of market failure:**

**1. Externalities:** Actions that affect third parties not involved in the transaction.
- Negative externality: A brick kiln burns coal, polluting the air — neighbours breathe it but pay nothing for the pollution. The market price of bricks doesn't include this social cost → too many bricks made, too much pollution produced.
- Positive externality: Education benefits society (more skilled workers, lower crime, better civic participation) beyond just the individual learner. Private market underprovides education → need public schools and subsidies.
- **Pakistan example:** Vehicles in Lahore, Karachi burning low-quality fuel cause severe smog. The market price of petrol doesn't include the health cost of air pollution — a negative externality. This justifies emission standards and fuel quality regulations.

**2. Public goods:** Non-excludable (can't stop people from using it) and non-rival (one person using it doesn't reduce availability for others).
- Examples: national defence, street lights, flood control infrastructure
- Private market won't provide them (free rider problem — why pay if you can't be excluded?) → government must provide
- **Pakistan example:** Flood embankments on the Indus — protecting millions at once. No private company would build and maintain them because they can't charge each protected household.

**3. Information asymmetry:** One party to a transaction has more information than the other.
- Used car market: seller knows the car's history, buyer doesn't → lemons problem (bad cars drive out good ones)
- Medical insurance: insurance company doesn't know your true health risk → adverse selection (sicker people buy more insurance, making it unaffordable)
- **Pakistan example:** PSX (stock market) regulation by SECP prevents insider trading — companies' management knows information that public investors don't, creating unfair advantage. Disclosure rules force information sharing.

**4. Monopoly/market power:** When a single firm dominates and charges prices above competitive levels, reducing output and welfare.
- Natural monopolies (electricity grid, gas pipelines) — efficient to have one network but need regulation to prevent exploitation
- **Pakistan example:** WAPDA/NEPRA (electricity sector) — transmission and distribution are natural monopolies. Government regulates electricity tariffs rather than allowing WAPDA to charge monopoly prices.`,
      ur: `**بازار کی ناکامی کی چار اہم اقسام:**

**1. بیرونیات:** وہ اعمال جو لین دین میں شامل نہ ہونے والے فریق ثالث کو متاثر کرتے ہیں۔
- منفی بیرونیت: ایک اینٹوں کا بھٹہ کوئلہ جلاتا ہے، فضا کو آلودہ کرتا ہے۔
- مثبت بیرونیت: تعلیم معاشرے کو انفرادی سیکھنے والے سے زیادہ فائدہ دیتی ہے → نجی بازار تعلیم کا کم انتظام کرتا ہے → سرکاری سکولوں کی ضرورت۔

**2. عوامی اشیاء:** غیر خارج کرنے کے قابل اور غیر حریف۔
- مثالیں: قومی دفاع، گلی کی روشنیاں، سیلاب کنٹرول بنیادی ڈھانچہ
- نجی بازار انہیں فراہم نہیں کرے گا → حکومت کو فراہم کرنا ہوگا

**3. معلوماتی عدم توازن:** لین دین کے ایک فریق کے پاس دوسرے سے زیادہ معلومات ہیں۔
- استعمال شدہ کار بازار: بیچنے والا گاڑی کی تاریخ جانتا ہے، خریدار نہیں
- **پاکستان مثال:** PSX ضابطہ اندرونی تجارت کو روکتا ہے

**4. اجارہ داری/بازار کی طاقت:** جب ایک کمپنی حاوی ہو اور مسابقتی سطح سے اوپر قیمتیں وصول کرے۔`,
      rm: `**Baazaar ki naakamyi ki chaar ahem aqsaam:**

**1. Baironiyaat:** Woh aamaal jo len-den mein shaamil na hone waale fariq-e-salis ko mutaassir karte hain.
- Manfi baironiyat: ek eentoN ka bhatta koyla jalata hai, fiza ko aaoloda karta hai.
- Masbat baironiyat: taleem samaj ko infiraadi seekhne wale se zyada faayda deti hai → niji baazaar taleem ka kam intzaam karta hai → sarkari schoolon ki zaroorat.

**2. Amoomi ashaaya:** Ghair-khaaarij karne ke qaabil aur ghair-hareef.
- Misaalein: qoomi difaa, gali ki roshniyan, sailaab control bunyaadi dhaancha
- Niji baazaar unhen faraahim nahin karega → hukoomat ko faraahim karna hoga

**3. Maaluumaati adam-tawaazun:** Len-den ke ek fariq ke paas doosre se zyada maaluumaat hain.
- Istemal shuda gaar baazaar: bechne wala gaadi ki taareekh jaanta hai, khareedaar nahin
- **Pakistan misaal:** PSX zaabita androoni tijaarat ko rokta hai

**4. Ijaara daari/baazaar ki taaqat:** Jab ek company haawi ho aur muqaablatee satah se uupar qeematen wasool kare.`,
    },
    misconceptions: {
      en: `**Myth 1: Any government intervention is justified if there's a market failure.** Market failure justifies considering intervention — but government intervention itself can fail (regulatory capture, corruption, information problems). The question is whether government intervention makes things better or worse on balance. Sometimes both the market and government fail.

**Myth 2: Positive externalities always justify subsidies.** The subsidy must be well-designed. Pakistan subsidised fertilisers for decades — helping large farmers more than small farmers, distorting crop choices. The externality was real; the subsidy was poorly targeted.

**Myth 3: Natural monopolies should always be government-owned.** Natural monopolies need regulation — but ownership can be private, provided the regulator sets fair prices. Many countries have privatised electricity distribution while keeping transmission regulated. Pakistan's WAPDA experience shows that government ownership doesn't automatically solve the monopoly problem.`,
      ur: `**غلط فہمی 1: بازار کی ناکامی ہونے پر کسی بھی سرکاری مداخلت کا جواز ہے۔** بازار کی ناکامی مداخلت پر غور کرنے کا جواز دیتی ہے — لیکن سرکاری مداخلت خود بھی ناکام ہو سکتی ہے۔ سوال یہ ہے کہ آیا سرکاری مداخلت توازن پر چیزوں کو بہتر یا بدتر بناتی ہے۔

**غلط فہمی 2: مثبت بیرونیات ہمیشہ سبسڈی کا جواز دیتی ہیں۔** پاکستان نے دہائیوں تک کھادوں کو سبسڈی دی — چھوٹے کسانوں کی بجائے بڑے کسانوں کو زیادہ مدد ملی۔

**غلط فہمی 3: قدرتی اجارہ دارییاں ہمیشہ حکومت کی ملکیت ہونی چاہئیں۔** قدرتی اجارہ داریوں کو ضابطے کی ضرورت ہے — لیکن ملکیت نجی ہو سکتی ہے۔`,
      rm: `**Ghalat fehmi 1: Baazaar ki naakamyi hone par kisi bhi sarkari mudaakhalat ka jawaaz hai.** Baazaar ki naakamyi mudaakhalat par ghour karne ka jawaaz deti hai — lekin sarkari mudaakhalat khud bhi naakaam ho sakti hai.

**Ghalat fehmi 2: Masbat baironiyaat hamesha subsidy ka jawaaz deti hain.** Pakistan ne dahaayon tak khaadoN ko subsidy di — chhote kissaanon ki bajaaye bare kissaanon ko zyada madad mili.

**Ghalat fehmi 3: Qudrati ijaara daariyan hamesha hukoomat ki milkiyat honi chahiye.** Qudrati ijaara daariyon ko zaabite ki zaroorat hai — lekin milkiyat niji ho sakti hai.`,
    },
    pakistanExample: {
      en: `**Karachi's air pollution — negative externality in action:** Industrial factories in Karachi and vehicle traffic (many running on low-quality CNG or petrol) produce air pollution that imposes health costs on millions of residents — respiratory disease, reduced life expectancy, lost productivity. These costs are "external" — they're real but not reflected in the factory's production costs or the car driver's petrol cost. The market underprices pollution-producing activities. This is the textbook case for emissions regulations, pollution taxes, or vehicle emission standards — forcing producers to internalise their external costs. Pakistan's environmental regulation (EPA) is weak, which is why the market failure persists.`,
      ur: `**کراچی کی فضائی آلودگی — منفی بیرونیت عمل میں:** کراچی میں صنعتی فیکٹریاں اور ٹریفک فضائی آلودگی پیدا کرتی ہیں جو لاکھوں باشندوں پر صحت لاگتیں عائد کرتی ہیں۔ یہ لاگتیں "بیرونی" ہیں — وہ حقیقی ہیں لیکن فیکٹری کی پیداواری لاگت میں ظاہر نہیں۔ بازار آلودگی پیدا کرنے والی سرگرمیوں کی قیمت کم لگاتا ہے۔ یہ اخراج کے ضوابط، آلودگی ٹیکس کا نصابی کتاب کیس ہے۔ پاکستان کا ماحولیاتی ضابطہ (EPA) کمزور ہے، اسی لیے بازار کی ناکامی برقرار رہتی ہے۔`,
      rm: `**Karachi ki fazaayi aaolodgi — manfi baironiyat amal mein:** Karachi mein sanaati factories aur traffic fazaayi aaolodgi paida karti hain jo laakhon baashindoN par sehat lagaten aaid karti hain. Yeh lagaten "bairooni" hain — woh haqeeqi hain lekin factory ki paidawaari lagat mein zaahir nahin. Baazaar aaolodgi paida karne wali sargarmiyon ki qeemat kam lagata hai. Yeh ikhraajaati ke zawaabat, aaolodgi tax ka nisaabi kitaab case hai. Pakistan ka mahaoolyaati zaabita (EPA) kamzor hai, isi liye baazaar ki naakamyi barqaraar rehti hai.`,
    },
    realWorld: {
      en: "The 2008 Global Financial Crisis is a case study in market failure from information asymmetry and systemic risk (a form of externality). Banks knew their mortgage-backed securities were riskier than buyers thought (information asymmetry). And each individual bank's failure imposed costs on the entire financial system (systemic externality) — when Lehman Brothers collapsed, credit froze globally. This justified the $700 billion US government bailout (TARP) and massive regulatory reform (Dodd-Frank Act) to address these market failures. Even the most market-oriented economists accepted the need for intervention when market failures are this systemic.",
      ur: "2008 کا عالمی مالی بحران معلوماتی عدم توازن اور نظامی خطرے (بیرونیت کی ایک شکل) سے بازار کی ناکامی کا ایک کیس اسٹڈی ہے۔ بینکوں کو پتا تھا کہ ان کے مارگیج سے حمایت یافتہ سیکیورٹیز خریداروں کے خیال سے زیادہ خطرناک ہیں۔ اور ہر انفرادی بینک کی ناکامی نے پورے مالی نظام پر لاگتیں عائد کیں۔",
      rm: "2008 ka aalami maali bohran maaluumaati adam-tawaazun aur nizaami khatre (baironiyat ki ek shakal) se baazaar ki naakamyi ka ek case study hai. Bankon ko pata tha ke un ke mortgage se himaayat yaafta securities khareedaroon ke khyaal se zyada khatarnaak hain. Aur har infiraadi bank ki naakamyi ne poore maali nizam par lagaten aaid kin." },
    summary: {
      en: "• Market failure: when free markets produce inefficient or unfair outcomes\n• 4 types: externalities, public goods, information asymmetry, monopoly/market power\n• Negative externality (pollution): market underprices social costs → over-production\n• Public goods (national defence): free-rider problem → private market won't provide\n• Information asymmetry: sellers know more than buyers → adverse selection, fraud\n• Market failure = case for intervention, not automatic proof government does better",
      ur: "• بازار کی ناکامی: جب آزاد بازار غیر مؤثر یا ناانصاف نتائج پیدا کریں\n• 4 اقسام: بیرونیات، عوامی اشیاء، معلوماتی عدم توازن، اجارہ داری/بازار کی طاقت\n• منفی بیرونیت (آلودگی): بازار سماجی لاگت کم قیمت لگاتا ہے → زیادہ پیداوار\n• عوامی اشیاء (قومی دفاع): مفت سواری مسئلہ → نجی بازار فراہم نہیں کرے گا\n• معلوماتی عدم توازن: بیچنے والے خریداروں سے زیادہ جانتے ہیں → منفی انتخاب، دھوکہ\n• بازار کی ناکامی = مداخلت کا کیس، خودکار طور پر ثبوت نہیں کہ حکومت بہتر کرتی ہے",
      rm: "• Baazaar ki naakamyi: jab aazaad baazaar ghair-moassir ya na-insaafi nataayij paida karen\n• 4 aqsaam: baironiyaat, amoomi ashaaya, maaluumaati adam-tawaazun, ijaara daari/baazaar ki taaqat\n• Manfi baironiyat (aaolodgi): baazaar samaaji lagat kam qeemat lagata hai → zyada paidawar\n• Amoomi ashaaya (qoomi difaa): muft sawaari masla → niji baazaar faraahim nahin karega\n• Maaluumaati adam-tawaazun: bechne wale khareedaroon se zyada jaante hain → manfi intikhab, dhoka\n• Baazaar ki naakamyi = mudaakhalat ka case, khudkaar tor par saboot nahin ke hukoomat behtar karti hai",
    },
  },
  quiz: [
    {
      question: { en: "A brick factory in Pakistan pollutes a river, affecting downstream farmers who grow crops. This is an example of:", ur: "پاکستان میں ایک اینٹوں کی فیکٹری ایک دریا کو آلودہ کرتی ہے، نیچے دھارے کسانوں کو متاثر کرتی ہے۔ یہ ایک مثال ہے:", rm: "Pakistan mein ek eentoN ki factory ek darya ko aaoloda karti hai, neeche dhaare kissaanon ko mutaassir karti hai. Yeh ek misaal hai:" },
      options: [
        { en: "A positive externality", ur: "ایک مثبت بیرونیت", rm: "Ek masbat baironiyat" },
        { en: "A negative externality — costs imposed on third parties not in the transaction", ur: "ایک منفی بیرونیت — فریق ثالث پر عائد لاگتیں جو لین دین میں شامل نہیں", rm: "Ek manfi baironiyat — fariq-e-salis par aaid lagaten jo len-den mein shaamil nahin" },
        { en: "A public good", ur: "ایک عوامی چیز", rm: "Ek amoomi cheez" },
        { en: "Information asymmetry", ur: "معلوماتی عدم توازن", rm: "Maaluumaati adam-tawaazun" },
      ],
      correctIndex: 1,
      explanation: { en: "The factory's pollution imposes costs (damaged crops, contaminated water) on farmers who are not party to the factory's production decisions. This external cost is not reflected in the market price of bricks — a classic negative externality that justifies environmental regulation.", ur: "فیکٹری کی آلودگی کسانوں پر لاگتیں (تباہ فصلیں، آلودہ پانی) عائد کرتی ہے جو فیکٹری کے پیداواری فیصلوں کے فریق نہیں ہیں۔ یہ بیرونی لاگت اینٹوں کی بازار قیمت میں ظاہر نہیں ہوتی — ماحولیاتی ضابطے کا جواز دینے والی کلاسک منفی بیرونیت۔", rm: "Factory ki aaolodgi kissaanon par lagaten (tabah fasalein, aaoloda paani) aaid karti hai jo factory ke paidawaari faislon ke fariq nahin hain. Yeh bairooni lagat eentoN ki baazaar qeemat mein zaahir nahin hoti — mahaoolyaati zaabite ka jawaaz dene wali classic manfi baironiyat." },
    },
    {
      question: { en: "Why won't private companies build flood protection embankments for Pakistan's Indus River?", ur: "نجی کمپنیاں پاکستان کے دریائے سندھ کے لیے سیلاب سے تحفظ کے بند کیوں نہیں بنائیں گی؟", rm: "Niji companies Pakistan ke Darya-e-Sindh ke liye sailaab se tahaffuz ke band kyun nahin banaaengi?" },
      options: [
        { en: "Because construction is too expensive", ur: "کیونکہ تعمیر بہت مہنگی ہے", rm: "Kyunke taameer bahut mahangi hai" },
        { en: "Because flood protection is a public good — can't exclude anyone from its benefits, so can't charge users profitably", ur: "کیونکہ سیلاب سے تحفظ ایک عوامی چیز ہے — کسی کو بھی اس کے فوائد سے خارج نہیں کر سکتے، اس لیے صارفین سے منافع بخش طریقے سے چارج نہیں کر سکتے", rm: "Kyunke sailaab se tahaffuz ek amoomi cheez hai — kisi bhi ko bhi is ke fawaaید se khaaarij nahin kar sakte, is liye saraafeen se munaafa bakhsh tareeqe se charge nahin kar sakte" },
        { en: "Because Pakistan doesn't have floods", ur: "کیونکہ پاکستان میں سیلاب نہیں آتے", rm: "Kyunke Pakistan mein sailaab nahin aate" },
        { en: "Because the government banned private construction", ur: "کیونکہ حکومت نے نجی تعمیر پر پابندی لگائی ہے", rm: "Kyunke hukoomat ne niji taameer par paabandi lagaai hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Flood embankments are non-excludable (everyone within the protected area benefits — you can't make some people 'inside' and some 'outside' the protection zone) and non-rival (one farmer's protection doesn't reduce another's). The free rider problem: households protected for free have no incentive to pay a private company. So private companies won't build them — this is the market failure that justifies government provision.", ur: "سیلاب کے بند غیر خارج کرنے کے قابل ہیں (محفوظ علاقے میں ہر کوئی فائدہ اٹھاتا ہے) اور غیر حریف (ایک کسان کا تحفظ دوسرے کو کم نہیں کرتا)۔ مفت سواری مسئلہ: مفت محفوظ گھرانوں کے پاس نجی کمپنی کو ادائیگی کی کوئی ترغیب نہیں۔", rm: "Sailaab ke band ghair-khaaarij karne ke qaabil hain (mahfooz ilaaqa mein har koi faayda uthaata hai) aur ghair-hareef (ek kissaan ka tahaffuz doosre ko kam nahin karta). Muft sawaari masla: muft mahfooz ghraanoN ke paas niji company ko adaayigi ki koi targhib nahin." },
    },
    {
      question: { en: "The Securities and Exchange Commission of Pakistan (SECP) requires companies to disclose financial information publicly. This addresses which market failure?", ur: "پاکستان کے سیکیورٹیز اینڈ ایکسچینج کمیشن (SECP) کمپنیوں کو مالی معلومات عوامی طور پر ظاہر کرنے کا تقاضا کرتا ہے۔ یہ بازار کی کس ناکامی کو دور کرتا ہے؟", rm: "Pakistan ke Securities and Exchange Commission (SECP) companies ko maali maaluumaat amoomi tor par zaahir karne ka taqaaza karta hai. Yeh baazaar ki kis naakamyi ko door karta hai?" },
      options: [
        { en: "Negative externalities from factory pollution", ur: "فیکٹری آلودگی سے منفی بیرونیات", rm: "Factory aaolodgi se manfi baironiyaat" },
        { en: "Information asymmetry — company insiders know more than public investors", ur: "معلوماتی عدم توازن — کمپنی کے اندرونی لوگ عوامی سرمایہ کاروں سے زیادہ جانتے ہیں", rm: "Maaluumaati adam-tawaazun — company ke androoni log amoomi sarmaaya kaaron se zyada jaante hain" },
        { en: "Public goods provision", ur: "عوامی اشیاء کی فراہمی", rm: "Amoomi ashaaya ki faraahami" },
        { en: "Monopoly regulation", ur: "اجارہ داری ضابطہ", rm: "Ijaara daari zaabita" },
      ],
      correctIndex: 1,
      explanation: { en: "Company management knows the firm's true financial situation, hidden liabilities, and future prospects better than outside investors. Without mandatory disclosure, insiders can exploit this advantage (insider trading, misrepresenting performance). SECP's disclosure rules reduce this information asymmetry, making markets fairer and more efficient.", ur: "کمپنی مینجمنٹ باہری سرمایہ کاروں سے بہتر فرم کی حقیقی مالی صورتحال جانتی ہے۔ لازمی انکشاف کے بغیر، اندرونی لوگ اس فائدے کا استحصال کر سکتے ہیں (اندرونی تجارت)۔ SECP کے انکشاف قوانین اس معلوماتی عدم توازن کو کم کرتے ہیں۔", rm: "Company management baahri sarmaaya kaaron se behtar firm ki haqeeqi maali sorat-e-haal jaanti hai. Laazmi inkishaaf ke baghair, androoni log is faayde ka istiHSaal kar sakte hain (androoni tijarat). SECP ke inkishaaf qawaaneen is maaluumaati adam-tawaazun ko kam karte hain." },
    },
    {
      question: { en: "Pakistan's WAPDA electricity transmission network is a natural monopoly. What does this mean?", ur: "پاکستان کا WAPDA بجلی ٹرانسمیشن نیٹ ورک ایک قدرتی اجارہ داری ہے۔ اس کا کیا مطلب ہے؟", rm: "Pakistan ka WAPDA bijli transmission network ek qudrati ijaara daari hai. Is ka kya matlab hai?" },
      options: [
        { en: "WAPDA was naturally formed without government help", ur: "WAPDA قدرتی طور پر حکومتی مدد کے بغیر بنا", rm: "WAPDA qudrati tor par hukoomati madad ke baghair bana" },
        { en: "It's most efficient to have one transmission grid, making competition uneconomic — justifying regulation", ur: "ایک ٹرانسمیشن گرڈ ہونا سب سے زیادہ مؤثر ہے، مسابقت کو غیر اقتصادی بناتا ہے — ضابطے کا جواز دیتا ہے", rm: "Ek transmission grid hona sab se zyada moassir hai, muqaabla ko ghair-iqtisaadi banata hai — zaabite ka jawaaz deta hai" },
        { en: "WAPDA only uses natural energy sources", ur: "WAPDA صرف قدرتی توانائی کے ذرائع استعمال کرتا ہے", rm: "WAPDA sirf qudrati tawanaayi ke zaraaiye istemal karta hai" },
        { en: "Electricity transmission requires no government regulation", ur: "بجلی ٹرانسمیشن کو کوئی سرکاری ضابطہ نہیں چاہیے", rm: "Bijli transmission ko koi sarkari zaabita nahin chahiye" },
      ],
      correctIndex: 1,
      explanation: { en: "Building two competing electricity grids in the same city would be wasteful — enormous duplication of infrastructure. The economics favour a single grid (natural monopoly). But a single unregulated provider would charge monopoly prices. Solution: allow the natural monopoly but regulate its prices (NEPRA sets electricity tariffs in Pakistan) rather than allowing competition or government ownership to solve the problem.", ur: "ایک ہی شہر میں دو مقابل بجلی گرڈ بنانا فضول ہوگا — بنیادی ڈھانچے کی بڑی نقل۔ معاشیات ایک گرڈ (قدرتی اجارہ داری) کی حمایت کرتی ہیں۔ لیکن ایک واحد غیر منظم فراہم کنندہ اجارہ داری قیمتیں وصول کرے گا۔ حل: قدرتی اجارہ داری کی اجازت دیں لیکن اس کی قیمتوں کو منظم کریں (NEPRA پاکستان میں بجلی ٹیرف مقرر کرتا ہے)۔", rm: "Ek hi shehar mein do muqaabil bijli grid banana fazool hoga — bunyaadi dhaanche ki bari naqal. Muaashiyaat ek grid (qudrati ijaara daari) ki himaayat karti hain. Lekin ek waahid ghair-muntazam faraahim kunanda ijaara daari qeematen wasool karega. Hal: qudrati ijaara daari ki ijaazat dein lekin is ki qeematon ko muntazam karein (NEPRA Pakistan mein bijli tariff muqarrar karta hai)." },
    },
  ],
  faq: [
    {
      question: { en: "Does identifying a market failure automatically mean the government should intervene?", ur: "کیا بازار کی ناکامی کی نشاندہی کرنا خودکار طور پر اس بات کا مطلب ہے کہ حکومت کو مداخلت کرنی چاہیے؟", rm: "Kya baazaar ki naakamyi ki nishaan-dahi karna khudkaar tor par is baat ka matlab hai ke hukoomat ko mudaakhalat karni chahiye?" },
      answer: { en: "No — identifying a market failure shows there is a potential case for intervention, not that intervention will definitely improve things. The key test is: Will government intervention make outcomes better or worse on balance? Government can also fail: corruption diverts subsidies to the wrong people, regulations get captured by the industries they're supposed to regulate, bureaucratic inefficiency wastes resources. In Pakistan, many interventions that were justified by market failures actually worsened outcomes (fertiliser subsidies, electricity cross-subsidies, import restrictions). The right question isn't 'is there a market failure?' but 'will intervention fix the failure better than the market can adjust on its own?'", ur: "نہیں — بازار کی ناکامی کی نشاندہی کرنا ظاہر کرتا ہے کہ مداخلت کے لیے ممکنہ کیس ہے، یہ نہیں کہ مداخلت یقینی طور پر چیزوں کو بہتر بنائے گی۔ کلیدی آزمائش یہ ہے: کیا سرکاری مداخلت توازن پر نتائج کو بہتر یا بدتر بنائے گی؟ حکومت بھی ناکام ہو سکتی ہے۔ پاکستان میں، بازار کی ناکامیوں سے جائز بہت سی مداخلتوں نے دراصل نتائج کو بدتر بنایا۔", rm: "Nahin — baazaar ki naakamyi ki nishaan-dahi karna zaahir karta hai ke mudaakhalat ke liye mumkina case hai, yeh nahin ke mudaakhalat yaqeenan cheezain behtar banayegi. Kaleedi aazmaish yeh hai: Kya sarkari mudaakhalat tawaazun par nataayij behtar ya badtar banayegi? Hukoomat bhi naakaam ho sakti hai. Pakistan mein, baazaar ki naakaamiyon se jaayez bahut si mudaakhalaton ne darasal nataayij ko badtar banaya." },
    },
  ],
};
