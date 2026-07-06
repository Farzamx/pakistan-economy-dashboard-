import type { Lesson } from "@/lib/academy/types";

export const policyRateLesson: Lesson = {
  slug: "policy-rate",
  category: "banking",
  title: { en: "The Policy Rate & Monetary Policy", ur: "پالیسی ریٹ اور مالیاتی پالیسی", rm: "Policy Rate aur Maaliyaati Policy" },
  subtitle: {
    en: "How the SBP uses one interest rate to steer Pakistan's entire economy",
    ur: "SBP ایک شرح سود سے پاکستان کی پوری معیشت کو کیسے چلاتا ہے",
    rm: "SBP ek share sood se Pakistan ki poori maashiyat ko kaise chalata hai",
  },
  level: "beginner",
  readMinutes: 10,
  isPremium: false,
  relatedIndicatorSlugs: ["pakistan-policy-rate", "kibor-rate"],
  relatedLessonSlugs: ["inflation", "gdp", "cpi"],
  content: {
    overview: {
      en: "The policy rate is the interest rate the State Bank of Pakistan (SBP) charges commercial banks for overnight loans. By changing this one rate, the SBP influences the cost of credit across the entire economy — shaping inflation, investment, exchange rates, and economic growth. This lesson explains how it works, why it matters, and what Pakistan's recent rate cycle looked like.",
      ur: "پالیسی ریٹ وہ شرح سود ہے جو اسٹیٹ بینک آف پاکستان (SBP) کمرشل بینکوں سے راتوں رات قرضوں کے لیے لیتا ہے۔ اس ایک شرح کو تبدیل کرکے، SBP پوری معیشت میں قرض کی لاگت پر اثر انداز ہوتا ہے۔",
      rm: "Policy rate woh share sood hai jo State Bank of Pakistan (SBP) commercial bankoon se raaton raat qarzoon ke liye leta hai. Is ek shar ko tabdeel karke, SBP poori maashiyat mein qarz ki lagat par asar andaaz hota hai.",
    },
    whyItMatters: {
      en: `Every loan in Pakistan — a mortgage, a business credit line, a government bond — is priced relative to the policy rate. When the SBP raises it, borrowing becomes more expensive throughout the economy. Businesses invest less, consumers spend less, and inflation cools. When the SBP cuts it, credit becomes cheaper, investment picks up, and growth accelerates.

For the average Pakistani:
- **Home buyers:** Higher policy rate → higher mortgage payments
- **Business owners:** Higher policy rate → costlier working capital loans
- **Savers:** Higher policy rate → better returns on savings accounts and T-bills
- **Stock market investors:** Higher policy rate makes bonds more attractive relative to stocks, often pushing equity prices down

Pakistan ran the **highest real policy rate in Asia** in 2023–2024, making it a critical and controversial topic in economic policy circles.`,
      ur: `پاکستان میں ہر قرض — رہن، کاروباری قرضہ، حکومتی بانڈ — پالیسی ریٹ کے مقابلے میں قیمت رکھتا ہے۔

عام پاکستانی کے لیے:
- **گھر خریدنے والے:** زیادہ پالیسی ریٹ → زیادہ رہن کی ادائیگیاں
- **کاروبار کے مالکان:** زیادہ پالیسی ریٹ → مہنگے کاروباری قرضے
- **بچت کرنے والے:** زیادہ پالیسی ریٹ → بچت اکاؤنٹ اور T-bills پر بہتر منافع

پاکستان نے 2023–2024 میں **ایشیا میں سب سے زیادہ حقیقی پالیسی ریٹ** چلایا۔`,
      rm: `Pakistan mein har qarz — rahn, karobaari qurza, hukomaati bond — policy rate ke muqablay mein qeemat rakhta hai.

Aam Pakistani ke liye:
- **Ghar khareedne wale:** Zyada policy rate → zyada rahn ki adaaigiyan
- **Karobaar ke maalikaan:** Zyada policy rate → mahange karobaari qarzay
- **Bachaat karne wale:** Zyada policy rate → bachat account aur T-bills par behtar munaafa

Pakistan ne 2023–2024 mein **Asia mein sab se zyada haqeeqi policy rate** chalaya.`,
    },
    explanation: {
      en: `**How the transmission mechanism works:**

1. **SBP sets the policy rate** (currently reviewed every 8 weeks by the Monetary Policy Committee)
2. Commercial banks adjust their own lending and deposit rates based on the policy rate
3. KIBOR (Karachi Interbank Offered Rate) — the rate banks charge each other — moves closely with the policy rate
4. Businesses and consumers face higher or lower borrowing costs
5. Spending, investment, and ultimately inflation respond

**Three main channels:**
- **Credit channel:** Expensive credit → less borrowing → less spending → lower demand → lower inflation
- **Asset price channel:** Higher rates make bonds more attractive vs. stocks and property → asset prices fall → "wealth effect" reduces spending
- **Exchange rate channel:** Higher rates attract foreign capital → more USD inflows → rupee appreciates → imports cheaper → imported inflation falls

**The interest rate corridor:**
The SBP operates a corridor system:
- **Ceiling (SBP's overnight lending rate):** Banks can borrow from SBP at this rate
- **Floor (SBP's deposit rate):** SBP pays banks this rate for overnight deposits
- **Policy rate:** Sits in the middle, anchoring market rates

**Forward guidance:**
The SBP issues a Monetary Policy Statement after each MPC meeting, explaining the decision and its outlook. Markets react immediately to both the rate decision and the language used.`,
      ur: `**ترسیل کا طریقہ کار:**

1. **SBP پالیسی ریٹ مقرر کرتا ہے** (مالیاتی پالیسی کمیٹی ہر 8 ہفتوں میں جائزہ لیتی ہے)
2. کمرشل بینک پالیسی ریٹ کی بنیاد پر اپنی قرض اور ڈپازٹ کی شرحیں ایڈجسٹ کرتے ہیں
3. KIBOR (کراچی انٹربینک آفرڈ ریٹ) پالیسی ریٹ کے ساتھ قریب سے حرکت کرتا ہے
4. کاروبار اور صارفین کو زیادہ یا کم قرض کی لاگت کا سامنا ہوتا ہے

**تین اہم چینلز:**
- **قرض کا چینل:** مہنگا قرض → کم قرض لینا → کم خرچ → کم طلب → کم افراطِ زر
- **اثاثہ قیمت کا چینل:** زیادہ شرحیں بانڈز کو اسٹاکس اور جائداد کے مقابلے میں زیادہ پرکشش بناتی ہیں
- **زرمبادلہ کا چینل:** زیادہ شرحیں غیر ملکی سرمایہ کاری کو راغب کرتی ہیں → روپیہ مضبوط ہوتا ہے → درآمدی افراطِ زر کم ہوتا ہے`,
      rm: `**Tarseel ka tareeqa kaar:**

1. **SBP policy rate muqarrar karta hai** (Maaliyaati Policy Committee har 8 hafte mein jaiza leti hai)
2. Commercial bank policy rate ki bunyaad par apni qarz aur deposit ki sarhein adjust karte hain
3. KIBOR (Karachi Interbank Offered Rate) policy rate ke saath qareeb se harkat karta hai
4. Karobaar aur consumers ko zyada ya kam qarz ki lagat ka samna hota hai

**Teen aham channels:**
- **Qarz ka channel:** Mahanga qarz → kam qarz lena → kam kharch → kam talab → kam inflation
- **Asasah qeemat ka channel:** Zyada sarhein bonds ko stocks aur jaidad ke muqablay mein zyada parkashan banati hain
- **Zar-e-mubadla ka channel:** Zyada sarhein ghair mulki sarmaya kaari ko raghib karti hain → rupiya mazboot hota hai → daraamdi inflation kam hota hai`,
    },
    misconceptions: {
      en: `**Myth 1: A high policy rate always means the SBP is being too tight.**
The policy rate must be evaluated *relative to inflation*. The real policy rate = nominal policy rate − inflation. In 2022, Pakistan had a policy rate of 13% but inflation of 25%+, making the *real* rate deeply negative — meaning monetary policy was actually loose. A "high" nominal rate during high inflation can still be accommodative.

**Myth 2: Rate cuts are always good for the economy.**
Premature rate cuts can reignite inflation. In Turkey (2021–2022), the government cut rates despite high inflation, causing the lira to collapse and inflation to accelerate past 85%.

**Myth 3: The SBP directly controls bank lending rates.**
The SBP controls its own policy rate. Commercial banks set their own lending rates based on the policy rate plus a spread reflecting credit risk, operating costs, and competition. The pass-through is significant but not 1:1.

**Myth 4: Raising rates harms everyone.**
Rate hikes hurt borrowers but benefit savers. Pensioners and retirees holding fixed-income assets benefit from higher rates. The distributional effects are complex and contested.`,
      ur: `**غلط فہمی 1: زیادہ پالیسی ریٹ کا مطلب SBP بہت سخت ہے۔**
پالیسی ریٹ کو افراطِ زر *کے مقابلے میں* جانچنا چاہیے۔ حقیقی پالیسی ریٹ = برائے نام پالیسی ریٹ − افراطِ زر۔

**غلط فہمی 2: شرح میں کمی ہمیشہ معیشت کے لیے اچھی ہے۔**
قبل از وقت شرح میں کمی افراطِ زر کو دوبارہ بھڑکا سکتی ہے۔ ترکی (2021–2022) میں شرح میں کمی کی گئی جس سے لیرا گرا اور افراطِ زر 85٪ سے تجاوز کر گیا۔

**غلط فہمی 3: SBP بینک قرض کی شرحوں کو براہ راست کنٹرول کرتا ہے۔**
SBP اپنی پالیسی ریٹ کنٹرول کرتا ہے۔ کمرشل بینک اپنی قرض کی شرحیں پالیسی ریٹ اور ایک اسپریڈ کی بنیاد پر مقرر کرتے ہیں۔

**غلط فہمی 4: شرح بڑھانا سب کو نقصان پہنچاتا ہے۔**
شرح اضافہ قرض لینے والوں کو نقصان دیتا ہے لیکن بچت کرنے والوں کو فائدہ دیتا ہے۔`,
      rm: `**Ghalat fehmi 1: Zyada policy rate ka matlab SBP bahut sakht hai.**
Policy rate ko inflation *ke muqablay mein* jaanchna chahiye. Haqeeqi policy rate = baraey naam policy rate − inflation.

**Ghalat fehmi 2: Share mein kami hamesha maashiyat ke liye achi hai.**
Qabl az waqt share mein kami inflation ko dobaara bhadka sakti hai. Turkey (2021–2022) mein share mein kami ki gayi jis se lira gira aur inflation 85% se tajaaoz kar gaya.

**Ghalat fehmi 3: SBP bank qarz ki sarhon ko seedha control karta hai.**
SBP apni policy rate control karta hai. Commercial bank apni qarz ki sarhein policy rate aur ek spread ki bunyaad par muqarrar karte hain.

**Ghalat fehmi 4: Share badhaana sab ko nuqsaan pahunchata hai.**
Share izaafa qarz lene walon ko nuqsaan deta hai lekin bachaat karne walon ko faida deta hai.`,
    },
    pakistanExample: {
      en: `Pakistan's 2022–2024 rate cycle is one of the most dramatic in the SBP's history:

**Pre-crisis (early 2022):** Policy rate at 7%, with inflation accelerating. The SBP was slow to react — the real rate was deeply negative.

**Rate hike cycle (2022–2023):** Facing a currency crisis, IMF pressure, and inflation spiraling toward 40%, the SBP raised rates aggressively in multiple steps. The policy rate reached **22%** in June 2023.

**The paradox:** At 22% nominal rate vs. 38% inflation, the real rate was still *negative* — meaning the SBP was still technically not tight enough to fully choke inflation. But it couldn't go higher without bankrupting the government (which was paying massive interest on domestic debt) and crushing private sector activity.

**The easing cycle (2024–2025):** As inflation fell sharply (from 38% in May 2023 to single digits by late 2024), the SBP cut rates progressively — back toward 12–13% by end-2024.

**Impact on government finances:** At 22%, the government's interest bill on domestic debt became the single largest expense in the federal budget — exceeding defense and development spending. This illustrates how tight monetary policy, while necessary to restore credibility, has real fiscal costs.`,
      ur: `پاکستان کا 2022–2024 شرح چکر SBP کی تاریخ میں سب سے ڈرامائی میں سے ایک ہے:

**بحران سے پہلے (2022 کے اوائل):** پالیسی ریٹ 7٪ پر، افراطِ زر تیز ہو رہا تھا۔

**شرح اضافہ چکر (2022–2023):** SBP نے پالیسی ریٹ کو کئی مراحل میں **22٪** تک بڑھایا۔

**تضاد:** 22٪ برائے نام ریٹ بنام 38٪ افراطِ زر پر، حقیقی ریٹ اب بھی *منفی* تھا۔

**آسانی کا چکر (2024–2025):** جیسے جیسے افراطِ زر تیزی سے گرا، SBP نے شرحیں بتدریج کم کیں۔

**حکومتی مالیات پر اثر:** 22٪ پر، ملکی قرض پر حکومت کا سود کا بل وفاقی بجٹ میں سب سے بڑا خرچ بن گیا — دفاع اور ترقیاتی اخراجات سے تجاوز کرتے ہوئے۔`,
      rm: `Pakistan ka 2022–2024 share chakkar SBP ki taareekh mein sab se dramatic mein se ek hai:

**Bohran se pehle (2022 ke awaail):** Policy rate 7% par, inflation tez ho raha tha.

**Share izaafa chakkar (2022–2023):** SBP ne policy rate ko kai maraahal mein **22%** tak badhaaya.

**Tazaad:** 22% baraey naam rate banam 38% inflation par, haqeeqi rate ab bhi *manfi* tha.

**Aasani ka chakkar (2024–2025):** Jaise jaise inflation tezi se gira, SBP ne sarhein badreej kam kin.

**Hukoomati maaliyaat par asar:** 22% par, mulki qarz par hukoomat ka sood ka bill wifaaqi bajat mein sab se bara kharch ban gaya.`,
    },
    realWorld: {
      en: `**The US Federal Reserve's 2022–2023 cycle:** The Fed raised rates from near-zero to over 5% — the fastest rate-hiking cycle since the 1980s — to combat 9% inflation. It largely succeeded, bringing inflation back toward 2–3% without triggering a severe recession ("soft landing").

**The ECB's difficult position:** The European Central Bank faces 19 economies with different conditions. A rate that's right for Germany (high inflation) may be too tight for Italy (high debt). This is the challenge of a "one-size-fits-all" monetary policy.

**The lesson from Turkey:** President Erdogan insisted for years that high interest rates *cause* inflation (the opposite of standard economics). The resulting low-rate policy caused the lira to collapse and inflation to hit 85%. When orthodox monetary policy was finally restored under a new central bank governor, inflation began to fall — demonstrating the power of credible, independent central banking.`,
      ur: `**امریکی فیڈرل ریزرو کا 2022–2023 چکر:** Fed نے 9٪ افراطِ زر سے لڑنے کے لیے شرحیں تقریباً صفر سے 5٪ سے زیادہ تک بڑھائیں — 1980ء کی دہائی کے بعد تیز ترین شرح اضافہ چکر۔

**ترکی سے سبق:** صدر اردوان نے برسوں اصرار کیا کہ زیادہ شرح سود *افراطِ زر پیدا کرتا ہے*۔ اس کے نتیجے میں لیرا گرا اور افراطِ زر 85٪ تک پہنچ گیا۔ جب نئے گورنر نے روایتی مالیاتی پالیسی بحال کی، افراطِ زر گرنا شروع ہوا۔`,
      rm: `**Amreeki Federal Reserve ka 2022–2023 chakkar:** Fed ne 9% inflation se larne ke liye sarhein taqreeban sifar se 5% se zyada tak badhaayin — 1980 ki dahai ke baad tez tareen share izaafa chakkar.

**Turkey se sabaq:** Sadr Erdogan ne barson israar kiya ke zyada share sood *inflation paida karta hai*. Is ke nateeji mein lira gira aur inflation 85% tak pahunch gaya. Jab naye governor ne riwayati maaliyaati policy baahal ki, inflation girna shuru hua.`,
    },
    summary: {
      en: `**Key takeaways:**
• The policy rate is the SBP's primary tool — changing it ripples through every loan, bond, and investment in Pakistan
• The SBP's Monetary Policy Committee (MPC) reviews the rate every 8 weeks
• Real policy rate = nominal rate − inflation; the real rate is what actually matters for economic behavior
• Pakistan raised the policy rate to 22% in 2023 — among the highest in Asia — to combat 38% inflation
• At 22%, government interest on domestic debt became the single largest budget item
• As inflation fell sharply in 2024, the SBP began an easing cycle
• Independent central banking (free from political interference) is critical for monetary policy credibility`,
      ur: `**اہم نکات:**
• پالیسی ریٹ SBP کا بنیادی آلہ ہے — اسے تبدیل کرنے سے پاکستان کے ہر قرض، بانڈ اور سرمایہ کاری پر اثر پڑتا ہے
• SBP کی مالیاتی پالیسی کمیٹی (MPC) ہر 8 ہفتوں میں ریٹ کا جائزہ لیتی ہے
• حقیقی پالیسی ریٹ = برائے نام ریٹ − افراطِ زر؛ حقیقی ریٹ وہ ہے جو واقعی اہم ہے
• پاکستان نے 2023 میں 38٪ افراطِ زر سے لڑنے کے لیے پالیسی ریٹ کو 22٪ تک بڑھایا
• آزاد مرکزی بینکاری مالیاتی پالیسی کی ساکھ کے لیے انتہائی اہم ہے`,
      rm: `**Aham nuktaat:**
• Policy rate SBP ka bunyaadi aala hai — ise tabdeel karne se Pakistan ke har qarz, bond aur sarmaya kaari par asar parta hai
• SBP ki Maaliyaati Policy Committee (MPC) har 8 hafte mein rate ka jaiza leti hai
• Haqeeqi policy rate = baraey naam rate − inflation; haqeeqi rate woh hai jo waqi aham hai
• Pakistan ne 2023 mein 38% inflation se larne ke liye policy rate ko 22% tak badhaaya
• Azaad markazi banking maaliyaati policy ki saakht ke liye intehai aham hai`,
    },
  },
  quiz: [
    {
      question: {
        en: "What is KIBOR and how does it relate to the policy rate?",
        ur: "KIBOR کیا ہے اور یہ پالیسی ریٹ سے کیسے متعلق ہے؟",
        rm: "KIBOR kya hai aur yeh policy rate se kaise muta'alliq hai?",
      },
      options: [
        { en: "It is the same as the policy rate", ur: "یہ پالیسی ریٹ کے برابر ہے", rm: "Yeh policy rate ke baraabar hai" },
        { en: "The rate banks charge each other, anchored to the policy rate", ur: "بینک ایک دوسرے سے جو شرح لیتے ہیں، پالیسی ریٹ سے منسلک", rm: "Bank ek doosre se jo share lete hain, policy rate se mansoob" },
        { en: "The rate banks pay on savings accounts", ur: "بینک بچت اکاؤنٹس پر جو شرح ادا کرتے ہیں", rm: "Bank bachat accounts par jo share ada karte hain" },
        { en: "The IMF's benchmark rate for Pakistan", ur: "پاکستان کے لیے IMF کی معیاری شرح", rm: "Pakistan ke liye IMF ki mi'yaari share" },
      ],
      correctIndex: 1,
      explanation: {
        en: "KIBOR (Karachi Interbank Offered Rate) is the rate Pakistani banks charge each other for short-term loans. It moves very closely with the SBP policy rate and serves as the benchmark for most corporate loans in Pakistan.",
        ur: "KIBOR (کراچی انٹربینک آفرڈ ریٹ) وہ شرح ہے جو پاکستانی بینک قلیل مدتی قرضوں کے لیے ایک دوسرے سے لیتے ہیں۔ یہ SBP پالیسی ریٹ کے ساتھ قریب سے حرکت کرتا ہے۔",
        rm: "KIBOR (Karachi Interbank Offered Rate) woh share hai jo Pakistani bank qaleel muddat ke qarzoon ke liye ek doosre se lete hain. Yeh SBP policy rate ke saath qareeb se harkat karta hai.",
      },
    },
    {
      question: {
        en: "How often does the SBP's Monetary Policy Committee review the policy rate?",
        ur: "SBP کی مالیاتی پالیسی کمیٹی پالیسی ریٹ کا جائزہ کتنی بار لیتی ہے؟",
        rm: "SBP ki Maaliyaati Policy Committee policy rate ka jaiza kitni baar leti hai?",
      },
      options: [
        { en: "Every month", ur: "ہر ماہ", rm: "Har maah" },
        { en: "Every 8 weeks", ur: "ہر 8 ہفتوں میں", rm: "Har 8 hafte mein" },
        { en: "Every quarter", ur: "ہر سہ ماہی", rm: "Har seh maahi" },
        { en: "Once a year", ur: "سال میں ایک بار", rm: "Saal mein ek baar" },
      ],
      correctIndex: 1,
      explanation: {
        en: "The SBP's Monetary Policy Committee (MPC) meets every 8 weeks (approximately 6 times per year) to review the policy rate and issue a Monetary Policy Statement.",
        ur: "SBP کی مالیاتی پالیسی کمیٹی (MPC) پالیسی ریٹ کا جائزہ لینے اور مالیاتی پالیسی بیان جاری کرنے کے لیے ہر 8 ہفتوں میں (سالانہ تقریباً 6 بار) ملتی ہے۔",
        rm: "SBP ki Maaliyaati Policy Committee (MPC) policy rate ka jaiza lene aur Maaliyaati Policy Bayaan jaari karne ke liye har 8 hafte mein (saalana taqreeban 6 baar) milti hai.",
      },
    },
    {
      question: {
        en: "In Pakistan's 2022–2023 rate cycle, what was the peak policy rate?",
        ur: "پاکستان کے 2022–2023 شرح چکر میں، پالیسی ریٹ کی بلند ترین سطح کیا تھی؟",
        rm: "Pakistan ke 2022–2023 share chakkar mein, policy rate ki buland tareen satah kya thi?",
      },
      options: [
        { en: "13%", ur: "13٪", rm: "13%" },
        { en: "17%", ur: "17٪", rm: "17%" },
        { en: "22%", ur: "22٪", rm: "22%" },
        { en: "28%", ur: "28٪", rm: "28%" },
      ],
      correctIndex: 2,
      explanation: {
        en: "Pakistan's policy rate peaked at 22% in June 2023 — the highest level in decades — as the SBP aggressively tightened to combat CPI inflation that had reached 38%.",
        ur: "پاکستان کی پالیسی ریٹ جون 2023 میں 22٪ پر اپنی چوٹی پر پہنچی — کئی دہائیوں میں بلند ترین سطح — جب SBP نے 38٪ تک پہنچنے والی CPI افراطِ زر سے لڑنے کے لیے جارحانہ طریقے سے سختی کی۔",
        rm: "Pakistan ki policy rate June 2023 mein 22% par apni choti par pahunchi — kai dahaion mein buland tareen satah — jab SBP ne 38% tak pahunchne wali CPI inflation se larne ke liye jaarchanaana tareeqe se sakhti ki.",
      },
    },
    {
      question: {
        en: "If inflation is 20% and the policy rate is 15%, what is the real policy rate?",
        ur: "اگر افراطِ زر 20٪ ہو اور پالیسی ریٹ 15٪ ہو، تو حقیقی پالیسی ریٹ کیا ہے؟",
        rm: "Agar inflation 20% ho aur policy rate 15% ho, to haqeeqi policy rate kya hai?",
      },
      options: [
        { en: "+5%", ur: "+5٪", rm: "+5%" },
        { en: "0%", ur: "0٪", rm: "0%" },
        { en: "−5%", ur: "−5٪", rm: "−5%" },
        { en: "35%", ur: "35٪", rm: "35%" },
      ],
      correctIndex: 2,
      explanation: {
        en: "Real policy rate = nominal rate − inflation = 15% − 20% = −5%. A negative real rate means monetary policy is actually accommodative (loose) even if the nominal rate looks high. This was Pakistan's situation through much of 2022.",
        ur: "حقیقی پالیسی ریٹ = برائے نام ریٹ − افراطِ زر = 15٪ − 20٪ = −5٪۔ منفی حقیقی ریٹ کا مطلب ہے کہ مالیاتی پالیسی دراصل سہولت بخش (ڈھیلی) ہے۔ یہ 2022 کے بڑے حصے میں پاکستان کی صورتحال تھی۔",
        rm: "Haqeeqi policy rate = baraey naam rate − inflation = 15% − 20% = −5%. Manfi haqeeqi rate ka matlab hai ke maaliyaati policy dara'sl sahoolat bakhsh (dheeli) hai. Yeh 2022 ke bare hisse mein Pakistan ki surat e haal thi.",
      },
    },
  ],
  faq: [
    {
      question: {
        en: "What is the difference between the policy rate and the discount rate?",
        ur: "پالیسی ریٹ اور ڈسکاؤنٹ ریٹ میں کیا فرق ہے؟",
        rm: "Policy rate aur discount rate mein kya farq hai?",
      },
      answer: {
        en: "In Pakistan's context, these terms are often used interchangeably. The SBP's policy rate (formerly called the discount rate) is the rate at which the SBP lends to commercial banks overnight. The SBP rebranded it 'policy rate' to signal a more modern, corridor-based monetary framework.",
        ur: "پاکستان کے سیاق و سباق میں، یہ اصطلاحات اکثر ایک دوسرے کے بدلے میں استعمال ہوتی ہیں۔ SBP کی پالیسی ریٹ (پہلے ڈسکاؤنٹ ریٹ کہلائی جاتی تھی) وہ شرح ہے جس پر SBP کمرشل بینکوں کو راتوں رات قرض دیتا ہے۔",
        rm: "Pakistan ke siyaaq-o-sabaaq mein, yeh istilaahat aksar ek doosre ke badlay mein istemal hoti hain. SBP ki policy rate (pehle discount rate kehlaai jaati thi) woh share hai jis par SBP commercial bankoon ko raaton raat qarz deta hai.",
      },
    },
    {
      question: {
        en: "How does the policy rate affect house prices and mortgages in Pakistan?",
        ur: "پالیسی ریٹ پاکستان میں گھروں کی قیمتوں اور رہن پر کیسے اثر ڈالتی ہے؟",
        rm: "Policy rate Pakistan mein gharon ki qeematon aur rahn par kaise asar daalti hai?",
      },
      answer: {
        en: "A higher policy rate raises mortgage lending rates, making it more expensive to buy a home on credit. This reduces demand for housing, putting downward pressure on property prices — or at least slowing price growth. Conversely, low policy rates can fuel property booms (as in Pakistan during 2020–2022 when subsidized housing schemes coincided with low rates). However, Pakistan's mortgage market is small relative to GDP, so the direct effect is weaker than in the UK or US.",
        ur: "زیادہ پالیسی ریٹ رہن قرض کی شرحیں بڑھاتی ہے، جس سے قرض پر گھر خریدنا مہنگا ہو جاتا ہے۔ کم پالیسی ریٹ جائداد کی تیزی کو ہوا دے سکتی ہے۔ تاہم، پاکستان کا رہن بازار GDP کے مقابلے میں چھوٹا ہے۔",
        rm: "Zyada policy rate rahn qarz ki sarhein barhati hai, jis se qarz par ghar khareedna mahnga ho jaata hai. Kam policy rate jaidad ki tezi ko hawa de sakti hai. Taham, Pakistan ka rahn baazaar GDP ke muqablay mein chota hai.",
      },
    },
    {
      question: {
        en: "Is the SBP truly independent from the government?",
        ur: "کیا SBP واقعی حکومت سے آزاد ہے؟",
        rm: "Kya SBP waqi hukoomat se azaad hai?",
      },
      answer: {
        en: "The SBP Act 2021 (passed as part of an IMF condition) significantly strengthened the SBP's legal independence: the government can no longer borrow directly from the SBP, the Governor has a fixed term, and the MPC has operational autonomy. However, formal independence and actual independence can differ — political pressure on institutions remains a structural challenge in Pakistan. The degree of de-facto independence is best judged by watching decisions made in politically difficult moments.",
        ur: "SBP ایکٹ 2021 (IMF شرط کے طور پر منظور) نے SBP کی قانونی آزادی کو نمایاں طور پر مضبوط کیا: حکومت اب SBP سے براہ راست قرض نہیں لے سکتی، گورنر کی ایک مقررہ مدت ہے، اور MPC کو عملیاتی خودمختاری ہے۔",
        rm: "SBP Act 2021 (IMF shart ke tor par manzoor) ne SBP ki qaanooni azaadi ko numaayaan tor par mazboot kiya: hukoomat ab SBP se seedha qarz nahi le sakti, Governor ki ek muqarrara muddat hai, aur MPC ko amaliyaati khud mukhtaari hai.",
      },
    },
  ],
};
