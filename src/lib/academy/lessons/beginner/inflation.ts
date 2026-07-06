import type { Lesson } from "@/lib/academy/types";

export const inflationLesson: Lesson = {
  slug: "inflation",
  category: "beginner",
  title: { en: "Understanding Inflation", ur: "افراطِ زر کو سمجھیں", rm: "Inflation Ko Samjhein" },
  subtitle: {
    en: "What drives prices up — and why it matters for every Pakistani",
    ur: "قیمتیں کیوں بڑھتی ہیں — اور یہ ہر پاکستانی کے لیے کیوں اہم ہے",
    rm: "Qeematen kyun barhti hain — aur yeh har Pakistani ke liye kyun aham hai",
  },
  level: "beginner",
  readMinutes: 10,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-inflation-pakistan", "core-inflation-pakistan", "weekly-inflation-pakistan"],
  relatedLessonSlugs: ["gdp", "policy-rate", "cpi"],
  content: {
    overview: {
      en: "Inflation is the rate at which the general level of prices rises over time, eroding purchasing power. This lesson explains what inflation is, how Pakistan measures it, why it gets so high, and what the government and SBP do about it.",
      ur: "افراطِ زر وہ شرح ہے جس پر قیمتیں وقت کے ساتھ بڑھتی ہیں اور خریداری کی قوت کم کرتی ہیں۔ یہ سبق وضاحت کرتا ہے کہ افراطِ زر کیا ہے، پاکستان اسے کیسے ماپتا ہے، یہ اتنا زیادہ کیوں ہوتا ہے، اور حکومت اور SBP اس بارے میں کیا کرتے ہیں۔",
      rm: "Inflation wo rate hai jis par qeematen waqt ke saath barhti hain aur khareedari ki quwwat kam karti hain. Yeh sabaq wazaahat karta hai ke inflation kya hai, Pakistan ise kaise mapata hai, yeh itna zyada kyun hota hai, aur hukoomat aur SBP is baray mein kya karte hain.",
    },
    whyItMatters: {
      en: `Inflation is not just an abstract statistic — it directly determines how far your rupee stretches at the grocery store, whether your savings grow or shrink in real terms, and whether businesses can plan for the future.

When inflation is high, the poorest households suffer most because they spend the largest share of their income on food and energy — exactly the categories that tend to rise fastest. That is why Pakistan's 2022–2023 inflation crisis was not just an economic event: it was a social one, driving millions deeper into poverty.

For investors and businesses, inflation determines real returns on bonds, borrowing costs for expansion, and whether holding cash destroys or preserves wealth.`,
      ur: `افراطِ زر محض ایک تجریدی اعداد و شمار نہیں — یہ براہ راست طے کرتا ہے کہ آپ کا روپیہ گروسری اسٹور پر کتنا کام آتا ہے، آپ کی بچت حقیقی معنوں میں بڑھتی ہے یا سکڑتی ہے، اور کاروبار مستقبل کی منصوبہ بندی کر سکتے ہیں یا نہیں۔

جب افراطِ زر زیادہ ہو، تو غریب ترین گھرانے سب سے زیادہ تکلیف اٹھاتے ہیں کیونکہ وہ اپنی آمدنی کا سب سے بڑا حصہ خوراک اور توانائی پر خرچ کرتے ہیں۔`,
      rm: `Inflation محض ek tajreedi adaad nahin — yeh seedha tay karta hai ke aapka rupaya grocery store par kitna kaam aata hai, aapki bachaat haqeeqi ma'anon mein barhti hai ya sikarti hai, aur karobaar mustaqbil ki mansooba bandi kar sakte hain ya nahi.

Jab inflation zyada ho, to ghareeb tareen gharane sab se zyada takleef uthaate hain kyunke woh apni aamdani ka sab se bara hissa khaane aur energy par kharch karte hain.`,
    },
    explanation: {
      en: `Inflation is the rate at which the general level of prices for goods and services rises over time, eroding purchasing power. When inflation is high, each rupee buys less than it did before.

Pakistan measures inflation primarily through the **Consumer Price Index (CPI)**, which tracks a basket of everyday goods — food, clothing, housing, transport, and utilities — across urban and rural households.

The State Bank of Pakistan (SBP) targets a medium-term inflation rate of 5–7%. When actual inflation far exceeds this target, as it did in 2023 when CPI peaked at over 38%, the real value of savings, wages, and fixed-income contracts falls sharply.

There are three main types:
• **Demand-pull inflation** — too much money chasing too few goods (classic overheating)
• **Cost-push inflation** — rising input costs (energy, raw materials) passed to consumers
• **Built-in inflation** — wage-price spiral where workers demand higher pay, raising production costs

Pakistan's inflation is heavily driven by food prices (which have a **34% weight** in the CPI basket) and energy costs (gas, electricity tariffs set by OGRA and NEPRA).`,
      ur: `افراطِ زر وہ شرح ہے جس پر اشیاء اور خدمات کی قیمتیں وقت کے ساتھ بڑھتی ہیں، اور اس سے خریداری کی قوت کم ہوتی ہے۔ جب افراطِ زر زیادہ ہو، تو ہر روپیہ پہلے سے کم خریدتا ہے۔

پاکستان میں افراطِ زر بنیادی طور پر **صارف قیمت اشاریہ (CPI)** سے ماپا جاتا ہے، جو روزمرہ کی اشیاء کی قیمتوں کو شہری اور دیہی گھرانوں میں ٹریک کرتا ہے۔

اسٹیٹ بینک آف پاکستان (SBP) درمیانی مدت کے لیے 5–7٪ افراطِ زر کو ہدف مانتا ہے۔ جب حقیقی افراطِ زر اس ہدف سے بہت زیادہ ہو جائے، جیسا کہ 2023 میں ہوا جب CPI 38٪ سے تجاوز کر گئی، تو بچت اور اجرتوں کی حقیقی قدر تیزی سے گرتی ہے۔

تین اہم اقسام:
• **طلب کھینچنے والا افراطِ زر** — بہت زیادہ پیسہ، بہت کم اشیاء
• **لاگت دھکیلنے والا افراطِ زر** — توانائی اور خام مال کی بڑھتی قیمتیں
• **مستقل افراطِ زر** — اجرت اور قیمتوں کا چکر`,
      rm: `Inflation wo rate hai jis par cheezein aur khadamaat ki qeematen waqt ke saath barhti hain. Pakistan mein inflation bunyaadi tor par **Consumer Price Index (CPI)** se mapaa jaata hai, jo roz marra ki cheezein — khaana, kaprey, rahaaish, naql-o-hamal, utilities — track karta hai.

SBP darmiyanī muddat ke liye 5–7% inflation ko hadaf maanta hai. 2023 mein CPI 38% se tajaaoz kar gayi — SBP aur hukoomat ne sakht iqdaamaat uthaaye.

Teen iqsaam:
• **Maang kheenchne wala inflation** — bahut zyada paisa, bahut kam cheezein
• **Lagat dhakelnay wala inflation** — energy aur kham maal ki barhti qeematen
• **Mustaqil inflation** — ujrat aur qeemat ka chakkar`,
    },
    misconceptions: {
      en: `**Myth 1: Inflation is always bad.**
Moderate inflation (2–5%) is actually healthy. It encourages spending and investment, prevents a deflationary spiral, and gives central banks room to cut rates during recessions. The problem is *high* or *unpredictable* inflation.

**Myth 2: The government causes inflation by "printing money."**
While monetary financing of deficits (SBP directly lending to the government) is inflationary, most modern inflation comes from supply shocks, energy price changes, and demand imbalances — not just money printing.

**Myth 3: Rising prices in one category = inflation.**
Inflation is a sustained, *general* rise in the price level. If only tomatoes become expensive because of crop failure, that is a supply shock, not inflation in the macro sense.

**Myth 4: Deflation (falling prices) is always good.**
Falling prices sound appealing but can trigger a dangerous spiral: consumers delay purchases, businesses cut jobs, unemployment rises, and the economy contracts. Japan's "lost decades" are the classic case.`,
      ur: `**غلط فہمی 1: افراطِ زر ہمیشہ برا ہے۔**
معتدل افراطِ زر (2–5٪) دراصل صحت مند ہے۔ یہ خرچ اور سرمایہ کاری کی حوصلہ افزائی کرتا ہے اور مرکزی بینکوں کو مندی میں شرح کم کرنے کی گنجائش دیتا ہے۔

**غلط فہمی 2: حکومت پیسے چھاپ کر افراطِ زر پیدا کرتی ہے۔**
یہ جزوی طور پر درست ہے، لیکن زیادہ تر جدید افراطِ زر رسد کے جھٹکوں اور توانائی کی قیمتوں سے آتا ہے۔

**غلط فہمی 3: ایک زمرے میں بڑھتی قیمتیں = افراطِ زر۔**
افراطِ زر قیمتوں کی سطح میں مستمر، *عمومی* اضافہ ہے۔

**غلط فہمی 4: تنزلِ قیمت (گرتی قیمتیں) ہمیشہ اچھا ہے۔**
جاپان کے "کھوئے دہائیوں" اس کی بہترین مثال ہیں۔`,
      rm: `**Ghalat fehmi 1: Inflation hamesha bura hai.**
Mutadil inflation (2–5%) aslaan sehat mand hai. Yeh kharch aur sarmaya kaari ki hosla afzaai karta hai.

**Ghalat fehmi 2: Hukoomat paisa chhap kar inflation paida karti hai.**
Yeh juzwi tor par sahi hai, lekin zyada tar jadeed inflation rasad ke jhatkon aur energy ki qeematon se aata hai.

**Ghalat fehmi 3: Ek zumray mein barhti qeematen = inflation.**
Inflation qeematon ki satah mein mustamil, *umoomi* izaafa hai.

**Ghalat fehmi 4: Deflation hamesha acha hai.**
Japan ke "Khoye Dahai" is ki behtareen misaal hain.`,
    },
    pakistanExample: {
      en: `In FY2023, Pakistan experienced a perfect storm of inflation drivers:

**Energy prices:** Electricity tariffs were revised upward by over 40% as the government reduced power subsidies under the IMF program. Gas prices followed.

**Rupee depreciation:** The PKR fell from ~178/USD in April 2022 to ~285/USD by mid-2023 — a 60% collapse. Since Pakistan imports energy, edible oil, fertiliser, and industrial inputs, every rupee of depreciation raised domestic costs.

**Food prices:** Floods in 2022 destroyed roughly one-third of Pakistan's standing crops, especially cotton, sugarcane, and vegetables, hitting the 34%-weighted food basket hard.

**Fiscal deficit monetisation:** Prior to the IMF program, the government borrowed heavily from the SBP (printing money), expanding the money supply.

**Result:** CPI peaked at **38.0% YoY** in May 2023 — the highest since the 1970s. The SBP hiked the policy rate to **22%** to break the inflation spiral.`,
      ur: `مالی سال 2023 میں پاکستان نے افراطِ زر کے عوامل کا طوفان دیکھا:

**توانائی کی قیمتیں:** IMF پروگرام کے تحت بجلی کے نرخ 40٪ سے زیادہ بڑھائے گئے۔

**روپے کی قدر میں کمی:** PKR اپریل 2022 میں 178/USD سے گر کر 2023 کے وسط میں 285/USD ہو گیا — 60٪ کا زوال۔

**خوراک کی قیمتیں:** 2022 کے سیلاب نے پاکستان کی فصلوں کا تقریباً ایک تہائی تباہ کیا۔

**نتیجہ:** CPI مئی 2023 میں **38.0٪** سالانہ پر پہنچی۔ SBP نے پالیسی ریٹ **22٪** تک بڑھایا۔`,
      rm: `Maali Saal 2023 mein Pakistan ne inflation ke asbab ka toofaan dekha:

**Energy ki qeematen:** IMF program ke tahat bijli ke narkh 40% se zyada badhaye gaye.

**Rupee ki qemat mein kami:** PKR April 2022 mein 178/USD se gir kar 2023 ke wast mein 285/USD ho gaya — 60% ka zawal.

**Khaane ki qeematen:** 2022 ke sailaab ne Pakistan ki faslon ka taqreeban ek tihaai tabah kiya.

**Nateeja:** CPI May 2023 mein **38.0%** saalana par pahunchi. SBP ne policy rate **22%** tak badhaaya.`,
    },
    realWorld: {
      en: `Turkey's 2021–2022 episode is an instructive parallel. The Turkish government cut interest rates despite rising inflation — the opposite of standard central banking practice. The lira collapsed and inflation exceeded 85% by late 2022, forcing a dramatic policy reversal under new central bank leadership.

Argentina has battled chronic inflation for decades. In 2023, annual CPI topped 211%, driven by fiscal deficits monetised by the central bank. A new "shock therapy" program devalued the peso and slashed subsidies.

**The common thread:** monetary financing of deficits + supply shocks = inflation spirals that are very difficult to reverse without significant economic pain. Pakistan's 2022–2023 episode followed the same pattern — and the IMF-backed stabilization program, while painful, successfully brought CPI down to single digits by late 2024.`,
      ur: `ترکی کا 2021–2022 کا واقعہ سبق آموز ہے۔ ترک حکومت نے سیاسی دباؤ میں شرح سود کم کی جبکہ افراطِ زر بڑھ رہا تھا۔ لیرا گرا اور افراطِ زر 85٪ سے تجاوز کر گیا۔

ارجنٹینا نے کئی دہائیوں سے دائمی افراطِ زر سے لڑی ہے۔ 2023 میں سالانہ CPI 211٪ سے تجاوز کر گئی۔

**مشترک نکتہ:** مالی خسارے کی مالیاتی فنانسنگ + رسد کے جھٹکے = افراطِ زر کا چکر۔ پاکستان کا 2022–2023 کا واقعہ اسی نمونے پر چلا — اور IMF کی حمایت سے استحکام کا پروگرام کامیاب رہا۔`,
      rm: `Turkey ka 2021–2022 ka waqia sabaq aamoz hai. Turkish hukoomat ne siyasi dabaao mein share sood kam kiya jabke inflation barh raha tha. Lira gira aur inflation 85% se tajaaoz kar gaya.

Argentina ne kai dahaion se daimi inflation se larhai ki hai. 2023 mein saalana CPI 211% se tajaaoz kar gayi.

**Mushtarak nuktah:** Maali khassaray ki monetary financing + rasad ke jhatke = inflation ka chakkar. Pakistan ka 2022–2023 ka waqia isi namoonay par chala — aur IMF ki himaayat se istehkaam ka program kamyaab raha.`,
    },
    summary: {
      en: `**Key takeaways:**
• Inflation = sustained rise in the general price level, measured in Pakistan by CPI
• Pakistan's CPI basket is 34% food — making food prices disproportionately important
• Three types: demand-pull, cost-push, built-in; Pakistan's recent inflation was primarily cost-push + monetisation
• CPI peaked at 38% in May 2023; SBP hiked policy rate to 22% to combat it
• Moderate inflation (2–5%) is healthy; very high or very low inflation both cause problems
• The SBP's primary tool is the policy rate — it cannot directly fix cost-push inflation from energy`,
      ur: `**اہم نکات:**
• افراطِ زر = قیمتوں کی سطح میں مستمر اضافہ، پاکستان میں CPI سے ماپا جاتا ہے
• پاکستان کے CPI باسکٹ میں خوراک 34٪ ہے
• تین اقسام: طلب کھینچنے والا، لاگت دھکیلنے والا، مستقل؛ پاکستان کا حالیہ افراطِ زر بنیادی طور پر لاگت دھکیلنے والا + مالیاتی تھا
• CPI مئی 2023 میں 38٪ پر پہنچی؛ SBP نے پالیسی ریٹ 22٪ تک بڑھایا
• SBP کا بنیادی ٹول پالیسی ریٹ ہے — یہ توانائی کی قیمتوں سے لاگت دھکیلنے والے افراطِ زر کو براہ راست ٹھیک نہیں کر سکتا`,
      rm: `**Aham nuktaat:**
• Inflation = qeematon ki satah mein mustamil izaafa, Pakistan mein CPI se mapaa jaata hai
• Pakistan ke CPI basket mein khaana 34% hai
• Teen iqsaam: maang kheenchne wala, lagat dhakelnay wala, mustaqil; Pakistan ka haaliya inflation zyada tar lagat dhakelnay wala + maaliyaati tha
• CPI May 2023 mein 38% par pahunchi; SBP ne policy rate 22% tak badhaaya
• SBP ka bunyaadi tool policy rate hai — yeh energy ki qeematon se inflation ko seedha theek nahi kar sakta`,
    },
  },
  quiz: [
    {
      question: {
        en: "What is the primary tool the SBP uses to combat demand-pull inflation?",
        ur: "SBP طلب کھینچنے والے افراطِ زر کا مقابلہ کرنے کے لیے بنیادی طور پر کیا استعمال کرتا ہے؟",
        rm: "SBP maang kheenchne wale inflation ka muqabala karne ke liye bunyaadi tor par kya istemal karta hai?",
      },
      options: [
        { en: "Printing more money", ur: "زیادہ پیسے چھاپنا", rm: "Zyada paise chhapna" },
        { en: "Raising the policy rate", ur: "پالیسی ریٹ بڑھانا", rm: "Policy rate badhaana" },
        { en: "Reducing import duties", ur: "درآمدی ڈیوٹی کم کرنا", rm: "Daraamdi duty kam karna" },
        { en: "Increasing government subsidies", ur: "سبسڈی بڑھانا", rm: "Subsidy badhaana" },
      ],
      correctIndex: 1,
      explanation: {
        en: "Raising the policy rate makes borrowing more expensive, cooling demand (demand-pull inflation) and signalling the SBP's commitment to price stability.",
        ur: "پالیسی ریٹ بڑھانے سے قرض مہنگا ہوتا ہے، جو طلب کو ٹھنڈا کرتا ہے اور SBP کے قیمتی استحکام کے عزم کا اشارہ دیتا ہے۔",
        rm: "Policy rate badhane se qarz mahnga hota hai, jo talab ko thanda karta hai aur SBP ke qeemati istehkaam ke azm ka ishara deta hai.",
      },
    },
    {
      question: {
        en: "Approximately what weight does food have in Pakistan's CPI basket?",
        ur: "پاکستان کے CPI باسکٹ میں خوراک کا تقریباً کتنا وزن ہے؟",
        rm: "Pakistan ke CPI basket mein khaane ka taqreeban kitna wazan hai?",
      },
      options: [
        { en: "14%", ur: "14٪", rm: "14%" },
        { en: "24%", ur: "24٪", rm: "24%" },
        { en: "~34%", ur: "تقریباً 34٪", rm: "Taqreeban 34%" },
        { en: "50%", ur: "50٪", rm: "50%" },
      ],
      correctIndex: 2,
      explanation: {
        en: "Food carries roughly 34% weight in Pakistan's CPI basket — far higher than ~14% in the US — because lower-income households spend a larger share of income on food.",
        ur: "خوراک کو پاکستان کے CPI باسکٹ میں تقریباً 34٪ وزن ملتا ہے — امریکی CPI میں 14٪ سے کہیں زیادہ — کیونکہ کم آمدنی والے گھرانے خوراک پر زیادہ خرچ کرتے ہیں۔",
        rm: "Khaane ko Pakistan ke CPI basket mein taqreeban 34% wazan milta hai — Amreeki CPI mein 14% se kahin zyada — kyunke kam aamdani wale gharane khaane par zyada kharch karte hain.",
      },
    },
    {
      question: {
        en: "Which type of inflation results from rising energy and raw material costs?",
        ur: "توانائی اور خام مال کی بڑھتی قیمتوں سے کون سا افراطِ زر پیدا ہوتا ہے؟",
        rm: "Energy aur kham maal ki barhti qeematon se kaun sa inflation paida hota hai?",
      },
      options: [
        { en: "Demand-pull", ur: "طلب کھینچنے والا", rm: "Maang kheenchne wala" },
        { en: "Cost-push", ur: "لاگت دھکیلنے والا", rm: "Lagat dhakelnay wala" },
        { en: "Built-in", ur: "مستقل", rm: "Mustaqil" },
        { en: "Hyperinflation", ur: "انتہائی افراطِ زر", rm: "Intehai inflation" },
      ],
      correctIndex: 1,
      explanation: {
        en: "Cost-push inflation arises when the cost of production inputs (energy, raw materials) rises, pushing producers to raise prices for consumers.",
        ur: "لاگت دھکیلنے والا افراطِ زر اس وقت پیدا ہوتا ہے جب پیداوار کی لاگت (توانائی، خام مال) بڑھتی ہے، جس سے پروڈیوسرز صارفین کے لیے قیمتیں بڑھاتے ہیں۔",
        rm: "Lagat dhakelnay wala inflation us waqt paida hota hai jab paidawar ki lagat (energy, kham maal) barhti hai, jisse producers consumers ke liye qeematen badhate hain.",
      },
    },
    {
      question: {
        en: "In which month/year did Pakistan's CPI peak above 38%?",
        ur: "پاکستان کی CPI کس ماہ/سال میں 38٪ سے زیادہ پر پہنچی؟",
        rm: "Pakistan ki CPI kis maah/saal mein 38% se zyada par pahunchi?",
      },
      options: [
        { en: "March 2022", ur: "مارچ 2022", rm: "March 2022" },
        { en: "August 2022", ur: "اگست 2022", rm: "August 2022" },
        { en: "January 2023", ur: "جنوری 2023", rm: "January 2023" },
        { en: "May 2023", ur: "مئی 2023", rm: "May 2023" },
      ],
      correctIndex: 3,
      explanation: {
        en: "Pakistan's CPI hit its cycle peak at 38.0% YoY in May 2023, driven by energy price hikes, rupee depreciation, and food supply shocks from the 2022 floods.",
        ur: "پاکستان کی CPI مئی 2023 میں 38.0٪ سالانہ پر اپنی چکر کی بلند ترین سطح پر پہنچی، جو توانائی کی قیمتوں میں اضافے، روپے کی قدر میں کمی، اور 2022 کے سیلاب سے خوراک کی رسد کے جھٹکوں کی وجہ سے تھی۔",
        rm: "Pakistan ki CPI May 2023 mein 38.0% saalana par apni cycle ki buland tareen satah par pahunchi, jo energy ki qeematon mein izaafa, rupay ki qemat mein kami, aur 2022 ke sailaab se khaane ki rasad ke jhatkon ki wajah se thi.",
      },
    },
  ],
  faq: [
    {
      question: {
        en: "What is the difference between CPI and core inflation?",
        ur: "CPI اور بنیادی افراطِ زر میں کیا فرق ہے؟",
        rm: "CPI aur bunyaadi inflation mein kya farq hai?",
      },
      answer: {
        en: "CPI measures the change in prices of a full basket including food and energy. Core inflation strips out food and energy — the most volatile components — to reveal the underlying trend. SBP uses core inflation to assess whether inflation is structural or driven by temporary supply shocks.",
        ur: "CPI خوراک اور توانائی سمیت تمام اشیاء کی قیمتوں کی تبدیلی ماپتا ہے۔ بنیادی افراطِ زر خوراک اور توانائی کو نکال کر بنیادی رجحان ظاہر کرتا ہے۔",
        rm: "CPI khaana aur energy samet tamam cheezeen ki qeematon ki tabdeeli mapata hai. Bunyaadi inflation khaana aur energy ko nikal kar bunyaadi rujhaan zahir karta hai.",
      },
    },
    {
      question: {
        en: "How does the SBP fight inflation?",
        ur: "SBP افراطِ زر کا مقابلہ کیسے کرتا ہے؟",
        rm: "SBP inflation ka muqabala kaise karta hai?",
      },
      answer: {
        en: "The SBP's primary tool is the policy rate. Raising it makes borrowing more expensive — this cools demand and signals commitment to price stability. The SBP also uses open market operations to manage liquidity. However, it cannot directly combat cost-push inflation from energy prices — that requires fiscal and structural reform.",
        ur: "SBP کا بنیادی آلہ پالیسی ریٹ ہے۔ اسے بڑھانے سے قرض مہنگا ہوتا ہے — یہ طلب کو ٹھنڈا کرتا ہے اور قیمتی استحکام کے عزم کا اشارہ دیتا ہے۔ تاہم، SBP توانائی کی قیمتوں سے پیدا ہونے والے افراطِ زر کا براہ راست مقابلہ نہیں کر سکتا۔",
        rm: "SBP ka bunyaadi aala policy rate hai. Ise badhane se qarz mahnga hota hai — yeh talab ko thanda karta hai. Taham, SBP energy ki qeematon se paida hone wale inflation ka seedha muqabala nahi kar sakta.",
      },
    },
    {
      question: {
        en: "Is deflation better than inflation?",
        ur: "کیا تنزلِ قیمت افراطِ زر سے بہتر ہے؟",
        rm: "Kya deflation inflation se behtar hai?",
      },
      answer: {
        en: "Not necessarily. While deflation means prices fall, it can trigger a dangerous spiral: consumers delay purchases expecting lower prices, businesses cut production, unemployment rises. Japan's 'lost decades' were partly caused by deflationary expectations. Moderate inflation (2–5%) is generally considered healthy.",
        ur: "ضروری نہیں۔ تنزلِ قیمت ایک خطرناک چکر شروع کر سکتا ہے: صارفین خریداری ملتوی کرتے ہیں، کاروبار پیداوار کم کرتے ہیں، بے روزگاری بڑھتی ہے۔ جاپان کے 'کھوئے دہائیاں' جزوی طور پر افراطِ تنزل کی توقعات کی وجہ سے تھیں۔",
        rm: "Zaroori nahi. Deflation ek khatarnaak chakkar shuru kar sakta hai: consumers kharidari mualtwi karte hain, karobaar paidawar kam karte hain, be-rozgari barhti hai. Japan ke 'Khoye Dahaiyan' juzwi tor par deflation ki tawaqqu'aat ki wajah se thin.",
      },
    },
  ],
};
