import type { Lesson } from "@/lib/academy/types";

export const compoundInterestLesson: Lesson = {
  slug: "compound-interest",
  category: "beginner",
  title: { en: "Compound Interest: The Eighth Wonder", ur: "مرکب سود: آٹھواں عجوبہ", rm: "Murakkab Sood: Aatthwan Ajooba" },
  subtitle: {
    en: "How money grows exponentially over time — and why starting early changes everything",
    ur: "پیسہ وقت کے ساتھ تیزی سے کیسے بڑھتا ہے — اور جلدی شروع کرنا سب کچھ کیوں بدل دیتا ہے",
    rm: "Paisa waqt ke saath tezi se kaise barhta hai — aur jaldi shuroo karna sab kuch kyun badal deta hai",
  },
  level: "beginner",
  readMinutes: 5,
  isPremium: false,
  relatedIndicatorSlugs: ["policy-rate"],
  relatedLessonSlugs: ["interest-rates-basics", "savings-vs-investment", "banks-and-credit-basics"],
  content: {
    overview: {
      en: "Compound interest is interest calculated on both the principal (original amount) and the accumulated interest from previous periods. Simple interest is only calculated on the principal. The difference seems small at first, but over time, compounding creates exponential growth — Einstein allegedly called it 'the eighth wonder of the world.' For Pakistan's savers, understanding compounding is crucial: at 10% annual return, Rs100,000 becomes Rs1.74 million in 30 years through compounding.",
      ur: "مرکب سود اصل رقم (اصل رقم) اور پچھلی مدتوں کے جمع شدہ سود دونوں پر محسوب سود ہے۔ سادہ سود صرف اصل رقم پر محسوب ہوتا ہے۔ فرق پہلے تھوڑا لگتا ہے، لیکن وقت کے ساتھ، چکراتی لکیری نمو پیدا کرتا ہے۔ 10٪ سالانہ واپسی پر، Rs100,000 مرکب سود کے ذریعے 30 سال میں Rs1.74 ملین بن جاتے ہیں۔",
      rm: "Murakkab sood asl raqam (asl raqam) aur pichli mudaton ke jamaa shuda sood dono par mahsub sood hai. Saada sood sirf asl raqam par mahsub hota hai. Faraq pehle thoda lagta hai, lekin waqt ke saath, chakaraati num paida karta hai. 10% saalaana waapsi par, Rs100,000 murakkab sood ke zariye 30 saal mein Rs1.74 million ban jaate hain.",
    },
    whyItMatters: {
      en: "Pakistan's national savings rate is only ~13-15% of GDP — far too low. Millions of Pakistanis keep savings in cash at home (losing to inflation), in gold (no compound growth), or in low-yield bank accounts. Understanding compounding changes saving behaviour: someone who starts saving Rs5,000/month at age 25 (earning 10%/year compounded) accumulates Rs11 million by retirement at 60. Someone who starts at 35 accumulates only Rs4 million. Fifteen extra years at 10% compounds to nearly 3x more wealth.",
      ur: "پاکستان کی قومی بچت شرح صرف ~13-15٪ GDP ہے — بہت کم۔ لاکھوں پاکستانی گھر میں نقد (افراط زر سے خسارہ)، سونے (کوئی مرکب نمو نہیں) یا کم منافع بینک اکاؤنٹ میں بچت رکھتے ہیں۔ کوئی جو 25 سال کی عمر میں Rs5,000/ماہ بچانا شروع کرتا ہے (10٪/سال مرکب) 60 پر ریٹائرمنٹ تک Rs11 ملین جمع کرتا ہے۔ 35 سال کی عمر پر شروع کرنے والا صرف Rs4 ملین جمع کرتا ہے۔",
      rm: "Pakistan ki qoomi bachat shar sirf ~13-15% GDP hai — bahut kam. Laakhon Pakistani ghar mein naqad (afrat-e-zer se khasaara), sone (koi murakkab numa nahin) ya kam munaafa bank account mein bachat rakhte hain. Koi jo 25 saal ki umar mein Rs5,000/maah bachana shuroo karta hai (10%/saal murakkab) 60 par retirement tak Rs11 million jamaa karta hai. 35 saal ki umar par shuroo karne wala sirf Rs4 million jamaa karta hai.",
    },
    explanation: {
      en: `**Simple interest vs compound interest:**

**Simple interest:** Interest earned each period is based only on the original principal.
- Rs100,000 at 10% simple interest for 10 years → earn Rs10,000 each year → Rs200,000 total

**Compound interest:** Interest earned each period is added to the principal, and next period's interest is calculated on the new larger balance.
- Rs100,000 at 10% compound interest for 10 years → Rs259,374 total

The gap widens dramatically over longer periods:
- 20 years compound: Rs672,750 (vs Rs300,000 simple)
- 30 years compound: Rs1,744,940 (vs Rs400,000 simple)

**The Rule of 72:** A quick way to estimate doubling time. Divide 72 by the interest rate to get years to double.
- 8% interest → 72/8 = 9 years to double
- 12% interest → 72/12 = 6 years to double
- Pakistan's current 15% savings rate → 72/15 = ~4.8 years to double

**Compounding frequency matters:** Annual compounding, monthly compounding, daily compounding — the more frequently interest compounds, the faster money grows. A 12% annual rate compounded monthly gives slightly more than 12% effective annual yield.

**The flip side — debt:** Compound interest also works against borrowers. A Rs500,000 loan at 25% interest (Pakistan consumer loan rates in 2023) where you only pay the minimum grows rapidly through compounding — a debt trap.`,
      ur: `**سادہ سود بنام مرکب سود:**

**سادہ سود:** ہر مدت میں کمایا گیا سود صرف اصل رقم پر مبنی ہے۔
- Rs100,000 پر 10٪ سادہ سود 10 سال کے لیے → ہر سال Rs10,000 کماتے ہیں → کل Rs200,000

**مرکب سود:** ہر مدت میں کمایا گیا سود اصل رقم میں شامل ہوتا ہے، اور اگلی مدت کا سود نئے بڑے بیلنس پر محسوب ہوتا ہے۔
- Rs100,000 پر 10٪ مرکب سود 10 سال کے لیے → کل Rs259,374

**قاعدہ 72:** دوگنا ہونے کا وقت تخمین لگانے کا تیز طریقہ۔ سالوں کو دوگنا کرنے کے لیے 72 کو شرح سود سے تقسیم کریں۔

**قرض کا پہلو:** مرکب سود قرض لینے والوں کے خلاف بھی کام کرتا ہے۔`,
      rm: `**Saada sood ba-naam murakkab sood:**

**Saada sood:** Har muddat mein kamaya gaya sood sirf asl raqam par mabni hai.
- Rs100,000 par 10% saada sood 10 saal ke liye → har saal Rs10,000 kamaate hain → kul Rs200,000

**Murakkab sood:** Har muddat mein kamaya gaya sood asl raqam mein shaamil hota hai, aur agli muddat ka sood naye bare balance par mahsub hota hai.
- Rs100,000 par 10% murakkab sood 10 saal ke liye → kul Rs259,374

**Qaaida 72:** Dugna hone ka waqt takhmeena lagane ka tez tareeqa. Salon ko dugna karne ke liye 72 ko shar-e-sood se taqseem karein.

**Qarz ka pahloo:** Murakkab sood qarz lene walon ke khilaf bhi kaam karta hai.`,
    },
    misconceptions: {
      en: `**Myth 1: The difference between simple and compound interest is small.** Small at first — but massive over decades. Over 30 years at 10%, compound interest yields 4x more than simple interest. This is why pension funds and long-term savings matter so much.

**Myth 2: Keeping money in a savings account protects its value.** If your savings account yields 8% but inflation is 25% (as in Pakistan 2022-23), you are getting negative real returns — your money is losing purchasing power despite earning nominal interest.

**Myth 3: You need a large sum to benefit from compounding.** Small amounts compounded over long periods outperform large amounts compounded briefly. Rs5,000/month for 30 years beats Rs50,000/month for 5 years at the same return rate — time is more powerful than amount.`,
      ur: `**غلط فہمی 1: سادہ اور مرکب سود کے درمیان فرق چھوٹا ہے۔** پہلے چھوٹا — لیکن دہائیوں میں بہت بڑا۔ 30 سال میں 10٪ پر، مرکب سود سادہ سود سے 4 گنا زیادہ دیتا ہے۔

**غلط فہمی 2: بچت کھاتے میں پیسہ رکھنا اس کی قیمت کی حفاظت کرتا ہے۔** اگر آپ کا بچت کھاتا 8٪ دیتا ہے لیکن افراط زر 25٪ ہے، آپ کو منفی حقیقی واپسی مل رہی ہے۔

**غلط فہمی 3: مرکب سود سے فائدہ اٹھانے کے لیے آپ کو بڑی رقم کی ضرورت ہے۔** چھوٹی رقمیں لمبے عرصے تک مرکب ہو کر بڑی رقموں کو مختصر عرصے میں مرکب ہونے سے بہتر کارکردگی دیتی ہیں۔`,
      rm: `**Ghalat fehmi 1: Saada aur murakkab sood ke darmiyan faraq chhota hai.** Pehle chhota — lekin dahaayon mein bahut bara. 30 saal mein 10% par, murakkab sood saada sood se 4 guna zyada deta hai.

**Ghalat fehmi 2: Bachat khaate mein paisa rakhna is ki qeemat ki hifaazat karta hai.** Agar aapka bachat khaata 8% deta hai lekin afrat-e-zer 25% hai, aapko manfi haqeeqi waapsi mil rahi hai.

**Ghalat fehmi 3: Murakkab sood se faayda uthane ke liye aapko bari raqam ki zaroorat hai.** Chhoti raqmain lambe arse tak murakkab ho kar bari raqamon ko mukhtasar arse mein murakkab hone se behtar kaarkardagi deti hain.`,
    },
    pakistanExample: {
      en: `**National Savings Certificates (NSCs):** Pakistan's government offers NSCs through the National Savings Centre — instruments yielding 15-19% (matched to policy rate). These are the closest thing to a compound-interest savings vehicle for ordinary Pakistanis without stock market access. A Rs100,000 investment in a 3-year NSC at 18% grows to ~Rs160,000. Over 10 years (reinvesting each 3-year maturity), the compound effect becomes significant. However, Pakistan's actual challenge: most of the population saves in gold or unproductive assets rather than financial instruments, missing the compounding benefit.`,
      ur: `**قومی بچت سرٹیفکیٹ (NSC):** پاکستان کی حکومت قومی بچت مرکز کے ذریعے NSC پیش کرتی ہے — 15-19٪ دینے والے آلات۔ یہ عام پاکستانیوں کے لیے مرکب سود کی بچت گاڑی کے قریب ترین چیز ہے جو اسٹاک مارکیٹ تک رسائی کے بغیر ہے۔ 18٪ پر 3 سالہ NSC میں Rs100,000 کی سرمایہ کاری ~Rs160,000 بن جاتی ہے۔ اصل چیلنج: زیادہ تر آبادی سونے یا غیر پیداواری اثاثوں میں بچت کرتی ہے، مرکب فائدے سے محروم رہتے ہوئے۔`,
      rm: `**Qoomi Bachat Certificate (NSC):** Pakistan ki hukoomat Qoomi Bachat Markaz ke zariye NSC pesh karti hai — 15-19% dene wale aalaaat. Yeh aam Pakistaniyon ke liye murakkab sood ki bachat gaadi ke qareeb tareen cheez hai jo stock market tak rasaai ke baghair hai. 18% par 3-saala NSC mein Rs100,000 ki sarmaaya kaari ~Rs160,000 ban jaati hai. Asl challenge: zyada tar aabaadi sone ya ghair paidawaari aasiyaon mein bachat karti hai, murakkab faayde se mahroom rehte hue.`,
    },
    realWorld: {
      en: "Warren Buffett's wealth illustrates compounding at scale. Buffett started investing at age 11 and has earned ~20% annual returns for 70+ years. His net worth is $130+ billion — but approximately 95% of it was earned after his 65th birthday. The math: 20% compounded for 70 years turns $1,000 into $827 million. The same 20% compounded for just 35 years (starting at 30, not 11) turns $1,000 into only $28,000. Time — not the rate of return — is the most powerful variable in compounding.",
      ur: "وارن بفیٹ کی دولت پیمانے پر مرکب کو واضح کرتی ہے۔ بفیٹ نے 11 سال کی عمر میں سرمایہ کاری شروع کی اور 70+ سال کے لیے ~20٪ سالانہ واپسی حاصل کی۔ اس کی مالیت $130+ ارب ہے — لیکن تقریباً 95٪ اس کی 65ویں سالگرہ کے بعد کمایا گیا۔ وقت — واپسی کی شرح نہیں — مرکب میں سب سے طاقتور متغیر ہے۔",
      rm: "Warren Buffett ki dolat paimane par murakkab ko waazeh karti hai. Buffett ne 11 saal ki umar mein sarmaaya kaari shuroo ki aur 70+ saal ke liye ~20% saalaana waapsi haasil ki. Is ki maaliati $130+ arab hai — lekin taqreeban 95% is ki 65wen saalgirah ke baad kamaya gaya. Waqt — waapsi ki shar nahin — murakkab mein sab se taaqatwar mutaghayir hai.",
    },
    summary: {
      en: "• Compound interest: interest on principal + accumulated interest → exponential growth\n• Simple interest: interest on principal only → linear growth\n• Rule of 72: divide 72 by rate → years to double (e.g., 12% → 6 years)\n• Time matters more than rate: starting early > starting later with more money\n• Pakistan's NSCs offer 15-19% — real compounding vehicles for ordinary savers\n• Debt compounding = debt trap: 25% consumer loan rate grows rapidly against borrowers",
      ur: "• مرکب سود: اصل + جمع شدہ سود پر سود → تیزی سے نمو\n• سادہ سود: صرف اصل پر سود → لکیری نمو\n• قاعدہ 72: شرح سے 72 تقسیم کریں → دوگنا ہونے کے سال (مثلاً 12٪ → 6 سال)\n• وقت شرح سے زیادہ اہم ہے: جلدی شروع کرنا > بعد میں زیادہ پیسے کے ساتھ شروع کرنا\n• پاکستان کے NSCs 15-19٪ پیش کرتے ہیں — عام بچت کرنے والوں کے لیے حقیقی مرکب گاڑیاں\n• قرض مرکب = قرض جال: 25٪ صارف قرض شرح قرض لینے والوں کے خلاف تیزی سے بڑھتی ہے",
      rm: "• Murakkab sood: asl + jamaa shuda sood par sood → tezi se numa\n• Saada sood: sirf asl par sood → lakeeeri numa\n• Qaaida 72: shar se 72 taqseem karein → dugna hone ke saal (maslan 12% → 6 saal)\n• Waqt shar se zyada ahem hai: jaldi shuroo karna > baad mein zyada paise ke saath shuroo karna\n• Pakistan ke NSCs 15-19% pesh karte hain — aam bachat karne walon ke liye haqeeqi murakkab gaadiyaan\n• Qarz murakkab = qarz jaal: 25% saraaf qarz shar qarz lene walon ke khilaf tezi se barhti hai",
    },
  },
  quiz: [
    {
      question: { en: "You invest Rs100,000 at 10% compound interest. After 2 years, how much do you have?", ur: "آپ Rs100,000 کو 10٪ مرکب سود پر سرمایہ لگاتے ہیں۔ 2 سال بعد آپ کے پاس کتنا ہے؟", rm: "Aap Rs100,000 ko 10% murakkab sood par sarmaaya lagate hain. 2 saal baad aap ke paas kitna hai?" },
      options: [
        { en: "Rs120,000 (simple interest)", ur: "Rs120,000 (سادہ سود)", rm: "Rs120,000 (saada sood)" },
        { en: "Rs121,000 (compound interest — year 2 earns on Rs110,000)", ur: "Rs121,000 (مرکب سود — سال 2 Rs110,000 پر کماتا ہے)", rm: "Rs121,000 (murakkab sood — saal 2 Rs110,000 par kamata hai)" },
        { en: "Rs110,000", ur: "Rs110,000", rm: "Rs110,000" },
        { en: "Rs125,000", ur: "Rs125,000", rm: "Rs125,000" },
      ],
      correctIndex: 1,
      explanation: { en: "Year 1: Rs100,000 × 10% = Rs10,000 interest → Rs110,000 balance. Year 2: Rs110,000 × 10% = Rs11,000 interest → Rs121,000. The extra Rs1,000 in Year 2 (vs simple interest's Rs10,000) is the compound effect — earning interest on interest.", ur: "سال 1: Rs100,000 × 10٪ = Rs10,000 سود → Rs110,000 بیلنس۔ سال 2: Rs110,000 × 10٪ = Rs11,000 سود → Rs121,000۔ سال 2 میں اضافی Rs1,000 (سادہ سود کے Rs10,000 بمقابلہ) مرکب اثر ہے — سود پر سود کمانا۔", rm: "Saal 1: Rs100,000 × 10% = Rs10,000 sood → Rs110,000 balance. Saal 2: Rs110,000 × 10% = Rs11,000 sood → Rs121,000. Saal 2 mein izaafi Rs1,000 (saada sood ke Rs10,000 bamuqaabla) murakkab asar hai — sood par sood kamana." },
    },
    {
      question: { en: "Using the Rule of 72, how many years does it take for an investment to double at 9% annual interest?", ur: "قاعدہ 72 کا استعمال کرتے ہوئے، 9٪ سالانہ سود پر سرمایہ کاری کو دوگنا ہونے میں کتنے سال لگتے ہیں؟", rm: "Qaaida 72 ka istemal karte hue, 9% saalaana sood par sarmaaya kaari ko dugna hone mein kitne saal lagte hain?" },
      options: [
        { en: "4 years", ur: "4 سال", rm: "4 saal" },
        { en: "6 years", ur: "6 سال", rm: "6 saal" },
        { en: "8 years", ur: "8 سال", rm: "8 saal" },
        { en: "12 years", ur: "12 سال", rm: "12 saal" },
      ],
      correctIndex: 2,
      explanation: { en: "Rule of 72: 72 ÷ 9% = 8 years. At 9% compound interest, your money doubles in approximately 8 years. This rule works well for rates between 6-12% and is a quick mental math tool for evaluating savings and investment options.", ur: "قاعدہ 72: 72 ÷ 9٪ = 8 سال۔ 9٪ مرکب سود پر، آپ کا پیسہ تقریباً 8 سال میں دوگنا ہو جاتا ہے۔ یہ قاعدہ 6-12٪ کے درمیان شرحوں کے لیے اچھی طرح کام کرتا ہے۔", rm: "Qaaida 72: 72 ÷ 9% = 8 saal. 9% murakkab sood par, aapka paisa taqreeban 8 saal mein dugna ho jaata hai. Yeh qaaida 6-12% ke darmiyan sharkhon ke liye achi tarah kaam karta hai." },
    },
    {
      question: { en: "Amina saves Rs5,000/month from age 25 with 10% annual returns. Bilal saves Rs10,000/month from age 40. Who has more at age 60?", ur: "عامنہ 25 سال کی عمر سے 10٪ سالانہ واپسی کے ساتھ Rs5,000/ماہ بچاتی ہے۔ بلال 40 سال کی عمر سے Rs10,000/ماہ بچاتا ہے۔ 60 سال کی عمر میں کس کے پاس زیادہ ہے؟", rm: "Amina 25 saal ki umar se 10% saalaana waapsi ke saath Rs5,000/maah bachati hai. Bilal 40 saal ki umar se Rs10,000/maah bachata hai. 60 saal ki umar mein kis ke paas zyada hai?" },
      options: [
        { en: "Bilal, because he saves double the amount", ur: "بلال، کیونکہ وہ دوگنی رقم بچاتا ہے", rm: "Bilal, kyunke woh dugni raqam bachata hai" },
        { en: "Amina, because she has 35 years of compounding vs Bilal's 20", ur: "عامنہ، کیونکہ اس کے پاس بلال کے 20 کے مقابلے میں 35 سال کا مرکب ہے", rm: "Amina, kyunke is ke paas Bilal ke 20 ke muqaable mein 35 saal ka murakkab hai" },
        { en: "They end up equal because of the double amount", ur: "وہ دوگنی رقم کی وجہ سے برابر ختم ہوتے ہیں", rm: "Woh dugni raqam ki wajah se barabar khatam hote hain" },
        { en: "Bilal, because higher savings rate dominates", ur: "بلال، کیونکہ اعلی بچت شرح حاوی ہوتی ہے", rm: "Bilal, kyunke aali bachat shar haawi hoti hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Amina: Rs5,000/month for 35 years at 10% ≈ Rs19.8 million. Bilal: Rs10,000/month for 20 years at 10% ≈ Rs7.6 million. Amina wins by a large margin despite saving half as much per month — because 35 years of compounding is vastly more powerful than 20 years, even at double the amount.", ur: "عامنہ: 10٪ پر 35 سال کے لیے Rs5,000/ماہ ≈ Rs19.8 ملین۔ بلال: 10٪ پر 20 سال کے لیے Rs10,000/ماہ ≈ Rs7.6 ملین۔ عامنہ بڑے فاصلے سے جیتتی ہے حالانکہ وہ فی ماہ نصف بچاتی ہے — کیونکہ 35 سال کا مرکب 20 سال سے کہیں زیادہ طاقتور ہے۔", rm: "Amina: 10% par 35 saal ke liye Rs5,000/maah ≈ Rs19.8 million. Bilal: 10% par 20 saal ke liye Rs10,000/maah ≈ Rs7.6 million. Amina bare faasle se jeetti hai haalaanke woh fi-maah nisf bachati hai — kyunke 35 saal ka murakkab 20 saal se kahin zyada taaqatwar hai." },
    },
    {
      question: { en: "If Pakistan's inflation is 20% but your bank savings account pays 8%, what is happening to your savings?", ur: "اگر پاکستان کی افراط زر 20٪ ہے لیکن آپ کا بینک بچت کھاتہ 8٪ دیتا ہے، تو آپ کی بچت کے ساتھ کیا ہو رہا ہے؟", rm: "Agar Pakistan ki afrat-e-zer 20% hai lekin aapka bank bachat khaata 8% deta hai, to aapki bachat ke saath kya ho raha hai?" },
      options: [
        { en: "Growing at 8% per year in real terms", ur: "حقیقی لحاظ سے سالانہ 8٪ بڑھ رہا ہے", rm: "Haqeeqi lihaaz se saalaana 8% barh raha hai" },
        { en: "Shrinking in real terms — negative real return of about -12%", ur: "حقیقی لحاظ سے سکڑ رہا ہے — تقریباً -12٪ کی منفی حقیقی واپسی", rm: "Haqeeqi lihaaz se sikar raha hai — taqreeban -12% ki manfi haqeeqi waapsi" },
        { en: "Staying the same — inflation and interest offset each other", ur: "ایک جیسا رہنا — افراط زر اور سود ایک دوسرے کو پورا کرتے ہیں", rm: "Ek jaisa rehna — afrat-e-zer aur sood ek doosre ko poora karte hain" },
        { en: "Compounding faster than inflation", ur: "افراط زر سے تیز مرکب ہو رہا ہے", rm: "Afrat-e-zer se tez murakkab ho raha hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Real return = nominal return − inflation = 8% − 20% = −12%. Even though you earn 8% in nominal terms, your money buys 20% less each year. The purchasing power of your savings shrinks by about 12% annually. This was the reality for many Pakistani savers in 2022-23.", ur: "حقیقی واپسی = برائے نام واپسی − افراط زر = 8٪ − 20٪ = −12٪۔ اگرچہ آپ برائے نام لحاظ سے 8٪ کماتے ہیں، آپ کا پیسہ ہر سال 20٪ کم خریدتا ہے۔ آپ کی بچت کی قوت خرید سالانہ تقریباً 12٪ کم ہوتی ہے۔", rm: "Haqeeqi waapsi = baraaye naam waapsi − afrat-e-zer = 8% − 20% = −12%. Agarchay aap baraaye naam lihaaz se 8% kamaate hain, aapka paisa har saal 20% kam khareedta hai. Aapki bachat ki quwwat-e-khireed saalaana taqreeban 12% kam hoti hai." },
    },
  ],
  faq: [
    {
      question: { en: "Where can ordinary Pakistanis invest to benefit from compound growth?", ur: "عام پاکستانی مرکب نمو سے فائدہ اٹھانے کے لیے کہاں سرمایہ کاری کر سکتے ہیں؟", rm: "Aam Pakistani murakkab numa se faayda uthane ke liye kahan sarmaaya kaari kar sakte hain?" },
      answer: { en: "Several options exist: (1) National Savings Certificates (NSCs) — government-backed, currently 15-19%, available at any National Savings Centre branch or online; (2) Mutual funds — particularly money market funds that reinvest returns automatically; (3) PSX stocks — higher risk but historically high returns over long periods; (4) Islamic banking deposit accounts — profit-sharing equivalent. The best approach for most people: start with NSCs or a money market mutual fund (low minimum, automatic compounding), then add equity exposure as you learn more. The key is starting — even Rs1,000/month compounded beats Rs0.", ur: "کئی اختیارات موجود ہیں: (1) قومی بچت سرٹیفکیٹ (NSCs) — حکومت کی حمایت یافتہ، فی الحال 15-19٪؛ (2) میوچل فنڈز — خاص طور پر منی مارکیٹ فنڈز جو واپسی خودکار طور پر دوبارہ سرمایہ کاری کرتے ہیں؛ (3) PSX اسٹاک — لمبے عرصے میں اعلی تاریخی واپسی؛ (4) اسلامی بینکنگ ڈپازٹ اکاؤنٹ۔ زیادہ تر لوگوں کے لیے بہترین نقطہ نظر: NSCs یا منی مارکیٹ میوچل فنڈ سے شروع کریں، پھر مزید جاننے کے ساتھ ایکویٹی ایکسپوژر شامل کریں۔", rm: "Kayi ikhtiyaaraat maujoood hain: (1) Qoomi Bachat Certificates (NSCs) — hukoomat ki himaayat yaafta, filhaal 15-19%; (2) Mutual funds — khaas tor par money market funds jo waapsi khudkaar tor par dobaara sarmaaya kaari karte hain; (3) PSX stocks — lambe arse mein aali taareekhi waapsi; (4) Islami banking deposit account. Zyada tar logon ke liye behtareen nuqta-e-nazar: NSCs ya money market mutual fund se shuroo karein, phir mazeed jaanne ke saath equity exposure shaamil karein." },
    },
  ],
};
