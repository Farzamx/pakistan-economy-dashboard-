import type { Lesson } from "@/lib/academy/types";

export const banksAndCreditBasicsLesson: Lesson = {
  slug: "banks-and-credit-basics",
  category: "beginner",
  title: { en: "Banks and Credit: How Borrowing Works", ur: "بینک اور قرضہ: قرض لینا کیسے کام کرتا ہے", rm: "Bank aur Qarza: Qarz lena kaise kaam karta hai" },
  subtitle: {
    en: "What banks do, how credit is created, and why interest rates matter for your daily life",
    ur: "بینک کیا کرتے ہیں، قرضہ کیسے بنایا جاتا ہے، اور سود کی شرح آپ کی روزمرہ زندگی کے لیے کیوں اہم ہے",
    rm: "Bank kya karte hain, qarza kaise banaya jaata hai, aur sood ki shar aapki roz-marra zindagi ke liye kyun ahem hai",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["policy-rate"],
  relatedLessonSlugs: ["interest-rates-basics", "money-and-currency", "fiscal-vs-monetary"],
  content: {
    overview: {
      en: "Banks are financial intermediaries — they take deposits from savers and lend to borrowers, charging higher interest on loans than they pay on deposits. This spread is how banks profit. The banking system also creates money through lending: when a bank lends Rs100, that Rs100 gets deposited elsewhere and lent again — this chain is the money multiplier. In Pakistan, the banking sector is dominated by 5 large banks (Habib Bank, MCB, Allied Bank, UBL, NBP) and credit availability depends heavily on the SBP's policy rate.",
      ur: "بینک مالی درمیانی ادارے ہیں — وہ بچت کرنے والوں سے ڈپازٹ لیتے ہیں اور قرض لینے والوں کو قرض دیتے ہیں، قرضوں پر ڈپازٹ کے مقابلے میں زیادہ سود لیتے ہیں۔ یہ فرق بینکوں کا منافع ہے۔ بینکنگ سسٹم قرض دینے کے ذریعے پیسہ بھی بناتا ہے۔",
      rm: "Bank maali darmiyan-i idaare hain — woh bachat karne walon se deposit lete hain aur qarz lene walon ko qarz dete hain, qarzon par deposit ke muqaable mein zyada sood lete hain. Yeh faraq bankon ka munaafa hai. Banking system qarz dene ke zariye paisa bhi banata hai.",
    },
    whyItMatters: {
      en: "Without banks, a small business owner couldn't borrow to buy equipment, a young family couldn't get a mortgage, a farmer couldn't buy seeds on credit. Credit is the lubricant of a modern economy. When banks tighten credit (raising rates, stricter requirements), economic activity slows. When credit is cheap and freely available, investment and spending expand. Pakistan's high policy rate (22% peak in 2023) made credit so expensive that private sector borrowing collapsed — contributing to the economic slowdown of 2022-24.",
      ur: "بینکوں کے بغیر، ایک چھوٹا کاروباری مالک سامان خریدنے کے لیے قرض نہیں لے سکتا تھا۔ قرضہ ایک جدید معیشت کا چکناہٹ ہے۔ جب بینک قرضہ سخت کرتے ہیں (شرحیں بڑھاتے ہیں)، معاشی سرگرمی سست ہو جاتی ہے۔ پاکستان کی اعلی پالیسی شرح (2023 میں 22٪ عروج) نے قرضہ اتنا مہنگا بنا دیا کہ نجی شعبے کی قرض لینا گر گئی۔",
      rm: "Bankon ke baghair, ek chhota kaarobaari maalik saamaan khareedne ke liye qarz nahin le sakta tha. Qarza ek jadeed muaashat ka chiknahat hai. Jab bank qarza sakht karte hain (sharhein barhate hain), muaashi sargarmi sust ho jaati hai. Pakistan ki aali policy shar (2023 mein 22% uroj) ne qarza itna mahanga bana diya ke niji shube ki qarz lena gir gayi.",
    },
    explanation: {
      en: `**What banks actually do:**

**Deposit-taking:** Banks accept deposits in current accounts (no interest), savings accounts (low interest), and fixed deposits/term deposits (higher interest for locking money in). In Pakistan, Islamic banks offer profit-sharing accounts (Murabaha, Musharaka) instead of interest.

**Lending:** Banks lend the pooled deposits to borrowers — mortgages, business loans, consumer loans, car financing. The interest rate on loans minus the rate paid on deposits = net interest margin (the bank's profit before costs).

**Fractional reserve banking:** Banks keep only a fraction of deposits as reserve (SBP's cash reserve requirement), lending out the rest. This is why a system-wide bank run is so dangerous — banks cannot return all deposits simultaneously.

**How banks create money:** Bank A lends Rs100 → borrower deposits it at Bank B → Bank B lends Rs90 → deposited at Bank C → and so on. The total money in the system multiplies beyond the original Rs100. This is the money multiplier.

**The credit cycle:** When SBP cuts rates, borrowing becomes cheaper → more investment and spending → economic growth. When SBP raises rates, borrowing becomes expensive → less investment → economic slowdown. This transmission mechanism is how monetary policy works.`,
      ur: `**بینک اصل میں کیا کرتے ہیں:**

**ڈپازٹ لینا:** بینک جاری کھاتوں (کوئی سود نہیں)، بچت کھاتوں (کم سود) اور مقررہ ڈپازٹ (زیادہ سود) میں ڈپازٹ قبول کرتے ہیں۔

**قرض دینا:** بینک جمع ڈپازٹ قرض لینے والوں کو قرض دیتے ہیں — مارگیج، کاروباری قرضے۔ قرضوں پر سود کی شرح منہا ڈپازٹ پر ادا کی گئی شرح = خالص سود مارجن۔

**کسری ریزرو بینکنگ:** بینک صرف ذخائر کا ایک حصہ رکھتے ہیں، باقی قرض دیتے ہیں۔

**بینک کیسے پیسہ بناتے ہیں:** بینک A Rs100 قرض دیتا ہے → قرض لینے والا بینک B میں جمع کرتا ہے → بینک B Rs90 قرض دیتا ہے → اور اسی طرح۔ یہ منی ملٹی پلائر ہے۔`,
      rm: `**Bank asal mein kya karte hain:**

**Deposit lena:** Bank jaari khaatoN (koi sood nahin), bachat khaatoN (kam sood) aur muqarrar deposit (zyada sood) mein deposit qabool karte hain.

**Qarz dena:** Bank jamaa deposit qarz lene walon ko qarz dete hain — mortgage, kaarobaari qarzay. Qarzon par sood ki shar minus deposit par ada ki gayi shar = khaalis sood margin.

**Kasri reserve banking:** Bank sirf zaKhaair ka ek hissa rakhte hain, baaki qarz dete hain.

**Bank kaise paisa banate hain:** Bank A Rs100 qarz deta hai → qarz lene wala Bank B mein jamaa karta hai → Bank B Rs90 qarz deta hai → aur isi tarah. Yeh money multiplier hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Banks lend out the deposits people put in.** Mostly true but incomplete — banks create new deposits when they lend. A bank doesn't need to wait for a new depositor before making a loan. Money is partially created by lending, not just stored and re-lent.

**Myth 2: Islamic banking charges no interest at all.** Islamic banking avoids riba (usury) but still charges a profit equivalent. In Murabaha financing, the bank buys the asset and sells it at a marked-up price. The economic substance is similar to interest; the structure differs.

**Myth 3: Higher interest rates always slow the economy.** Higher rates hurt borrowers (businesses, homebuyers) but benefit depositors and savers. If a large share of the population saves rather than borrows, rate increases may have mixed effects.`,
      ur: `**غلط فہمی 1: بینک لوگوں کے رکھے ہوئے ڈپازٹ قرض دیتے ہیں۔** زیادہ تر سچ ہے لیکن نامکمل — بینک قرض دیتے وقت نئے ڈپازٹ بناتے ہیں۔

**غلط فہمی 2: اسلامی بینکنگ کوئی سود نہیں لیتی۔** اسلامی بینکنگ سود سے بچتی ہے لیکن پھر بھی منافع کے مساوی وصول کرتی ہے۔ مرابحہ میں، بینک اثاثہ خریدتا اور اضافی قیمت پر بیچتا ہے۔

**غلط فہمی 3: اعلی سود کی شرح ہمیشہ معیشت کو سست کرتی ہے۔** اعلی شرحیں قرض لینے والوں کو نقصان دیتی ہیں لیکن بچت کرنے والوں کو فائدہ دیتی ہیں۔`,
      rm: `**Ghalat fehmi 1: Bank logon ke rakhe hue deposit qarz dete hain.** Zyada tar sach hai lekin naamukammal — bank qarz dete waqt naye deposit banate hain.

**Ghalat fehmi 2: Islami banking koi sood nahin leti.** Islami banking sood se bachti hai lekin phir bhi munaafe ke musawi wasool karti hai. Murabaha mein, bank aasiya khareedta aur izaafi qeemat par bechta hai.

**Ghalat fehmi 3: Aali sood ki shar hamesha muaashat ko sust karti hai.** Aali sharhein qarz lene walon ko nuqsaan deti hain lekin bachat karne walon ko faayda deti hain.`,
    },
    pakistanExample: {
      en: `**Pakistan's credit market reality:** In FY2023, the SBP raised the policy rate to 22% to fight 38% inflation. The result: banks stopped lending to the private sector and instead piled into government T-bills (yielding 21-22%) — zero credit risk, high return. Private sector credit growth went negative. Small businesses and households, unable to afford 25-30% loan rates, couldn't borrow for investment. This "crowding out" of private credit by government borrowing is a chronic problem in Pakistan's banking system.`,
      ur: `**پاکستان کے قرضہ بازار کی حقیقت:** FY2023 میں، SBP نے 38٪ افراط زر سے لڑنے کے لیے پالیسی شرح 22٪ تک بڑھائی۔ نتیجہ: بینکوں نے نجی شعبے کو قرض دینا بند کر دیا اور سرکاری T-bills (21-22٪ منافع) میں سرمایہ لگا دیا۔ نجی شعبے کی قرض نمو منفی ہو گئی۔ چھوٹے کاروبار اور گھرانے، 25-30٪ قرض کی شرحیں برداشت کرنے سے قاصر، سرمایہ کاری کے لیے قرض نہیں لے سکے۔`,
      rm: `**Pakistan ke qarza baazaar ki haqeeqat:** FY2023 mein, SBP ne 38% afrat-e-zer se larne ke liye policy shar 22% tak barhaai. Nateeja: bankon ne niji shube ko qarz dena band kar diya aur sarkari T-bills (21-22% munaafa) mein sarmaaya laga diya. Niji shube ki qarz numa manfi ho gayi. Chhote kaarobaar aur ghraane, 25-30% qarz ki sharhein bardaasht karne se qaasir, sarmaaya kaari ke liye qarz nahin le sake.`,
    },
    realWorld: {
      en: "The 2008 Global Financial Crisis showed what happens when bank credit expansion gets too risky. US banks issued mortgages to borrowers who couldn't repay (subprime loans), packaged them into complex securities, and sold them globally. When house prices fell, millions defaulted, banks collapsed (Lehman Brothers), and credit froze globally — triggering a worldwide recession. The lesson: banks need regulation (capital requirements, stress tests) because their failure harms the entire economy, not just shareholders.",
      ur: "2008 کے عالمی مالی بحران نے دکھایا کہ جب بینک کریڈٹ توسیع بہت خطرناک ہو جاتی ہے تو کیا ہوتا ہے۔ امریکی بینکوں نے ایسے قرض لینے والوں کو مارگیج جاری کیے جو ادائیگی نہیں کر سکتے تھے، انہیں پیچیدہ سیکیورٹیز میں پیک کیا۔ جب مکانوں کی قیمتیں گریں، لاکھوں نے ڈیفالٹ کیا، بینک گرے اور کریڈٹ عالمی سطح پر جم گیا — عالمی کساد بازاری کا باعث بنا۔",
      rm: "2008 ke aalami maali bohran ne dikhaya ke jab bank credit tausee bahut khatarnaak ho jaati hai to kya hota hai. Amreeki bankon ne aise qarz lene walon ko mortgage jaari kiye jo adaayigi nahin kar sakte the, unhen peechida securities mein pack kiya. Jab makaanon ki qeematen girin, laakhon ne default kiya, bank gire aur credit aalami satah par jam gaya — aalami kasaad-baazaari ka baais bana.",
    },
    summary: {
      en: "• Banks: take deposits, lend to borrowers, earn interest margin (spread)\n• Fractional reserve banking: banks lend most deposits, keep small reserve\n• Money creation: lending multiplies money in the system (money multiplier)\n• Policy rate: SBP rate sets the floor for all borrowing costs in Pakistan\n• Pakistan's credit problem: government crowding out private sector via T-bills\n• Islamic banking: profit-sharing structure (Murabaha) instead of interest — economically similar",
      ur: "• بینک: ڈپازٹ لیتے ہیں، قرض لینے والوں کو قرض دیتے ہیں، سود مارجن کماتے ہیں\n• کسری ریزرو بینکنگ: بینک زیادہ تر ڈپازٹ قرض دیتے ہیں، چھوٹا ریزرو رکھتے ہیں\n• پیسہ بنانا: قرض دینا نظام میں پیسہ بڑھاتا ہے\n• پالیسی شرح: SBP شرح پاکستان میں تمام قرض لاگت کی بنیاد مقرر کرتی ہے\n• پاکستان کا قرضہ مسئلہ: T-bills کے ذریعے نجی شعبے کو حاشیہ پر ڈالنا\n• اسلامی بینکنگ: سود کی بجائے منافع شراکت داری ڈھانچہ",
      rm: "• Bank: deposit lete hain, qarz lene walon ko qarz dete hain, sood margin kamaate hain\n• Kasri reserve banking: bank zyada tar deposit qarz dete hain, chhota reserve rakhte hain\n• Paisa banana: qarz dena nizam mein paisa barhata hai\n• Policy shar: SBP shar Pakistan mein tamam qarz lagat ki bunyaad muqarrar karti hai\n• Pakistan ka qarza masla: T-bills ke zariye niji shube ko haashiye par daalna\n• Islami banking: sood ki bajaaye munaafa sharaakat daari dhaancha",
    },
  },
  quiz: [
    {
      question: { en: "When the SBP raised its policy rate to 22% in 2023, what happened to private sector borrowing?", ur: "جب SBP نے 2023 میں اپنی پالیسی شرح 22٪ تک بڑھائی، نجی شعبے کی قرض لینے پر کیا اثر ہوا؟", rm: "Jab SBP ne 2023 mein apni policy shar 22% tak barhaai, niji shube ki qarz lene par kya asar hua?" },
      options: [
        { en: "Private borrowing surged as businesses rushed to borrow before rates rose further", ur: "نجی قرض لینا بڑھ گیا کیونکہ کاروبار مزید اضافے سے پہلے قرض لینے کے لیے جلدی کی", rm: "Niji qarz lena barh gaya kyunke kaarobaar mazeed izaafe se pehle qarz lene ke liye jaldi ki" },
        { en: "Private sector credit growth went negative — too expensive to borrow", ur: "نجی شعبے کی قرض نمو منفی ہو گئی — قرض لینا بہت مہنگا ہو گیا", rm: "Niji shube ki qarz numa manfi ho gayi — qarz lena bahut mahanga ho gaya" },
        { en: "Nothing changed — businesses ignored the rate hike", ur: "کچھ نہیں بدلا — کاروباروں نے شرح اضافے کو نظرانداز کیا", rm: "Kuch nahin badla — kaarobaaron ne shar izaafe ko nazarandaaz kiya" },
        { en: "Banks started lending more to compensate for the lost deposit income", ur: "بینکوں نے کھوئی ہوئی ڈپازٹ آمدنی کی تلافی کے لیے مزید قرض دینا شروع کیا", rm: "Bankon ne khoi hui deposit aamdani ki talaafi ke liye mazeed qarz dena shuroo kiya" },
      ],
      correctIndex: 1,
      explanation: { en: "At 22% policy rate, loans to businesses cost 25-30%. Most investment projects can't earn enough to justify that cost. Banks shifted to risk-free government T-bills instead, causing private sector credit growth to turn negative.", ur: "22٪ پالیسی شرح پر، کاروباروں کے قرضوں کی لاگت 25-30٪ ہے۔ زیادہ تر سرمایہ کاری منصوبے اس لاگت کو جواز دینے کے لیے کافی نہیں کما سکتے۔ بینکوں نے خطرہ سے پاک سرکاری T-bills کی طرف رخ کیا، جس سے نجی شعبے کی قرض نمو منفی ہو گئی۔", rm: "22% policy shar par, kaarobaaron ke qarzon ki lagat 25-30% hai. Zyada tar sarmaaya kaari mansube is lagat ko jawaaz dene ke liye kaafi nahin kama sakte. Bankon ne khatare se paak sarkari T-bills ki taraf rukh kiya, jis se niji shube ki qarz numa manfi ho gayi." },
    },
    {
      question: { en: "What is the 'money multiplier' in banking?", ur: "بینکنگ میں 'منی ملٹی پلائر' کیا ہے؟", rm: "Banking mein 'money multiplier' kya hai?" },
      options: [
        { en: "The profit banks make on each rupee deposited", ur: "ہر جمع روپے پر بینکوں کا منافع", rm: "Har jamaa rupay par bankon ka munaafa" },
        { en: "The process by which lending creates new deposits, multiplying total money in the system", ur: "وہ عمل جس کے ذریعے قرض دینا نئے ڈپازٹ بناتا ہے، نظام میں کل پیسہ بڑھاتا ہے", rm: "Woh amal jis ke zariye qarz dena naye deposit banata hai, nizam mein kul paisa barhata hai" },
        { en: "The number of times a bank can lend the same money", ur: "جتنی بار بینک ایک ہی پیسہ قرض دے سکتا ہے", rm: "Jitni baar bank ek hi paisa qarz de sakta hai" },
        { en: "Interest rates multiplied by loan amounts", ur: "سود کی شرحیں قرض کی رقم سے ضرب", rm: "Sood ki sharhein qarz ki raqam se zarb" },
      ],
      correctIndex: 1,
      explanation: { en: "When a bank lends Rs100, the borrower spends it, it's deposited at another bank, that bank lends Rs90, and so on. The total money circulating in the system becomes much larger than the original Rs100. This is money creation through lending.", ur: "جب بینک Rs100 قرض دیتا ہے، قرض لینے والا خرچ کرتا ہے، دوسرے بینک میں جمع ہوتا ہے، وہ بینک Rs90 قرض دیتا ہے، اور اسی طرح۔ نظام میں گردش کرنے والا کل پیسہ اصل Rs100 سے بہت زیادہ ہو جاتا ہے۔", rm: "Jab bank Rs100 qarz deta hai, qarz lene wala kharch karta hai, doosre bank mein jamaa hota hai, woh bank Rs90 qarz deta hai, aur isi tarah. Nizam mein gardish karne wala kul paisa asl Rs100 se bahut zyada ho jaata hai." },
    },
    {
      question: { en: "How does Islamic banking in Pakistan handle 'interest'?", ur: "پاکستان میں اسلامی بینکنگ 'سود' کو کیسے سنبھالتی ہے؟", rm: "Pakistan mein Islami banking 'sood' ko kaise sambhalti hai?" },
      options: [
        { en: "Islamic banks charge zero and make no profit", ur: "اسلامی بینک صفر وصول کرتے ہیں اور کوئی منافع نہیں کماتے", rm: "Islami bank sifar wasool karte hain aur koi munaafa nahin kamaate" },
        { en: "Islamic banks use profit-sharing structures (like Murabaha) that achieve similar economics without charging riba", ur: "اسلامی بینک منافع شراکت داری ڈھانچے (جیسے مرابحہ) استعمال کرتے ہیں جو ربا لگائے بغیر ملتی جلتی معاشیات حاصل کرتے ہیں", rm: "Islami bank munaafa sharaakat daari dhaanche (jaise Murabaha) istemal karte hain jo riba lagaye baghair milti julti muaashiyaat haasil karte hain" },
        { en: "Islamic banks only lend for religious purposes", ur: "اسلامی بینک صرف مذہبی مقاصد کے لیے قرض دیتے ہیں", rm: "Islami bank sirf mazhabi maqaasid ke liye qarz dete hain" },
        { en: "Islamic banks are exempt from SBP regulation", ur: "اسلامی بینک SBP ضابطے سے مستثنیٰ ہیں", rm: "Islami bank SBP zaabite se mustasna hain" },
      ],
      correctIndex: 1,
      explanation: { en: "In Murabaha, the bank buys an asset (e.g., a car) and sells it to the customer at a disclosed markup. The customer pays in instalments. The economic effect is similar to an interest-bearing loan, but the transaction structure avoids riba.", ur: "مرابحہ میں، بینک ایک اثاثہ (مثلاً گاڑی) خریدتا ہے اور اسے گاہک کو ظاہر کردہ مارک اپ پر بیچتا ہے۔ گاہک قسطوں میں ادائیگی کرتا ہے۔ معاشی اثر سود والے قرض کی طرح ہے، لیکن لین دین کا ڈھانچہ ربا سے بچتا ہے۔", rm: "Murabaha mein, bank ek aasiya (maslan gaari) khareedta hai aur ise gaahaak ko zaahir-karda mark-up par bechta hai. Gaahaak qiston mein adaayigi karta hai. Muaashi asar sood waale qarz ki tarah hai, lekin len-den ka dhaancha riba se bachta hai." },
    },
    {
      question: { en: "What does 'fractional reserve banking' mean?", ur: "'کسری ریزرو بینکنگ' کا کیا مطلب ہے؟", rm: "'Kasri reserve banking' ka kya matlab hai?" },
      options: [
        { en: "Banks keep 100% of deposits in their vault", ur: "بینک اپنی تجوری میں 100٪ ڈپازٹ رکھتے ہیں", rm: "Bank apni tijori mein 100% deposit rakhte hain" },
        { en: "Banks invest all deposits in the stock market", ur: "بینک تمام ڈپازٹ سٹاک مارکیٹ میں لگاتے ہیں", rm: "Bank tamam deposit stock market mein lagate hain" },
        { en: "Banks keep only a fraction of deposits as reserve and lend out the rest", ur: "بینک صرف ڈپازٹ کا ایک حصہ ریزرو کے طور پر رکھتے ہیں اور باقی قرض دیتے ہیں", rm: "Bank sirf deposit ka ek hissa reserve ke tor par rakhte hain aur baaki qarz dete hain" },
        { en: "Banks must earn fractional profits to remain solvent", ur: "بینکوں کو ملکیت قابل رہنے کے لیے جزوی منافع کمانا ہوگا", rm: "Bankon ko malikiyat qaabil rehne ke liye juz'wi munaafa kamana hoga" },
      ],
      correctIndex: 2,
      explanation: { en: "The SBP mandates a cash reserve requirement (CRR) — currently ~5% of deposits. Banks lend the remaining ~95%, which is how credit gets created and the money supply expands. This also makes banks vulnerable to bank runs.", ur: "SBP نقد ریزرو ضرورت (CRR) لازم کرتا ہے — فی الحال ڈپازٹ کا ~5٪۔ بینک باقی ~95٪ قرض دیتے ہیں، جس طرح قرضہ بنایا جاتا ہے اور رقم کی فراہمی بڑھتی ہے۔ یہ بینکوں کو بینک رن کے خطرے سے دوچار بھی کرتا ہے۔", rm: "SBP naqad reserve zaroorat (CRR) laazim karta hai — filhaal deposit ka ~5%. Bank baaki ~95% qarz dete hain, jis tarah qarza banaya jaata hai aur raqam ki faraahami barhti hai. Yeh bankon ko bank run ke khatre se dochar bhi karta hai." },
    },
  ],
  faq: [
    {
      question: { en: "Is keeping money in a Pakistan bank safe?", ur: "پاکستان کے بینک میں پیسہ رکھنا محفوظ ہے؟", rm: "Pakistan ke bank mein paisa rakhna mehfooz hai?" },
      answer: { en: "Pakistani banks are regulated by the SBP and generally sound — major banks (HBL, MCB, UBL, NBP, ABL) are well-capitalised. Bank deposits up to Rs500,000 per depositor are insured by the Deposit Protection Corporation (DPC), a government-backed entity. Risks exist but a complete bank failure where depositors lose money has not occurred in Pakistan's recent history. The main risk for depositors is inflation eroding the purchasing power of their savings when deposit rates are lower than inflation.", ur: "پاکستانی بینک SBP کے ذریعے ریگولیٹ ہیں اور عموماً درست ہیں۔ ڈپازٹ پروٹیکشن کارپوریشن (DPC) کے ذریعے فی ڈپازٹر Rs500,000 تک بینک ڈپازٹ کا بیمہ ہے۔ مرکزی خطرہ افراط زر سے ہے جو بچتوں کی قوت خرید کو ختم کرتا ہے۔", rm: "Pakistani bank SBP ke zariye regulate hain aur umuman durust hain. Deposit Protection Corporation (DPC) ke zariye fi depositor Rs500,000 tak bank deposit ka beema hai. Markazi khatara afrat-e-zer se hai jo bachton ki quwwat-e-khireed ko khatam karta hai." },
    },
    {
      question: { en: "Why do banks give low interest on savings but charge high rates on loans?", ur: "بینک بچت پر کم سود کیوں دیتے ہیں لیکن قرضوں پر اعلی شرحیں کیوں لیتے ہیں؟", rm: "Bank bachat par kam sood kyun dete hain lekin qarzon par aali sharhein kyun lete hain?" },
      answer: { en: "This spread (difference) is the bank's profit — it covers operating costs, staff salaries, branch networks, loan defaults, and shareholder returns. In Pakistan, this spread is typically 5-8 percentage points. The size of the spread reflects how competitive the banking sector is — in more competitive markets, banks compete for deposits by offering better rates and on loans by charging less. Pakistan's banking sector (dominated by 5 large banks) is less competitive than some, keeping spreads wide.", ur: "یہ فرق بینک کا منافع ہے — یہ آپریٹنگ لاگت، عملے کی تنخواہیں، برانچ نیٹ ورک، قرض ڈیفالٹ، اور حصہ دار منافع کو پورا کرتا ہے۔ پاکستان میں، یہ فرق عام طور پر 5-8 فیصد پوائنٹ ہے۔", rm: "Yeh faraq bank ka munaafa hai — yeh operating lagat, amle ki tankhaahein, branch network, qarz default, aur hissadaar munaafe ko poora karta hai. Pakistan mein, yeh faraq umuman 5-8 fisad point hai." },
    },
  ],
};
