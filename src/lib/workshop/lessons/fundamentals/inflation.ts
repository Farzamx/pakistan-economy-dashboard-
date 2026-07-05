import type { Lesson } from "@/lib/workshop/types";

export const inflationLesson: Lesson = {
  slug: "inflation",
  category: "fundamentals",
  title: {
    en: "Understanding Inflation",
    ur: "افراطِ زر کو سمجھیں",
    rm: "Inflation Ko Samjhein",
  },
  subtitle: {
    en: "What drives prices up — and why it matters for every Pakistani",
    ur: "قیمتیں کیوں بڑھتی ہیں — اور یہ ہر پاکستانی کے لیے کیوں اہم ہے",
    rm: "Qeematen kyun barhti hain — aur yeh har Pakistani ke liye kyun aham hai",
  },
  level: "beginner",
  readMinutes: 8,
  isPremium: false,
  relatedIndicatorSlugs: [
    "cpi-inflation-pakistan",
    "core-inflation-pakistan",
    "weekly-inflation-pakistan",
  ],
  content: {
    explanation: {
      en: `Inflation is the rate at which the general level of prices for goods and services rises over time, eroding purchasing power. When inflation is high, each rupee buys less than it did before.

Pakistan measures inflation primarily through the Consumer Price Index (CPI), which tracks a basket of everyday goods — food, clothing, housing, transport, and utilities — across urban and rural households.

The State Bank of Pakistan (SBP) targets a medium-term inflation rate of 5–7%. When actual inflation far exceeds this target, as it did in 2023 when CPI peaked at over 38%, the real value of savings, wages, and fixed-income contracts falls sharply.

There are three main types:
• **Demand-pull inflation** — too much money chasing too few goods (classic overheating)
• **Cost-push inflation** — rising input costs (energy, raw materials) passed to consumers
• **Built-in inflation** — wage-price spiral where workers demand higher pay, raising production costs

Pakistan's inflation is heavily driven by food prices (which have a 34% weight in the CPI basket) and energy costs (gas, electricity tariffs set by OGRA and NEPRA).`,

      ur: `افراطِ زر وہ شرح ہے جس پر اشیاء اور خدمات کی قیمتیں وقت کے ساتھ بڑھتی ہیں، اور اس سے خریداری کی قوت کم ہوتی ہے۔ جب افراطِ زر زیادہ ہو، تو ہر روپیہ پہلے سے کم خریدتا ہے۔

پاکستان میں افراطِ زر بنیادی طور پر صارف قیمت اشاریہ (CPI) سے ماپا جاتا ہے، جو روزمرہ کی اشیاء — خوراک، کپڑے، رہائش، نقل و حمل، اور یوٹیلیٹیز — کی قیمتوں کو شہری اور دیہی گھرانوں میں ٹریک کرتا ہے۔

اسٹیٹ بینک آف پاکستان (SBP) درمیانی مدت کے لیے 5–7٪ افراطِ زر کو ہدف مانتا ہے۔ جب حقیقی افراطِ زر اس ہدف سے بہت زیادہ ہو جائے، جیسا کہ 2023 میں ہوا جب CPI 38٪ سے تجاوز کر گئی، تو بچت، اجرتیں، اور مقررہ آمدنی کی حقیقی قدر تیزی سے گرتی ہے۔

تین اہم اقسام:
• **طلب کھینچنے والا افراطِ زر** — بہت زیادہ پیسہ، بہت کم اشیاء
• **لاگت دھکیلنے والا افراطِ زر** — توانائی اور خام مال کی بڑھتی قیمتیں
• **مستقل افراطِ زر** — اجرت اور قیمتوں کا چکر`,

      rm: `Inflation wo rate hai jis par cheezein aur khadamaat ki qeematen waqt ke saath barhti hain, aur isse khareedari ki quwwat kam hoti hai. Jab inflation zyada ho, to har rupaya pehle se kam khareedta hai.

Pakistan mein inflation bunyaadi tor par Consumer Price Index (CPI) se mapaa jaata hai, jo roz marra ki cheezein — khaana, kaprey, rahaaish, naql-o-hamal, aur utilities — ki qeematon ko shahri aur dehaati gharanon mein track karta hai.

State Bank of Pakistan (SBP) darmiyanī muddat ke liye 5–7% inflation ko hadaf maanta hai. Jab asli inflation is hadaf se bahut zyada ho jaye, jaisa ke 2023 mein hua jab CPI 38% se tajaaoz kar gayi, to bachaat, ujraten, aur muqarrar aamdani ki asli qemat tezi se girti hai.

Teen aham iqsaam:
• **Maang kheenchne wala inflation** — bahut zyada paisa, bahut kam cheezein
• **Lagat dhakelnay wala inflation** — energy aur kham maal ki barhti qeematen
• **Mustaqil inflation** — ujrat aur qeemat ka chakkar`,
    },

    pakistanExample: {
      en: `In FY2023, Pakistan experienced a perfect storm of inflation drivers:

**Energy prices:** Electricity tariffs were revised upward by over 40% as the government reduced power subsidies under the IMF program. Gas prices followed, pushing transport and manufacturing costs sharply higher.

**Rupee depreciation:** The PKR fell from ~178/USD in April 2022 to ~285/USD by mid-2023 — a 60% collapse. Since Pakistan imports energy, edible oil, fertiliser, and industrial inputs, every rupee of depreciation directly raised domestic costs.

**Food prices:** Floods in 2022 destroyed roughly one-third of Pakistan's standing crops, especially cotton, sugarcane, and vegetables. This supply shock hit the CPI's 34%-weighted food basket hard.

**Fiscal deficit monetisation:** Prior to the IMF program, the government relied on borrowing from the SBP (printing money), expanding the money supply and adding demand-side pressure.

Result: CPI peaked at 38.0% YoY in May 2023 — the highest reading since the 1970s.`,

      ur: `مالی سال 2023 میں پاکستان نے افراطِ زر کے عوامل کا طوفان دیکھا:

**توانائی کی قیمتیں:** بجلی کے نرخ 40٪ سے زیادہ بڑھائے گئے جب حکومت نے IMF پروگرام کے تحت بجلی کی سبسڈی کم کی۔

**روپے کی قدر میں کمی:** PKR اپریل 2022 میں 178/USD سے گر کر 2023 کے وسط میں 285/USD ہو گیا — 60٪ کا زوال۔ چونکہ پاکستان توانائی، خوردنی تیل، کھاد، اور صنعتی خام مال درآمد کرتا ہے، اس لیے روپے کی ہر گراوٹ نے ملکی اخراجات بڑھائے۔

**خوراک کی قیمتیں:** 2022 کے سیلاب نے پاکستان کی فصلوں کا تقریباً ایک تہائی تباہ کر دیا، خاص طور پر کپاس، گنا، اور سبزیاں۔

نتیجہ: CPI مئی 2023 میں 38.0٪ سالانہ — 1970 کی دہائی کے بعد بلند ترین سطح — پر پہنچ گئی۔`,

      rm: `Maali Saal 2023 mein Pakistan ne inflation ke asbab ka toofaan dekha:

**Energy ki qeematen:** Bijli ke narkh 40% se zyada badhaye gaye jab hukoomat ne IMF program ke tahat bijli ki subsidy kam ki.

**Rupee ki qemat mein kami:** PKR April 2022 mein 178/USD se gir kar 2023 ke wast mein 285/USD ho gaya — 60% ka zawal.

**Khaane ki qeematen:** 2022 ke sailaab ne Pakistan ki faslon ka taqreeban ek tihaai tabah kar diya, khaaskar kapas, ganna, aur sabziyan.

Nateeja: CPI May 2023 mein 38.0% saalana — 1970 ki dahai ke baad buland tareen satah — par pahunch gayi.`,
    },

    realWorld: {
      en: `Turkey's 2021–2022 hyperinflation episode is an instructive parallel. The Turkish government, under political pressure, cut interest rates despite rising inflation — the opposite of standard central banking. The lira collapsed and inflation exceeded 85% by late 2022, forcing a policy reversal.

Argentina has battled chronic inflation for decades. In 2023, annual CPI topped 211%, driven by fiscal deficits monetised by the central bank. The government introduced a "shock therapy" program in late 2023, cutting subsidies and devaluing the peso.

The common thread: monetary financing of deficits + supply shocks = inflation spirals that are very difficult to reverse without significant economic pain. Pakistan's 2022–2023 episode followed the same pattern, and the IMF-backed stabilization program — higher rates, subsidy cuts, PKR float — was painful but necessary to break the spiral.`,

      ur: `ترکی کا 2021–2022 کا افراطِ زر کا واقعہ ایک سبق آموز مثال ہے۔ ترک حکومت نے سیاسی دباؤ میں شرح سود کم کی جبکہ افراطِ زر بڑھ رہا تھا — معیاری مرکزی بینکنگ کے برعکس۔ لیرا گرا اور افراطِ زر 2022 کے آخر تک 85٪ سے تجاوز کر گیا۔

ارجنٹینا نے کئی دہائیوں سے دائمی افراطِ زر سے لڑی ہے۔ 2023 میں سالانہ CPI 211٪ سے تجاوز کر گئی۔

مشترک نکتہ: مالیاتی خسارے کی مالیاتی فنانسنگ + رسد کے جھٹکے = افراطِ زر کا چکر جسے توڑنا بہت مشکل ہے۔`,

      rm: `Turkey ka 2021–2022 ka inflation ka waqia ek sabaq aamoz misaal hai. Turkish hukoomat ne siyasi dabaao mein share sood kam kiya jabke inflation barh raha tha — maiyaari markazi banking ke bar-aks. Lira gira aur inflation 2022 ke aakhir tak 85% se tajaaoz kar gaya.

Argentina ne kai dahaion se daimi inflation se larhai ki hai. 2023 mein saalana CPI 211% se tajaaoz kar gayi.

Mushtarak nuktah: maali khassaray ki monetary financing + rasad ke jhatke = inflation ka chakkar jise torhna bahut mushkil hai.`,
    },

    whyTraders: {
      en: `Traders watch monthly CPI releases closely because inflation data directly moves:

**Bond yields:** Higher-than-expected inflation → SBP likely to hold or hike rates → PIB (Pakistan Investment Bond) prices fall, yields rise. Lower CPI surprise → rate cut expectations → bond prices rally.

**PKR/USD:** Persistent high inflation erodes the real value of the rupee, creating pressure for nominal depreciation. Traders position ahead of SBP MPC meetings using CPI data as a key input.

**Equities (KSE-100):** High inflation raises cost of goods and borrowing costs. Consumer and industrial companies see margin compression. Banks may benefit short-term from higher spreads but face NPL risk if the economy slows.

**Timing:** CPI is released monthly by the Pakistan Bureau of Statistics (PBS), usually in the second week of the following month. The SBP MPC meets 8 times per year — CPI data released ~2 weeks before an MPC meeting is the most market-moving.`,

      ur: `تاجر ماہانہ CPI اجراء کو قریب سے دیکھتے ہیں کیونکہ افراطِ زر کا ڈیٹا براہ راست ان چیزوں کو متحرک کرتا ہے:

**بانڈ منافع:** توقع سے زیادہ افراطِ زر → SBP کا شرح سود برقرار رکھنے یا بڑھانے کا امکان → PIB قیمتیں گریں، منافع بڑھے۔

**PKR/USD:** مستقل بلند افراطِ زر روپے کی حقیقی قدر کو کمزور کرتا ہے، جو اسمی قدر میں کمی کا دباؤ بناتا ہے۔

**حصص (KSE-100):** بلند افراطِ زر اشیاء اور قرض کی لاگت بڑھاتا ہے۔ صارف اور صنعتی کمپنیاں مارجن کا دباؤ دیکھتی ہیں۔`,

      rm: `Trader maahana CPI ijaraay ko qareeb se dekhte hain kyunke inflation ka data seedha in cheezon ko mutaharrik karta hai:

**Bond munafa:** Umeed se zyada inflation → SBP ka share sood barqarar rakhne ya badhane ka imkaan → PIB qeematen giren, munafa barhey.

**PKR/USD:** Mustaqil buland inflation rupay ki haqeeqi qemat ko kamzor karta hai, jo asmi qemat mein kami ka dabaao banata hai.

**Hissas (KSE-100):** Buland inflation cheezein aur qarz ki lagat barhata hai. Consumers aur sanat ki companies margin ka dabaao dekhti hain.`,
    },

    whyInvestors: {
      en: `Long-term investors care about inflation for three core reasons:

**Real return erosion:** If your bank deposit earns 20% but inflation is 25%, your real return is –5%. You're losing purchasing power even while earning nominal interest. This was Pakistan's reality through most of 2022–2023.

**Asset class selection:** In high-inflation environments, real assets (gold, property, commodity-linked equities) historically preserve value better than fixed-income instruments. Equities can be an inflation hedge if companies can pass through costs.

**SBP policy implications:** The SBP's primary mandate includes price stability. High inflation forces rate hikes, which increase the discount rate used in equity valuation models — compressing price/earnings multiples.

**Pakistan-specific risk:** Structural inflation — driven by energy subsidies, circular debt, and weak fiscal position — means Pakistan's real interest rates have historically been negative for extended periods. Investors must account for this when sizing bond allocations versus equity or real-asset exposure.`,

      ur: `طویل مدتی سرمایہ کار افراطِ زر کی تین بنیادی وجوہات کی بنا پر پرواہ کرتے ہیں:

**حقیقی منافع کا کٹاؤ:** اگر آپ کا بینک ڈیپازٹ 20٪ کماتا ہے لیکن افراطِ زر 25٪ ہے، تو آپ کا حقیقی منافع –5٪ ہے۔

**اثاثہ جات کا انتخاب:** بلند افراطِ زر میں، حقیقی اثاثے (سونا، جائیداد) تاریخی طور پر ثابت آمدنی کے آلات سے بہتر قدر محفوظ رکھتے ہیں۔

**SBP پالیسی کے مضمرات:** SBP کا بنیادی مینڈیٹ قیمتوں کا استحکام ہے۔ بلند افراطِ زر شرح میں اضافہ کرتا ہے، جو حصص کی تشخیص کو دباتا ہے۔`,

      rm: `Taweeel muddat ke sarmayakaar inflation ki teen bunyaadi wajuhaat ki bina par parwa karte hain:

**Haqeeqi munafa ka kataao:** Agar aapka bank deposit 20% kamata hai lekin inflation 25% hai, to aapka haqeeqi munafa –5% hai.

**Asasajaat ka intikhaab:** Buland inflation mein, haqeeqi asasay (sona, jaidad) taareekhan saabit aamdani ke aalaat se behtar qemat mehfooz rakhte hain.

**SBP policy ke mazaameen:** SBP ka bunyaadi mandate qeematon ka istehkaam hai. Buland inflation share mein izaafa karta hai, jo hissas ki tashkhees ko dabata hai.`,
    },
  },

  faq: [
    {
      question: {
        en: "What is the difference between CPI and core inflation?",
        ur: "CPI اور بنیادی افراطِ زر میں کیا فرق ہے؟",
        rm: "CPI aur bunyaadi inflation mein kya farq hai?",
      },
      answer: {
        en: "CPI measures the change in prices of a full basket of goods including food and energy. Core inflation strips out food and energy — the most volatile components — to reveal the underlying trend. SBP uses core inflation to assess whether inflation is structural or driven by temporary supply shocks.",
        ur: "CPI خوراک اور توانائی سمیت تمام اشیاء کی قیمتوں کی تبدیلی ماپتا ہے۔ بنیادی افراطِ زر خوراک اور توانائی کو نکال کر بنیادی رجحان ظاہر کرتا ہے۔ SBP اسے استعمال کرتا ہے یہ جاننے کے لیے کہ آیا افراطِ زر ساختی ہے یا عارضی۔",
        rm: "CPI khaana aur energy samet tamam cheezeen ki qeematon ki tabdeeli mapata hai. Bunyaadi inflation khaana aur energy ko nikal kar bunyaadi rujhaan zahir karta hai. SBP ise istemal karta hai yeh jaanne ke liye ke aya inflation saakhtaati hai ya arzi.",
      },
    },
    {
      question: {
        en: "Why does food have such a large weight in Pakistan's CPI?",
        ur: "پاکستان کے CPI میں خوراک کا وزن اتنا زیادہ کیوں ہے؟",
        rm: "Pakistan ke CPI mein khaane ka wazan itna zyada kyun hai?",
      },
      answer: {
        en: "Pakistan's PBS sets CPI weights based on household expenditure surveys. Lower-income Pakistani households spend a larger share of their income on food than higher-income households. Since Pakistan's income distribution is skewed toward lower incomes, food ends up with roughly 34% weight versus around 14% in the US CPI. This means food price shocks hit Pakistan's CPI — and poor households — disproportionately hard.",
        ur: "PBS گھریلو اخراجات کے سروے کی بنیاد پر CPI وزن مقرر کرتا ہے۔ کم آمدنی والے پاکستانی گھرانے اپنی آمدنی کا بڑا حصہ خوراک پر خرچ کرتے ہیں۔ اس لیے خوراک کو تقریباً 34٪ وزن ملتا ہے جبکہ امریکی CPI میں صرف 14٪ ہے۔",
        rm: "PBS gharelu ikhraajaaat ke survey ki bunyaad par CPI wazan muqarrar karta hai. Kam aamdani wale Pakistani gharane apni aamdani ka bara hissa khaane par kharch karte hain. Isliye khaane ko taqreeban 34% wazan milta hai jabke Amreeki CPI mein sirf 14% hai.",
      },
    },
    {
      question: {
        en: "How does the SBP fight inflation?",
        ur: "SBP افراطِ زر کا مقابلہ کیسے کرتا ہے؟",
        rm: "SBP inflation ka muqabala kaise karta hai?",
      },
      answer: {
        en: "The SBP's primary tool is the policy rate (currently the target rate for the overnight interbank market). Raising the policy rate makes borrowing more expensive — this cools demand (demand-pull) and signals the SBP's commitment to price stability (anchoring expectations). The SBP also uses open market operations (OMOs) to manage liquidity and has macroprudential tools. However, it cannot directly combat cost-push inflation from energy prices — that requires fiscal and structural reform.",
        ur: "SBP کا بنیادی آلہ پالیسی ریٹ ہے۔ پالیسی ریٹ بڑھانے سے قرض مہنگا ہوتا ہے — یہ طلب کو ٹھنڈا کرتا ہے اور قیمتی استحکام کے عزم کا اشارہ دیتا ہے۔ تاہم، SBP توانائی کی قیمتوں سے پیدا ہونے والے لاگت دھکیلنے والے افراطِ زر کا براہ راست مقابلہ نہیں کر سکتا۔",
        rm: "SBP ka bunyaadi aala policy rate hai. Policy rate badhane se qarz mahnga hota hai — yeh talab ko thanda karta hai aur qeemati istehkaam ke azm ka ishara deta hai. Taham, SBP energy ki qeematon se paida hone wale inflation ka seedha muqabala nahi kar sakta — iske liye maali aur saakhtaati islaah chahiye.",
      },
    },
    {
      question: {
        en: "Is deflation better than inflation?",
        ur: "کیا تنزلِ قیمت افراطِ زر سے بہتر ہے؟",
        rm: "Kya deflation inflation se behtar hai?",
      },
      answer: {
        en: "Not necessarily. While deflation means prices fall, it can trigger a dangerous spiral: consumers delay purchases expecting lower prices tomorrow, businesses cut production, unemployment rises, and the economy contracts. Japan's 'lost decade' in the 1990s was partly caused by deflationary expectations. Moderate inflation (2–5%) is generally considered healthy as it encourages spending and investment. Pakistan's challenge is not deflation — it is bringing high inflation back to a moderate, stable range.",
        ur: "ضروری نہیں۔ تنزلِ قیمت کا مطلب ہے قیمتیں گریں، لیکن یہ ایک خطرناک چکر کو متحرک کر سکتا ہے: صارفین خریداری ملتوی کرتے ہیں، کاروبار پیداوار کم کرتے ہیں، اور معیشت سکڑتی ہے۔ معتدل افراطِ زر (2–5٪) عموماً صحت مند سمجھا جاتا ہے۔",
        rm: "Zaroori nahi. Deflation ka matlab hai qeematen giren, lekin yeh ek khatarnaak chakkar ko mutaharrik kar sakta hai: consumers kharidari mualtwi karte hain, karobaar paida war kam karte hain, aur maashiyat sikarhti hai. Mutadil inflation (2–5%) aamtaur par sehat mand samjha jaata hai.",
      },
    },
  ],
};
