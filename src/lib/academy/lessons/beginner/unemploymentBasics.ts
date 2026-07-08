import type { Lesson } from "@/lib/academy/types";

export const unemploymentBasicsLesson: Lesson = {
  slug: "unemployment-basics",
  category: "beginner",
  title: { en: "Unemployment: Types and Causes", ur: "بیروزگاری: اقسام اور وجوہات", rm: "Berozgaari: Iqsaam aur Wajohaat" },
  subtitle: {
    en: "Why unemployment exists even in healthy economies, and why Pakistan's rate understates the real problem",
    ur: "صحت مند معیشتوں میں بھی بیروزگاری کیوں ہوتی ہے، اور پاکستان کی شرح اصل مسئلے کو کم کیوں دکھاتی ہے",
    rm: "Sehatmand muaashaton mein bhi berozgaari kyun hoti hai, aur Pakistan ki shar asl maslay ko kam kyun dikhati hai",
  },
  level: "beginner",
  readMinutes: 7,
  isPremium: false,
  relatedIndicatorSlugs: ["unemployment-rate-pakistan"],
  relatedLessonSlugs: ["economic-cycles", "gdp", "economic-growth-basics"],
  content: {
    overview: {
      en: "Unemployment is the share of people who want work, are available to work, but can't find it. It's never zero in any real economy — some unemployment is natural and even healthy. But high or persistent unemployment wastes human potential, fuels poverty, and stresses social systems. Pakistan's official unemployment rate (~6%) dramatically understates the true problem due to hidden unemployment and informal work.",
      ur: "بیروزگاری ان لوگوں کا حصہ ہے جو کام چاہتے ہیں، کام کرنے کے لیے دستیاب ہیں، لیکن نہیں مل رہا۔ یہ کسی بھی حقیقی معیشت میں کبھی صفر نہیں ہوتی۔ پاکستان کی سرکاری بیروزگاری کی شرح (~6%) چھپی بیروزگاری کی وجہ سے اصل مسئلے کو بہت کم دکھاتی ہے۔",
      rm: "Berozgaari un logon ka hissa hai jo kaam chahte hain, kaam karne ke liye dastyaab hain, lekin nahi mil raha. Yeh kisi bhi haqeeqi muaashat mein kabhi sifar nahi hoti. Pakistan ki sarkaari berozgaari ki shar (~6%) chhipi berozgaari ki wajah se asl maslay ko bahut kam dikhati hai.",
    },
    whyItMatters: {
      en: "Every percentage point of unemployment in Pakistan represents hundreds of thousands of people without income. Beyond the personal tragedy, high unemployment reduces consumer spending, lowers tax revenues, and increases pressure on social safety nets. The inverse — very low unemployment — can cause wage inflation. Getting unemployment 'right' is one of the central goals of economic policy.",
      ur: "پاکستان میں بیروزگاری کا ہر فیصد لاکھوں لوگوں کو بغیر آمدنی کے نمائندگی کرتا ہے۔ زیادہ بیروزگاری صارف اخراجات کم کرتی ہے، ٹیکس محصولات کم کرتی ہے۔",
      rm: "Pakistan mein berozgaari ka har feesad laakhon logon ko baghair aamdani ke numaindagi karta hai. Zyada berozgaari sarfeen ikhraajahat kam karti hai, tax mahsulaaat kam karti hai.",
    },
    explanation: {
      en: `**Types of unemployment:**

1. **Frictional:** Temporary joblessness while people move between jobs. A fresh graduate searching for their first job is frictionally unemployed. This is normal and unavoidable — it takes time to match people with positions.

2. **Structural:** When workers' skills don't match available jobs. Factory automation displaces manual workers; the economy shifts from manufacturing to services. Retraining takes time and money. Pakistan faces structural unemployment as the economy modernises.

3. **Cyclical:** Unemployment caused by economic downturns. When recession hits, companies cut workers. This was severe in Pakistan during FY2020 (COVID) and FY2023 (economic contraction).

4. **Seasonal:** Work that exists only at certain times of year. Agricultural labourers in Pakistan's Punjab are employed during harvest, unemployed the rest of the year.

**The 'natural rate':** Some frictional + structural unemployment always exists even in healthy economies. Economists call this the 'natural rate' (NAIRU). Pakistan's natural rate is estimated at 4-5%. Trying to push unemployment below this causes wage inflation.`,
      ur: `**بیروزگاری کی اقسام:**

1. **رگڑی بیروزگاری:** نوکریاں بدلتے وقت عارضی بیروزگاری۔ یہ معمول اور ناگزیر ہے۔

2. **ساختی بیروزگاری:** جب کارکنوں کی مہارتیں دستیاب ملازمتوں سے میل نہ کھائیں۔ پاکستان کو یہ مسئلہ درپیش ہے۔

3. **چکری بیروزگاری:** اقتصادی مندی کی وجہ سے بیروزگاری۔ جب کساد آتا ہے، کمپنیاں کارکنوں کو نکالتی ہیں۔

4. **موسمی بیروزگاری:** کام جو صرف مخصوص وقت میں موجود ہو۔ پاکستان میں زرعی مزدور فصل کاٹنے کے وقت ملازم ہوتے ہیں۔`,
      rm: `**Berozgaari ki iqsaam:**

1. **Ragri berozgaari:** Naukriyan badalte waqt aarizzi berozgaari. Yeh mamool aur naaguzeer hai.

2. **Saakhti berozgaari:** Jab kaarkinon ki mahaaraten dastyaab mulazimaton se mel na khayin. Pakistan ko yeh masla darpeesh hai.

3. **Chakkri berozgaari:** Iqtisadi mandi ki wajah se berozgaari. Jab kasaad aata hai, kampaniyaan kaarkinon ko nikaalti hain.

4. **Mausami berozgaari:** Kaam jo sirf makhsoos waqt mein maujood ho. Pakistan mein zaraayi mazdoor fasal kaatne ke waqt mulaazim hote hain.`,
    },
    misconceptions: {
      en: `**Myth 1: 0% unemployment would be ideal.** Extremely low unemployment causes labour shortages, wage inflation, and production bottlenecks. The goal is the 'natural rate' — frictional and structural unemployment only.

**Myth 2: Pakistan's 6% unemployment rate tells the full story.** Pakistan has massive underemployment — people working part-time who want full-time work, or educated graduates doing low-skill jobs. The real 'labour underutilisation' rate is far higher than 6%.

**Myth 3: Women not working are unemployed.** Unemployment statistics count people actively seeking jobs. Many Pakistani women are outside the labour force by circumstance or choice — they are neither employed nor unemployed in the technical sense. Pakistan's low female labour force participation (around 25%) is a separate structural challenge.`,
      ur: `**غلط فہمی 1: 0% بیروزگاری مثالی ہوگی۔** انتہائی کم بیروزگاری مزدوری کی کمی اور اجرت میں مہنگائی کا باعث بنتی ہے۔

**غلط فہمی 2: پاکستان کی 6% بیروزگاری پوری کہانی بتاتی ہے۔** پاکستان میں بہت زیادہ پوشیدہ بیروزگاری ہے — پارٹ ٹائم کام کرنے والے جو فل ٹائم چاہتے ہیں۔

**غلط فہمی 3: کام نہ کرنے والی خواتین بیروزگار ہیں۔** بیروزگاری کے اعداد و شمار صرف فعال طور پر نوکری ڈھونڈنے والوں کو گنتے ہیں۔`,
      rm: `**Ghalat fehmi 1: 0% berozgaari misaali hogi.** Intihaai kam berozgaari mazdoori ki kami aur ujrat mein mahangaai ka baais banti hai.

**Ghalat fehmi 2: Pakistan ki 6% berozgaari poori kahaani batati hai.** Pakistan mein bahut zyada poshida berozgaari hai — part time kaam karne wale jo full time chahte hain.

**Ghalat fehmi 3: Kaam na karne wali khawaateen berozgaar hain.** Berozgaari ke aadaad-o-shumaar sirf faaal tor par naukri dhoondhne walon ko ginte hain.`,
    },
    pakistanExample: {
      en: `**Pakistan's youth unemployment:** While the official unemployment rate is ~6%, youth unemployment (15-24 age group) is estimated at 8-11%. More worrying is the NEET rate — youth Not in Education, Employment, or Training — which is extremely high among young women in rural Pakistan. Pakistan adds roughly 3 million new workers to the labour force each year but creates fewer formal jobs. This 'youth bulge' pressure is one of Pakistan's most critical long-term economic challenges.`,
      ur: `**پاکستان کی نوجوان بیروزگاری:** سرکاری بیروزگاری کی شرح ~6% ہے، جبکہ نوجوانوں کی بیروزگاری 8-11% ہے۔ زیادہ تشویشناک NEET شرح ہے — نہ تعلیم میں، نہ ملازمت میں، نہ تربیت میں۔ پاکستان ہر سال ~30 لاکھ نئے کارکن شامل کرتا ہے لیکن اتنی رسمی ملازمتیں نہیں بناتا۔`,
      rm: `**Pakistan ki naujawaan berozgaari:** Sarkaari berozgaari ki shar ~6% hai, jabke naujawanon ki berozgaari 8-11% hai. Zyada tashweeshnaak NEET shar hai — nah taaleem mein, nah mulazmat mein, nah tarbiyat mein. Pakistan har saal ~30 laakh naye kaarkin shaamil karta hai lekin utni rasmi mulazmatein nahi banata.`,
    },
    realWorld: {
      en: "During the Great Depression (1930s), US unemployment reached 25% — one in four workers had no job. This devastated consumer spending, collapsed banks, and caused a decade-long economic crisis. It showed that high unemployment is self-reinforcing: jobless people can't spend, so businesses lose revenue, lay off more workers, who then can't spend — a downward spiral. This is why governments now use stimulus spending to break such cycles.",
      ur: "عظیم کساد (1930s) کے دوران امریکی بیروزگاری 25% تک پہنچی — ہر چار میں سے ایک کارکن کے پاس کوئی کام نہ تھا۔ یہ ایک دہائی طویل معاشی بحران کا سبب بنا۔",
      rm: "Azeem kasaad (1930s) ke dauraan Amriki berozgaari 25% tak pahunchi — har chaar mein se ek kaarkin ke paas koi kaam na tha. Yeh ek dahaai taweel muaashi bohran ka sabab bana.",
    },
    summary: {
      en: "• 4 types: frictional, structural, cyclical, seasonal\n• Some unemployment is normal — the 'natural rate' of 4-5%\n• Pakistan's 6% official rate masks far higher underemployment\n• Youth unemployment and NEET rates are especially concerning\n• Pakistan adds ~3 million new workers per year — job creation must keep pace\n• High unemployment → less spending → recession → more unemployment (vicious cycle)",
      ur: "• 4 اقسام: رگڑی، ساختی، چکری، موسمی\n• کچھ بیروزگاری معمول ہے — 4-5% کی 'قدرتی شرح'\n• پاکستان کی 6% سرکاری شرح بہت زیادہ پوشیدہ بیروزگاری چھپاتی ہے\n• نوجوانوں کی بیروزگاری اور NEET شرحیں خاص طور پر تشویشناک ہیں\n• پاکستان سالانہ ~30 لاکھ نئے کارکن شامل کرتا ہے — روزگار کی تخلیق کو رفتار برقرار رکھنی چاہیے",
      rm: "• 4 iqsaam: ragri, saakhti, chakkri, mausami\n• Kuch berozgaari mamool hai — 4-5% ki 'qudrati shar'\n• Pakistan ki 6% sarkaari shar bahut zyada poshida berozgaari chhupati hai\n• Naujawanon ki berozgaari aur NEET sharayein khaas tor par tashweeshnaak hain\n• Pakistan saalaana ~30 laakh naye kaarkin shaamil karta hai",
    },
  },
  quiz: [
    {
      question: { en: "A recent graduate spending time searching for her first job is experiencing which type of unemployment?", ur: "ایک حالیہ فارغ التحصیل اپنی پہلی نوکری تلاش کرنے میں وقت گزار رہی ہے۔ وہ کس قسم کی بیروزگاری کا سامنا کر رہی ہے؟", rm: "Ek haaliya faarigh-ut-tahseel apni pehli naukri talaash karne mein waqt guzaar rahi hai. Woh kis qism ki berozgaari ka samna kar rahi hai?" },
      options: [
        { en: "Structural", ur: "ساختی", rm: "Saakhti" },
        { en: "Cyclical", ur: "چکری", rm: "Chakkri" },
        { en: "Frictional", ur: "رگڑی", rm: "Ragri" },
        { en: "Seasonal", ur: "موسمی", rm: "Mausami" },
      ],
      correctIndex: 2,
      explanation: { en: "Frictional unemployment is temporary joblessness while searching for work — it's normal and expected. The graduate has skills but needs time to find the right match.", ur: "رگڑی بیروزگاری کام تلاش کرتے وقت عارضی بیروزگاری ہے — یہ معمول اور متوقع ہے۔", rm: "Ragri berozgaari kaam talaash karte waqt aarizzi berozgaari hai — yeh mamool aur mutawaqqa hai." },
    },
    {
      question: { en: "Pakistan's official unemployment rate is ~6%. Why does this understate the real problem?", ur: "پاکستان کی سرکاری بیروزگاری کی شرح ~6% ہے۔ یہ اصل مسئلے کو کم کیوں دکھاتی ہے؟", rm: "Pakistan ki sarkaari berozgaari ki shar ~6% hai. Yeh asl maslay ko kam kyun dikhati hai?" },
      options: [
        { en: "The data is deliberately falsified", ur: "ڈیٹا جان بوجھ کر جھوٹا ہے", rm: "Data jaanboojhkar jhoota hai" },
        { en: "It excludes underemployed workers and those outside the labour force", ur: "یہ پوشیدہ بیروزگار اور افرادی قوت سے باہر لوگوں کو خارج کرتا ہے", rm: "Yeh poshida berozgaar aur afraadi quwwat se baahar logon ko kharij karta hai" },
        { en: "It counts children in the statistics", ur: "یہ اعداد و شمار میں بچوں کو گنتا ہے", rm: "Yeh aadaad-o-shumaar mein bachon ko ginta hai" },
        { en: "It is the same as most other countries", ur: "یہ زیادہ تر دوسرے ممالک جیسا ہے", rm: "Yeh zyada tar doosre mumaalik jaisa hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Pakistan's official rate misses: (1) underemployed people working part-time or in low-skill jobs, (2) discouraged workers who gave up searching, and (3) women outside the labour force by circumstance.", ur: "پاکستان کی سرکاری شرح چھوٹ جاتی ہے: (1) پوشیدہ بیروزگار، (2) مایوس کارکن جنہوں نے تلاش ترک کی، (3) حالات کی وجہ سے افرادی قوت سے باہر خواتین۔", rm: "Pakistan ki sarkaari shar chhoot jaati hai: (1) poshida berozgaar, (2) maayoos kaarkin jinhon ne talaash tark ki, (3) haalaat ki wajah se afraadi quwwat se baahar khawaateen." },
    },
    {
      question: { en: "What happens to unemployment during an economic recession?", ur: "اقتصادی کساد بازاری کے دوران بیروزگاری پر کیا ہوتا ہے؟", rm: "Iqtisadi kasaad baazaari ke dauraan berozgaari par kya hota hai?" },
      options: [
        { en: "It falls sharply", ur: "یہ تیزی سے گرتی ہے", rm: "Yeh tezi se girti hai" },
        { en: "It rises as businesses cut workers", ur: "کاروباروں کے کارکن کاٹنے سے یہ بڑھتی ہے", rm: "Karobaaron ke kaarkin kaatne se yeh barhti hai" },
        { en: "It stays the same", ur: "یہ وہی رہتی ہے", rm: "Yeh wahi rahti hai" },
        { en: "It becomes zero", ur: "یہ صفر ہو جاتی ہے", rm: "Yeh sifar ho jaati hai" },
      ],
      correctIndex: 1,
      explanation: { en: "In recessions, demand for goods and services falls, so businesses reduce production and lay off workers — causing cyclical unemployment to rise.", ur: "کساد بازاری میں اشیاء اور خدمات کی طلب کم ہوتی ہے، کاروبار پیداوار کم اور کارکن نکالتے ہیں — چکری بیروزگاری بڑھتی ہے۔", rm: "Kasaad baazaari mein cheezain aur khadamaat ki talab kam hoti hai, karobar paidawar kam aur kaarkin nikaalte hain — chakkri berozgaari barhti hai." },
    },
    {
      question: { en: "Why is 0% unemployment considered undesirable by economists?", ur: "ماہرین اقتصادیات 0% بیروزگاری کو ناپسندیدہ کیوں سمجھتے ہیں؟", rm: "Maahireen iqtisadiyaat 0% berozgaari ko naapsandida kyun samajhte hain?" },
      options: [
        { en: "It means everyone is equally poor", ur: "اس کا مطلب ہے سب یکساں غریب ہیں", rm: "Is ka matlab hai sab yaksan ghareeb hain" },
        { en: "It leads to labour shortages and wage inflation", ur: "یہ مزدوری کی کمی اور اجرت میں مہنگائی کا باعث بنتی ہے", rm: "Yeh mazdoori ki kami aur ujrat mein mahangaai ka baais banti hai" },
        { en: "Government cannot collect taxes", ur: "حکومت ٹیکس جمع نہیں کر سکتی", rm: "Hukoomat tax jama nahi kar sakti" },
        { en: "Banks would have to close", ur: "بینک بند کرنے پڑیں گے", rm: "Bank band karne paren ge" },
      ],
      correctIndex: 1,
      explanation: { en: "At 0% unemployment, every worker is employed. Employers must compete intensely for labour by raising wages, which triggers wage-price inflation. Some frictional and structural unemployment is natural and healthy.", ur: "0% بیروزگاری پر ہر کارکن ملازم ہے۔ آجروں کو اجرت بڑھا کر مزدوری کے لیے مقابلہ کرنا پڑتا ہے، جو اجرت-قیمت مہنگائی کا باعث بنتا ہے۔", rm: "0% berozgaari par har kaarkin mulaazim hai. Aajiron ko ujrat barha kar mazdoori ke liye muqaabla karna parta hai, jo ujrat-qeemat mahangaai ka baais banta hai." },
    },
  ],
  faq: [
    {
      question: { en: "How is Pakistan's unemployment rate actually measured?", ur: "پاکستان کی بیروزگاری کی شرح دراصل کیسے ناپی جاتی ہے؟", rm: "Pakistan ki berozgaari ki shar daraasal kaise naapi jaati hai?" },
      answer: { en: "The Pakistan Bureau of Statistics (PBS) conducts the Labour Force Survey (LFS) periodically — interviewing households about employment status. Someone is counted as unemployed if they: (1) don't have a job, (2) were available to work in the reference week, and (3) were actively looking. This definition misses discouraged workers and the underemployed.", ur: "پاکستان بیورو آف اسٹیٹسٹکس (PBS) وقتاً فوقتاً لیبر فورس سروے کرتا ہے۔ کوئی بیروزگار شمار ہوتا ہے اگر: (1) نوکری نہیں، (2) کام کے لیے دستیاب تھا، (3) فعال طور پر تلاش کر رہا تھا۔", rm: "PBS waqtan fawaqtan Labour Force Survey karta hai. Koi berozgaar shumaar hota hai agar: (1) naukri nahi, (2) kaam ke liye dastyaab tha, (3) faaal tor par talaash kar raha tha." },
    },
    {
      question: { en: "What is Pakistan doing to address youth unemployment?", ur: "نوجوانوں کی بیروزگاری سے نمٹنے کے لیے پاکستان کیا کر رہا ہے؟", rm: "Naujawanon ki berozgaari se niptane ke liye Pakistan kya kar raha hai?" },
      answer: { en: "Pakistan has launched various youth employment programs (Prime Minister's Youth Programme, NAVTTC technical training), but the scale remains inadequate relative to the 3 million new entrants per year. The fundamental need is faster GDP growth (5%+), especially in labour-intensive manufacturing and construction, alongside skills development that matches industry needs.", ur: "پاکستان نے مختلف نوجوان روزگار پروگرام شروع کیے ہیں لیکن پیمانہ سالانہ 30 لاکھ نئے داخلین کے مقابلے ناکافی رہتا ہے۔ بنیادی ضرورت تیز تر GDP ترقی ہے، خاص طور پر محنت دہندہ مینوفیکچرنگ میں۔", rm: "Pakistan ne mukhtalif naujawaan rozgaar programme shuru kiye hain lekin paimana saalaana 30 laakh naye daakhilin ke muqaable nakaafi rahta hai. Bunyaadi zaroorat tez tar GDP taraqqi hai." },
    },
  ],
};
