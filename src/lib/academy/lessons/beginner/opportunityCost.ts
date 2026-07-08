import type { Lesson } from "@/lib/academy/types";

export const opportunityCostLesson: Lesson = {
  slug: "opportunity-cost",
  category: "beginner",
  title: { en: "Opportunity Cost", ur: "مواقعاتی لاگت", rm: "Mawaqaati Lagat" },
  subtitle: {
    en: "Every choice you make has a hidden cost — what you give up to get something else",
    ur: "آپ کا ہر انتخاب ایک پوشیدہ لاگت رکھتا ہے — وہ جو آپ کچھ حاصل کرنے کے لیے چھوڑتے ہیں",
    rm: "Aap ka har intikhab ek poshida lagat rakhta hai — woh jo aap kuch haasil karne ke liye chhodte hain",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: [],
  relatedLessonSlugs: ["gdp", "taxes-intro", "government-spending-basics"],
  content: {
    overview: {
      en: "Opportunity cost is the value of the next best option you give up whenever you make a choice. It's invisible on any price tag but drives every economic decision — from household budgets to government policy.",
      ur: "مواقعاتی لاگت وہ قیمت ہے جو آپ اگلے بہترین متبادل کی دیتے ہیں جب آپ کوئی انتخاب کرتے ہیں۔ یہ کسی بھی قیمت کی پرچی پر نظر نہیں آتی لیکن ہر معاشی فیصلے کو چلاتی ہے۔",
      rm: "Mawaqaati lagat woh qeemat hai jo aap agli behtareen mutabadil ki dete hain jab aap koi intikhab karte hain. Yeh kisi bhi qeemat ki parchi par nazar nahi aati lekin har muaashi faisle ko chalati hai.",
    },
    whyItMatters: {
      en: "Governments face opportunity costs constantly. When Pakistan spends Rs 500 billion on defence, that money can't be spent on schools or hospitals — the foregone benefit is the opportunity cost. Understanding this concept stops you from thinking any choice is 'free' just because no money changes hands.",
      ur: "حکومتیں مستقل طور پر مواقعاتی لاگت کا سامنا کرتی ہیں۔ جب پاکستان 500 ارب روپے دفاع پر خرچ کرتا ہے، وہ پیسہ اسکولوں یا ہسپتالوں پر نہیں جا سکتا۔",
      rm: "Hukoomaten mustaqil tor par mawaqaati lagat ka samna karti hain. Jab Pakistan 500 arab rupay difaa par kharch karta hai, woh paisa iskoolon ya haspraalon par nahi ja sakta.",
    },
    explanation: {
      en: `**The core idea:** When you choose A, you automatically forgo B. The opportunity cost is the value of B — not all the alternatives you rejected, just the next best one.

**Example:** You have Rs 10,000 and two options: deposit it in a savings account at 12% per year (earning Rs 1,200) or invest in a small business expecting 20% return (earning Rs 2,000). If you choose the business, your opportunity cost is the Rs 1,200 you gave up from the savings account. If you choose the savings account, your opportunity cost is the Rs 800 extra profit you gave up.

**Time has opportunity cost too:** A student spending 4 hours on a hobby forgoes the chance to study, earn money, or rest. This is why economists say 'there's no such thing as a free lunch' — even leisure has a cost measured in what else you could have done.`,
      ur: `**بنیادی خیال:** جب آپ A کا انتخاب کرتے ہیں، آپ خودبخود B چھوڑ دیتے ہیں۔ مواقعاتی لاگت B کی قیمت ہے — سب سے بہتر اگلے متبادل کی۔

**مثال:** آپ کے پاس 10,000 روپے ہیں اور دو اختیارات ہیں: بچت اکاؤنٹ میں 12٪ سالانہ پر جمع کریں (1,200 روپے کمائیں) یا چھوٹے کاروبار میں لگائیں (2,000 روپے کمائیں)۔

**وقت کی بھی مواقعاتی لاگت ہے:** ایک طالب علم 4 گھنٹے مشغلے پر صرف کرے تو پڑھائی، کمائی یا آرام کا موقع چھوڑتا ہے۔`,
      rm: `**Bunyaadi khayal:** Jab aap A ka intikhab karte hain, aap khud-ba-khud B chhod dete hain. Mawaqaati lagat B ki qeemat hai.

**Misaal:** Aap ke paas 10,000 rupay hain aur do ikhtiyaraat hain: bachat account mein 12% saalaana par jama karen (1,200 rupay kamayen) ya chhote karobar mein lagayen (2,000 rupay kamayen).

**Waqt ki bhi mawaqaati lagat hai:** Ek taalib ilm 4 ghante mashghale par sarf kare toh parhai, kamaai ya aaraam ka mauqa chhodata hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Opportunity cost only applies to money.** Wrong — it applies to time, resources, and attention too. A farmer choosing to grow rice instead of wheat gives up the potential wheat profit as opportunity cost.

**Myth 2: Lower financial cost means better choice.** If getting something 'free' (a subsidy, a gift) takes 6 hours to collect, your opportunity cost is 6 hours of potential work or rest. Sometimes 'free' is expensive.

**Myth 3: Sunk costs are opportunity costs.** Money already spent and gone is a sunk cost — not an opportunity cost. Economic decisions should ignore sunk costs and focus on what lies ahead.`,
      ur: `**غلط فہمی 1: مواقعاتی لاگت صرف پیسے پر لاگو ہوتی ہے۔** غلط — یہ وقت، وسائل اور توجہ پر بھی لاگو ہوتی ہے۔

**غلط فہمی 2: کم مالی لاگت بہتر انتخاب ہے۔** کچھ 'مفت' حاصل کرنے میں 6 گھنٹے لگیں تو آپ کی مواقعاتی لاگت 6 گھنٹے کی ممکنہ کمائی ہے۔

**غلط فہمی 3: ڈوبی ہوئی لاگت مواقعاتی لاگت ہے۔** پہلے سے خرچ ہوا پیسہ ڈوبی لاگت ہے — مواقعاتی لاگت نہیں۔`,
      rm: `**Ghalat fehmi 1: Mawaqaati lagat sirf paise par laagu hoti hai.** Ghalat — yeh waqt, wasail aur tawajjuh par bhi laagu hoti hai.

**Ghalat fehmi 2: Kam maali lagat behtareen intikhab hai.** Kuch 'muft' haasil karne mein 6 ghante lagein toh aap ki mawaqaati lagat 6 ghante ki mumkina kamaai hai.

**Ghalat fehmi 3: Dobi hui lagat mawaqaati lagat hai.** Pehle se kharch hua paisa dobi lagat hai — mawaqaati lagat nahi.`,
    },
    pakistanExample: {
      en: `**CPEC opportunity cost:** When Pakistan committed to CPEC infrastructure projects worth $62 billion, those resources couldn't simultaneously fund social sector development. The opportunity cost of each motorway built was schools, hospitals, or other infrastructure that could have been constructed instead. This doesn't make CPEC good or bad — it means any choice has a price.

**Education vs child labour:** A family sending a child to work instead of school gains Rs 500/day of income. The opportunity cost is the higher lifetime earnings the child would have had with education — often worth millions over a lifetime.`,
      ur: `**CPEC کی مواقعاتی لاگت:** جب پاکستان نے 62 ارب ڈالر کے CPEC منصوبوں کا عہد کیا، وہ وسائل بیک وقت سماجی شعبے پر نہیں جا سکتے تھے۔ ہر تعمیر شدہ موٹروے کی مواقعاتی لاگت وہ اسکول یا ہسپتال ہیں جو بنائے جا سکتے تھے۔`,
      rm: `**CPEC ki mawaqaati lagat:** Jab Pakistan ne 62 arab dollar ke CPEC mansobon ka ahad kiya, woh wasail bek waqt samaji shaabay par nahi ja sakte the. Har tamir shuda motorway ki mawaqaati lagat woh iskool ya haspraal hain jo banaaye ja sakte the.`,
    },
    realWorld: {
      en: "The USA's decision after 9/11 to spend $2 trillion on wars in Afghanistan and Iraq had an enormous opportunity cost — those resources could have rebuilt domestic infrastructure, funded research, or reduced the national debt. This doesn't judge whether the wars were right or wrong; it illustrates that every policy choice forecloses others.",
      ur: "9/11 کے بعد امریکہ کے افغانستان اور عراق میں 2 ٹریلین ڈالر کی جنگوں پر خرچ کرنے کی بھاری مواقعاتی لاگت تھی — وہ وسائل ملکی بنیادی ڈھانچے کو بہتر بنا سکتے تھے۔",
      rm: "9/11 ke baad America ke Afghanistan aur Iraq mein 2 trillion dollar ki jangon par kharch karne ki bhaari mawaqaati lagat thi — woh wasail mulki bunyaadi dhaanche ko behtar bana sakte the.",
    },
    summary: {
      en: "• Every choice forfeits the next best alternative — that foregone value is opportunity cost\n• Applies to money, time, and attention — not just financial decisions\n• Governments face opportunity costs: funds spent on one priority can't go elsewhere\n• Sunk costs (past spending) are not opportunity costs — ignore them\n• 'Free' things often have high opportunity costs in time\n• The concept explains why economists always ask: 'Compared to what?'",
      ur: "• ہر انتخاب اگلا بہترین متبادل چھوڑتا ہے — وہ چھوڑی ہوئی قیمت مواقعاتی لاگت ہے\n• پیسے، وقت اور توجہ پر لاگو ہوتی ہے\n• حکومتیں مواقعاتی لاگت کا سامنا کرتی ہیں\n• ڈوبی لاگت مواقعاتی لاگت نہیں\n• 'مفت' چیزیں اکثر وقت میں مہنگی ہوتی ہیں",
      rm: "• Har intikhab agli behtareen mutabadil chhordta hai — woh chhodi hui qeemat mawaqaati lagat hai\n• Paise, waqt aur tawajjuh par laagu hoti hai\n• Hukoomaten mawaqaati lagat ka samna karti hain\n• Dobi lagat mawaqaati lagat nahi\n• 'Muft' cheezein aksar waqt mein mahangi hoti hain",
    },
  },
  quiz: [
    {
      question: { en: "A student spends Saturday studying instead of working part-time at Rs 800/day. What is the opportunity cost of studying?", ur: "ایک طالب علم ہفتہ کا دن پڑھائی میں گزارتا ہے بجائے 800 روپے/دن پر پارٹ ٹائم کام کرنے کے۔ پڑھائی کی مواقعاتی لاگت کیا ہے؟", rm: "Ek taalib ilm haftay ka din parhai mein guzaarta hai bajaaye 800 rupay/din par part time kaam karne ke. Parhai ki mawaqaati lagat kya hai?" },
      options: [
        { en: "Zero — studying is free", ur: "صفر — پڑھائی مفت ہے", rm: "Sifar — parhai muft hai" },
        { en: "Rs 800 (lost wages)", ur: "800 روپے (ضائع شدہ اجرت)", rm: "800 rupay (zaya shuda ujrat)" },
        { en: "The cost of textbooks", ur: "نصابی کتب کی لاگت", rm: "Nisaabi kutab ki lagat" },
        { en: "The time spent commuting", ur: "آنے جانے میں صرف وقت", rm: "Aane jaane mein sarf waqt" },
      ],
      correctIndex: 1,
      explanation: { en: "The opportunity cost is the Rs 800 in wages the student gives up by choosing to study instead of work.", ur: "مواقعاتی لاگت 800 روپے کی وہ اجرت ہے جو طالب علم کام کرنے کی بجائے پڑھنے کا انتخاب کرکے چھوڑتا ہے۔", rm: "Mawaqaati lagat 800 rupay ki woh ujrat hai jo taalib ilm kaam karne ki bajaaye parhne ka intikhab karke chhodta hai." },
    },
    {
      question: { en: "Pakistan's government uses Rs 100 billion to build a highway. What does opportunity cost analysis require us to consider?", ur: "پاکستان حکومت 100 ارب روپے شاہراہ بنانے پر خرچ کرتی ہے۔ مواقعاتی لاگت کا تجزیہ کیا غور کرنے کا مطالبہ کرتا ہے؟", rm: "Pakistan hukoomat 100 arab rupay shaahraah banaane par kharch karti hai. Mawaqaati lagat ka tajzia kya ghaur karne ka mutaaliba karta hai?" },
      options: [
        { en: "Only the highway construction cost", ur: "صرف شاہراہ کی تعمیری لاگت", rm: "Sirf shaahraah ki tamiri lagat" },
        { en: "What else could have been built or funded with that money", ur: "اس پیسے سے اور کیا بنایا یا فنڈ کیا جا سکتا تھا", rm: "Is paise se aur kya banaya ya fund kiya ja sakta tha" },
        { en: "Future toll revenue from the highway", ur: "شاہراہ سے مستقبل کی ٹول آمدنی", rm: "Shaahraah se mustaqbil ki toll aamdani" },
        { en: "The highway's physical length", ur: "شاہراہ کی جسمانی لمبائی", rm: "Shaahraah ki jismaani lambaai" },
      ],
      correctIndex: 1,
      explanation: { en: "Opportunity cost asks what was foregone — schools, hospitals, or other infrastructure that could have been built with the same Rs 100 billion.", ur: "مواقعاتی لاگت پوچھتی ہے کہ کیا چھوڑا گیا — اسکول، ہسپتال یا دیگر بنیادی ڈھانچہ جو 100 ارب روپے سے بنایا جا سکتا تھا۔", rm: "Mawaqaati lagat poochti hai ke kya chhoda gaya — iskool, haspraal ya deegar bunyaadi dhaancha jo 100 arab rupay se banaya ja sakta tha." },
    },
    {
      question: { en: "Which of these is a 'sunk cost' (not an opportunity cost)?", ur: "ان میں سے کون سی 'ڈوبی لاگت' ہے (مواقعاتی لاگت نہیں)?", rm: "In mein se kaun si 'dobi lagat' hai (mawaqaati lagat nahi)?" },
      options: [
        { en: "Giving up a job offer to start a business", ur: "کاروبار شروع کرنے کے لیے نوکری کی پیشکش چھوڑنا", rm: "Karobar shuru karne ke liye naukri ki peshkash chhordna" },
        { en: "Rs 50,000 already paid for a non-refundable ticket", ur: "50,000 روپے جو واپس نہ ہونے والے ٹکٹ پر پہلے سے ادا ہو چکے", rm: "50,000 rupay jo waapis na hone wale ticket par pehle se ada ho chuke" },
        { en: "Interest foregone on money spent on a car", ur: "کار پر خرچ ہونے والے پیسوں پر ضائع ہونے والا سود", rm: "Kar par kharch hone wale paiisain par zaya hone wala sood" },
        { en: "Time spent working on Project A instead of Project B", ur: "پروجیکٹ B کی بجائے A پر صرف وقت", rm: "Project B ki bajaaye A par sarf waqt" },
      ],
      correctIndex: 1,
      explanation: { en: "A non-refundable ticket payment is a sunk cost — it's gone regardless of what you do next. Opportunity costs are about future choices, not past spending.", ur: "واپس نہ ہونے والی ٹکٹ کی ادائیگی ڈوبی لاگت ہے — یہ چلی گئی چاہے آپ آگے کچھ بھی کریں۔ مواقعاتی لاگتیں مستقبل کے انتخاب کے بارے میں ہیں۔", rm: "Waapis na hone wali ticket ki adaaigi dobi lagat hai — yeh chali gayi chahe aap aage kuch bhi karo. Mawaqaati lagaten mustaqbil ke intikhab ke baare mein hain." },
    },
    {
      question: { en: "A farmer can grow either rice (earning Rs 40,000) or wheat (earning Rs 30,000) on the same land. What is the opportunity cost of growing rice?", ur: "ایک کسان ایک ہی زمین پر چاول (40,000 روپے) یا گندم (30,000 روپے) اگا سکتا ہے۔ چاول اگانے کی مواقعاتی لاگت کیا ہے؟", rm: "Ek kisaan ek hi zameen par chaawal (40,000 rupay) ya gandum (30,000 rupay) uga sakta hai. Chaawal ugaane ki mawaqaati lagat kya hai?" },
      options: [
        { en: "Rs 40,000", ur: "40,000 روپے", rm: "40,000 rupay" },
        { en: "Rs 30,000", ur: "30,000 روپے", rm: "30,000 rupay" },
        { en: "Rs 10,000", ur: "10,000 روپے", rm: "10,000 rupay" },
        { en: "Zero", ur: "صفر", rm: "Sifar" },
      ],
      correctIndex: 1,
      explanation: { en: "The opportunity cost of growing rice is the Rs 30,000 the farmer gives up by not growing wheat — the next best alternative.", ur: "چاول اگانے کی مواقعاتی لاگت 30,000 روپے ہے جو کسان گندم نہ اگانے سے چھوڑتا ہے — اگلا بہترین متبادل۔", rm: "Chaawal ugaane ki mawaqaati lagat 30,000 rupay hai jo kisaan gandum na ugaane se chhodata hai — agli behtareen mutabadil." },
    },
  ],
  faq: [
    {
      question: { en: "Is opportunity cost always a financial amount?", ur: "کیا مواقعاتی لاگت ہمیشہ مالی رقم ہوتی ہے؟", rm: "Kya mawaqaati lagat hamesha maali raqam hoti hai?" },
      answer: { en: "No — it can be measured in time, health, relationships, or any other unit of value. A doctor working longer hours earns more money but gives up family time. The opportunity cost is non-monetary but very real.", ur: "نہیں — اسے وقت، صحت، رشتوں یا کسی اور قدر کی اکائی میں ناپا جا سکتا ہے۔ ایک ڈاکٹر زیادہ گھنٹے کام کرے تو زیادہ کماتا ہے لیکن خاندانی وقت چھوڑتا ہے۔", rm: "Nahi — ise waqt, sehat, rishtoon ya kisi aur qadar ki ikaai mein naapa ja sakta hai. Ek doctor zyada ghante kaam kare toh zyada kamata hai lekin khaandaani waqt chhodata hai." },
    },
    {
      question: { en: "Why do economists say 'there's no free lunch'?", ur: "ماہرین اقتصادیات کیوں کہتے ہیں 'کوئی مفت دوپہر کا کھانا نہیں'؟", rm: "Maahireen iqtisadiyaat kyun kehte hain 'koi muft dopeher ka khaana nahi'?" },
      answer: { en: "Because every benefit requires giving up something — even if you don't pay money for it. A free government subsidy costs taxpayers. A free ticket you won costs you the time to attend the event. Opportunity cost is always lurking somewhere.", ur: "کیونکہ ہر فائدے کے لیے کچھ چھوڑنا پڑتا ہے — چاہے آپ پیسے نہ دیں۔ مفت حکومتی سبسڈی ٹیکس دہندگان کو خرچ کرتی ہے۔", rm: "Kyunke har faayde ke liye kuch chhodna parta hai — chahe aap paise na den. Muft hukomaati subsidy tax dihandagaan ko kharch karti hai." },
    },
    {
      question: { en: "How does opportunity cost affect Pakistan's education policy?", ur: "مواقعاتی لاگت پاکستان کی تعلیمی پالیسی کو کیسے متاثر کرتی ہے؟", rm: "Mawaqaati lagat Pakistan ki taaleemi policy ko kaise mutaassir karti hai?" },
      answer: { en: "Every rupee Pakistan's government spends on education comes from limited tax revenue. Spending more on education means less for defence, health, or infrastructure. This is why Pakistan's chronically low education spending (around 1.7% of GDP) represents a policy choice with heavy opportunity costs — foregoing human capital that could have grown the economy.", ur: "پاکستان حکومت کا تعلیم پر ہر روپیہ محدود ٹیکس آمدنی سے آتا ہے۔ تعلیم پر زیادہ خرچ کا مطلب دفاع، صحت یا بنیادی ڈھانچے پر کم۔", rm: "Pakistan hukoomat ka taaleem par har rupiya mahdood tax aamdani se aata hai. Taaleem par zyada kharch ka matlab difaa, sehat ya bunyaadi dhaanche par kam." },
    },
  ],
};
