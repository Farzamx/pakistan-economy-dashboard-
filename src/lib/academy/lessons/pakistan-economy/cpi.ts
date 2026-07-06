import type { Lesson } from "@/lib/academy/types";

export const cpiPakistanLesson: Lesson = {
  slug: "cpi",
  category: "pakistan-economy",
  title: { en: "Pakistan's CPI: How Inflation is Measured", ur: "پاکستان کا CPI: افراطِ زر کیسے ماپا جاتا ہے", rm: "Pakistan ka CPI: Inflation Kaise Mapaa Jaata Hai" },
  subtitle: {
    en: "A deep dive into the Pakistan Bureau of Statistics' Consumer Price Index",
    ur: "پاکستان بیورو آف اسٹیٹسٹکس کے صارف قیمت اشاریے کا گہرا جائزہ",
    rm: "Pakistan Bureau of Statistics ke Consumer Price Index ka gehra jaiza",
  },
  level: "intermediate",
  readMinutes: 12,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-inflation-pakistan", "core-inflation-pakistan", "weekly-inflation-pakistan"],
  relatedLessonSlugs: ["inflation", "policy-rate", "gdp"],
  content: {
    overview: {
      en: "Pakistan's Consumer Price Index (CPI) is the official measure of inflation, published monthly by the Pakistan Bureau of Statistics (PBS). This lesson goes beyond the headline number: how the CPI is constructed, why food has such a large weight, what core inflation measures, how CPI relates to the SPI (weekly inflation), and why the 2022–2023 CPI crisis was unprecedented.",
      ur: "پاکستان کا صارف قیمت اشاریہ (CPI) افراطِ زر کا سرکاری پیمانہ ہے، جو پاکستان بیورو آف اسٹیٹسٹکس (PBS) ماہانہ شائع کرتا ہے۔ یہ سبق عنوانی عدد سے آگے جاتا ہے۔",
      rm: "Pakistan ka Consumer Price Index (CPI) inflation ka sarkari paimaana hai, jo Pakistan Bureau of Statistics (PBS) maahana shaai'a karta hai. Yeh sabaq unwaani adad se aagey jaata hai.",
    },
    whyItMatters: {
      en: `CPI is not just a statistical curiosity — it drives decisions worth billions of rupees:

**For the SBP:** The Monetary Policy Committee's primary mandate is price stability. CPI data determines whether the SBP raises, holds, or cuts the policy rate. A single CPI print can move markets significantly.

**For the government:** CPI is used to adjust minimum wage, civil servant salaries, social protection payments (BISP), and pension indexation. Higher CPI legally triggers pay increases costing billions.

**For bond investors:** Pakistan's savings certificates (NSS) and government bonds often carry yields linked to CPI expectations. Understanding CPI dynamics helps predict where yields are headed.

**For households:** The gap between headline CPI and what families actually experience (especially in food) reveals who bears the real burden of inflation — consistently, the poorest quartile in Pakistan faces effective inflation 5–10 percentage points above the headline number.`,
      ur: `CPI محض ایک اعداد و شماری تجسس نہیں — یہ اربوں روپے کے فیصلوں کو چلاتا ہے:

**SBP کے لیے:** مالیاتی پالیسی کمیٹی کا بنیادی مینڈیٹ قیمتوں کا استحکام ہے۔ CPI کا ڈیٹا طے کرتا ہے کہ SBP پالیسی ریٹ بڑھائے، برقرار رکھے، یا کم کرے۔

**حکومت کے لیے:** CPI کا استعمال کم از کم اجرت، سرکاری ملازمین کی تنخواہیں، اور BISP سماجی تحفظ کی ادائیگیوں کو ایڈجسٹ کرنے کے لیے کیا جاتا ہے۔

**گھرانوں کے لیے:** پاکستان کی غریب ترین آبادی مسلسل عنوانی CPI سے 5–10 فیصد پوائنٹس زیادہ مؤثر افراطِ زر کا سامنا کرتی ہے۔`,
      rm: `CPI محض ek iqdaamaat tajassus nahi — yeh arbon rupay ke faslon ko chalata hai:

**SBP ke liye:** Maaliyaati Policy Committee ka bunyaadi mandate qeematon ka istehkaam hai. CPI ka data tay karta hai ke SBP policy rate badhaaye, barakar rakhe, ya kam kare.

**Hukoomat ke liye:** CPI ka istemal kam az kam ujrat, sarkari mulazimeen ki tankhaahein, aur BISP samaaji tahaffuz ki adaaigiyan adjust karne ke liye kiya jaata hai.

**Gharanon ke liye:** Pakistan ki ghareeb tareen aabadi musalsal unwaani CPI se 5–10 feesad pointo zyada mu'assir inflation ka samna karti hai.`,
    },
    explanation: {
      en: `**What is the CPI basket?**
The CPI is calculated from a fixed "basket" of goods and services that represents average household spending. Pakistan's current basket uses the **2015–16 Household Integrated Economic Survey (HIES)** as the base. PBS conducts price surveys across **35 urban centres** and a rural sample.

**The major group weights (Urban CPI):**
| Group | Weight |
|-------|--------|
| Food & Non-Alcoholic Beverages | ~34.6% |
| Housing, Water, Electricity, Gas | ~23.6% |
| Transport | ~7.3% |
| Clothing & Footwear | ~8.4% |
| Health | ~3.0% |
| Education | ~3.7% |
| Other | ~19.4% |

Food's 34.6% weight dwarfs that of advanced economies (US: ~14%, UK: ~16%), reflecting Pakistan's income levels — lower-income populations spend more of their budget on food.

**Core Inflation:**
Core CPI strips out food and energy — the most volatile components. The SBP uses **Non-Food, Non-Energy (NFNE)** CPI as its primary measure of underlying inflation. When core is persistently above headline, it signals inflation has become broad-based and demand-driven (harder to fix). When headline is above core, it typically reflects a supply shock (food/energy), which may be temporary.

**The Sensitive Price Indicator (SPI):**
PBS also publishes the SPI *weekly*, tracking 51 essential food items across 17 cities. The SPI is an early warning system — it moves faster than CPI and gives the government and SBP a real-time pulse on food price pressures. In crisis periods, weekly SPI jumps of 3–5% are a serious signal.

**Rural vs. Urban CPI:**
Pakistan publishes separate urban and national CPI. Rural inflation is structurally different — agricultural communities consume more of what they produce (insulating them from some market price changes) but are more exposed to weather-driven food supply shocks.`,
      ur: `**CPI باسکٹ کیا ہے؟**
CPI ایک مقررہ "باسکٹ" اشیاء اور خدمات سے حسابی کی جاتی ہے جو اوسط گھریلو خرچ کی نمائندگی کرتی ہے۔ پاکستان کا موجودہ باسکٹ **2015–16 گھریلو مربوط معاشی سروے (HIES)** کو بنیاد کے طور پر استعمال کرتا ہے۔ PBS **35 شہری مراکز** میں قیمتوں کے سروے کرتا ہے۔

**بنیادی افراطِ زر:**
بنیادی CPI خوراک اور توانائی کو نکال دیتا ہے۔ SBP **غیر خوراک، غیر توانائی (NFNE)** CPI کو استعمال کرتا ہے۔

**حساس قیمت اشاریہ (SPI):**
PBS 51 ضروری خوراک اشیاء کی SPI *ہفتہ وار* شائع کرتا ہے — یہ CPI سے تیز حرکت کرتا ہے اور خوراک کی قیمتوں کے دباؤ پر ریئل ٹائم نبض دیتا ہے۔`,
      rm: `**CPI basket kya hai?**
CPI ek muqarrara "basket" cheezein aur khadamaat se hisaab ki jaati hai. Pakistan ka maujuda basket **2015–16 Gharelu Murabt Maashi Survey (HIES)** ko bunyaad ke tor par istemal karta hai. PBS **35 shahri maraakiz** mein qeematon ke survey karta hai.

**Bunyaadi inflation:**
Bunyaadi CPI khaana aur energy ko nikal deta hai. SBP **Ghair Khaana, Ghair Energy (NFNE)** CPI ko istemal karta hai.

**Hassaas Qeemat Ashaariya (SPI):**
PBS 51 zaroori khaana cheezein ki SPI *haftawar* shaai'a karta hai — yeh CPI se tez harkat karta hai aur khaane ki qeematon ke dabaao par real-time nabd deta hai.`,
    },
    misconceptions: {
      en: `**Myth 1: The CPI basket is updated continuously.**
Pakistan's CPI basket uses base weights from 2015–16 — nearly a decade old. Consumption patterns shift: people substitute cheaper goods when prices rise, new goods emerge, and expenditure shares change. An outdated basket can overstate or understate true inflation. Pakistan's PBS has announced plans to update the basket using the 2019–20 HIES.

**Myth 2: If CPI falls, prices are falling.**
A fall in CPI growth rate (disinflation) means prices are still rising — just more slowly. Prices only fall if CPI growth goes *negative* (deflation). Pakistan's CPI fell from 38% YoY to 4% YoY in 2024, but prices were still ~130% higher than pre-crisis 2021 levels — a painful reality for households.

**Myth 3: Core inflation is more "accurate" than headline CPI.**
Neither is more accurate; they measure different things. Core removes food and energy to reveal the underlying demand-driven trend. Headline includes everything people actually buy. For monetary policy, core matters more. For household welfare, headline matters more.

**Myth 4: Urban CPI represents all Pakistanis.**
Urban CPI covers ~35% of the population. Rural Pakistanis (~65%) face systematically different inflation dynamics — especially for food, which they partly self-produce.`,
      ur: `**غلط فہمی 1: CPI باسکٹ مسلسل اپ ڈیٹ ہوتا ہے۔**
پاکستان کا CPI باسکٹ 2015–16 کے بنیادی وزن استعمال کرتا ہے — تقریباً ایک دہائی پرانا۔

**غلط فہمی 2: اگر CPI گرتی ہے، تو قیمتیں گر رہی ہیں۔**
CPI نمو کی شرح میں کمی (تنزل افراطِ زر) کا مطلب ہے کہ قیمتیں اب بھی بڑھ رہی ہیں — بس آہستہ۔ پاکستان کی CPI 38٪ سالانہ سے گر کر 4٪ ہو گئی، لیکن قیمتیں 2021 سے 130٪ زیادہ تھیں۔

**غلط فہمی 3: بنیادی افراطِ زر عنوانی CPI سے زیادہ "درست" ہے۔**
نہ تو زیادہ درست ہے — وہ مختلف چیزیں ماپتے ہیں۔

**غلط فہمی 4: شہری CPI تمام پاکستانیوں کی نمائندگی کرتی ہے۔**
شہری CPI آبادی کا تقریباً 35٪ احاطہ کرتی ہے۔`,
      rm: `**Ghalat fehmi 1: CPI basket musalsal update hota hai.**
Pakistan ka CPI basket 2015–16 ke bunyaadi wazan istemal karta hai — taqreeban ek dahai puraana.

**Ghalat fehmi 2: Agar CPI girti hai, to qeematen gir rahi hain.**
CPI numa ki shar mein kami (tanzul inflation) ka matlab hai ke qeematen ab bhi barh rahi hain — bas aahista. Pakistan ki CPI 38% saalana se gir kar 4% ho gayi, lekin qeematen 2021 se 130% zyada thin.

**Ghalat fehmi 3: Bunyaadi inflation unwaani CPI se zyada "durust" hai.**
Na to zyada durust hai — woh mukhtalif cheezein maapte hain.

**Ghalat fehmi 4: Shahri CPI tamam Pakistaniyon ki numaindagi karti hai.**
Shahri CPI aabadi ka taqreeban 35% ahata karti hai.`,
    },
    pakistanExample: {
      en: `**The 2022–2023 CPI crisis — anatomy of a record:**

Pakistan's CPI rose from ~12% in mid-2022 to **38.0% in May 2023** — the highest recorded level since at least the 1970s. Here's what drove it:

**Food (34.6% weight):**
- 2022 super-floods destroyed crops across Sindh and Balochistan
- Wheat prices surged as global markets tightened (Russia-Ukraine war)
- Edible oil (palm oil) prices spiked globally
- Supply disruptions from import restrictions compounded domestic shortages

**Energy (part of Housing & Transport):**
- Electricity tariff revisions added ~40% to power bills
- Gas prices were raised multiple times under IMF adjustment
- Petrol prices followed global crude oil and a weakening rupee

**Imported inflation:**
- PKR depreciated 60%+ from ~178 in Apr 2022 to ~285 by mid-2023
- Pakistan imports energy, edible oil, fertiliser, industrial machinery — all priced in USD
- Every rupee of depreciation directly raised input costs

**The base effect:**
By late 2023, CPI began falling rapidly — partly because of the "base effect": comparison against already-high 2022 prices made the YoY percentage look lower even when absolute price levels stayed elevated.

**CPI by October 2024:** Back to ~7.2% — within striking distance of the SBP's medium-term 5–7% target. But household budgets were permanently scarred: the price level of May 2023 was ~1.5× the January 2021 level.`,
      ur: `**2022–2023 CPI بحران — ایک ریکارڈ کا تشریح:**

پاکستان کی CPI 2022 کے وسط میں ~12٪ سے بڑھ کر **مئی 2023 میں 38.0٪** تک پہنچی — کم از کم 1970ء کی دہائی کے بعد سے سب سے زیادہ۔

**خوراک:** 2022 کے سپر سیلاب نے فصلیں تباہ کیں، گندم کی قیمتیں عالمی بازاروں میں بڑھیں، خوردنی تیل کی قیمتیں عالمی سطح پر اچھلیں۔

**توانائی:** بجلی کے نرخ ~40٪ بڑھے، گیس کی قیمتیں کئی بار بڑھائی گئیں۔

**درآمدی افراطِ زر:** PKR نے 60٪ سے زیادہ قدر کھوئی۔

**بنیادی اثر:** 2023 کے آخر میں، CPI تیزی سے گرنا شروع ہوئی — جزوی طور پر "بنیادی اثر" کی وجہ سے۔`,
      rm: `**2022–2023 CPI bohran — ek record ki tashreeh:**

Pakistan ki CPI 2022 ke wast mein ~12% se barh kar **May 2023 mein 38.0%** tak pahunchi — kam az kam 1970 ki dahai ke baad se sab se zyada.

**Khaana:** 2022 ke super sailaab ne faslen tabah kin, gandum ki qeematen aalami baazaron mein barhin, khordani tail ki qeematen aalami satah par uchhali.

**Energy:** Bijli ke narkh ~40% badhey, gas ki qeematen kai baar badhaayi gayin.

**Daraamdi inflation:** PKR ne 60% se zyada qemat khoi.

**Bunyaadi asar:** 2023 ke aakhir mein, CPI tezi se girna shuru hui — juzwi tor par "bunyaadi asar" ki wajah se.`,
    },
    realWorld: {
      en: `**How the US Bureau of Labor Statistics builds CPI:**
The US CPI uses the Consumer Expenditure Survey (updated more frequently than Pakistan's HIES) and surveys ~23,000 businesses monthly. A key methodological difference: the US uses "hedonic adjustment" — if a laptop today is faster than last year's model at the same price, the CPI treats this as a price *decrease* in computing power. Pakistan's PBS does not use hedonic adjustments.

**India's CPI vs. Pakistan's:**
India's CPI also weights food heavily (~45% rural, ~36% urban), making it similarly sensitive to food price shocks. India's more diversified economy and larger foreign exchange reserves give the RBI (Reserve Bank of India) more room to manage inflation than the SBP.

**The "true" inflation debate:**
MIT's Billion Prices Project used web-scraped prices to track inflation in real time globally, often finding offline and online prices diverge. In Pakistan, informal market prices (street vendors, wholesale markets) often move differently from the PBS's formal survey prices — which is why local experience can differ sharply from the official CPI.`,
      ur: `**امریکی بیورو آف لیبر اسٹیٹسٹکس CPI کیسے بناتا ہے:**
امریکی CPI صارف اخراجات سروے استعمال کرتی ہے اور ماہانہ ~23,000 کاروباروں کا سروے کرتی ہے۔ ایک اہم فرق: امریکہ "ہیڈونک ایڈجسٹمنٹ" استعمال کرتا ہے — اگر آج کا لیپ ٹاپ پچھلے سال سے تیز ہے، تو یہ ایک قیمت *کمی* سمجھی جاتی ہے۔

**"حقیقی" افراطِ زر بحث:**
MIT کے بلین پرائسز پروجیکٹ نے ویب سکریپڈ قیمتیں استعمال کیں اور پایا کہ آن لائن اور آف لائن قیمتیں مختلف ہوتی ہیں۔`,
      rm: `**Amreeki Bureau of Labor Statistics CPI kaise banata hai:**
Amreeki CPI consumer ikhraajaat survey istemal karti hai aur maahana ~23,000 karobaroon ka survey karti hai. Ek aham farq: Amreeka "hedonic adjustment" istemal karta hai — agar aaj ka laptop pichle saal se tez hai, to yeh ek qeemat *kami* samjhi jaati hai.

**"Haqeeqi" inflation bahas:**
MIT ke Billion Prices Project ne web-scraped qeematen istemal kin aur paya ke online aur offline qeematen mukhtalif hoti hain.`,
    },
    summary: {
      en: `**Key takeaways:**
• Pakistan's CPI is published monthly by PBS; it uses a basket based on 2015–16 HIES weights
• Food has ~34.6% weight in the CPI basket — far higher than advanced economies
• Core (NFNE) CPI strips out food and energy to measure underlying demand-driven inflation
• The SPI (Sensitive Price Indicator) tracks 51 food items weekly — an early warning system
• Pakistan's CPI peaked at 38% in May 2023, driven by food supply shocks, energy hikes, and PKR depreciation
• By October 2024, CPI fell back to ~7% — but absolute price levels remained ~50% above 2021
• Understanding the difference between disinflation (slower price rises) and deflation (price falls) is critical`,
      ur: `**اہم نکات:**
• پاکستان کی CPI PBS ماہانہ شائع کرتا ہے؛ یہ 2015–16 HIES وزن پر مبنی باسکٹ استعمال کرتا ہے
• CPI باسکٹ میں خوراک ~34.6٪ وزن رکھتی ہے
• بنیادی (NFNE) CPI طلب سے چلنے والے افراطِ زر کو ماپنے کے لیے خوراک اور توانائی نکالتی ہے
• SPI ہفتہ وار 51 خوراک اشیاء ٹریک کرتا ہے — ایک ابتدائی انتباہی نظام
• پاکستان کی CPI مئی 2023 میں 38٪ پر پہنچی
• اکتوبر 2024 تک، CPI ~7٪ پر واپس آئی — لیکن مطلق قیمتیں 2021 سے ~50٪ زیادہ رہیں`,
      rm: `**Aham nuktaat:**
• Pakistan ki CPI PBS maahana shaai'a karta hai; yeh 2015–16 HIES wazan par mabni basket istemal karta hai
• CPI basket mein khaana ~34.6% wazan rakhta hai
• Bunyaadi (NFNE) CPI talab se chalane wale inflation ko maapne ke liye khaana aur energy nikalti hai
• SPI haftawar 51 khaana cheezein track karta hai — ek ibtidaai inzaari nizam
• Pakistan ki CPI May 2023 mein 38% par pahunchi
• October 2024 tak, CPI ~7% par wapas aayi — lekin mutlaq qeematen 2021 se ~50% zyada rahin`,
    },
  },
  quiz: [
    {
      question: {
        en: "Which survey provides the base weights for Pakistan's current CPI basket?",
        ur: "پاکستان کے موجودہ CPI باسکٹ کے لیے بنیادی وزن کون سا سروے فراہم کرتا ہے؟",
        rm: "Pakistan ke maujuda CPI basket ke liye bunyaadi wazan kaun sa survey faraham karta hai?",
      },
      options: [
        { en: "2010–11 HIES", ur: "2010–11 HIES", rm: "2010–11 HIES" },
        { en: "2015–16 HIES", ur: "2015–16 HIES", rm: "2015–16 HIES" },
        { en: "2019–20 HIES", ur: "2019–20 HIES", rm: "2019–20 HIES" },
        { en: "2023 National Survey", ur: "2023 قومی سروے", rm: "2023 Qaomi Survey" },
      ],
      correctIndex: 1,
      explanation: {
        en: "Pakistan's CPI basket currently uses the 2015–16 Household Integrated Economic Survey (HIES) as its base — meaning the weights are nearly a decade old and may not perfectly reflect current spending patterns.",
        ur: "پاکستان کا CPI باسکٹ فی الحال 2015–16 HIES کو بنیاد کے طور پر استعمال کرتا ہے — یعنی وزن تقریباً ایک دہائی پرانے ہیں۔",
        rm: "Pakistan ka CPI basket filhaal 2015–16 HIES ko bunyaad ke tor par istemal karta hai — yani wazan taqreeban ek dahai puraane hain.",
      },
    },
    {
      question: {
        en: "What does the Sensitive Price Indicator (SPI) track, and how often?",
        ur: "حساس قیمت اشاریہ (SPI) کیا ٹریک کرتا ہے، اور کتنی بار؟",
        rm: "Hassaas Qeemat Ashaariya (SPI) kya track karta hai, aur kitni baar?",
      },
      options: [
        { en: "All 487 CPI items, monthly", ur: "تمام 487 CPI اشیاء، ماہانہ", rm: "Tamam 487 CPI cheezein, maahana" },
        { en: "51 essential food items, weekly", ur: "51 ضروری خوراک اشیاء، ہفتہ وار", rm: "51 zaroori khaana cheezein, haftawar" },
        { en: "Core inflation items only, weekly", ur: "صرف بنیادی افراطِ زر اشیاء، ہفتہ وار", rm: "Sirf bunyaadi inflation cheezein, haftawar" },
        { en: "Import prices, daily", ur: "درآمدی قیمتیں، روزانہ", rm: "Daraamdi qeematen, rozaana" },
      ],
      correctIndex: 1,
      explanation: {
        en: "The SPI tracks 51 essential food items (like wheat, sugar, onions, eggs) across 17 cities, published by PBS every week. It serves as an early warning system for food price pressures before they feed into the monthly CPI.",
        ur: "SPI 17 شہروں میں 51 ضروری خوراک اشیاء (جیسے گندم، چینی، پیاز، انڈے) ٹریک کرتا ہے، جو PBS ہر ہفتے شائع کرتا ہے۔ یہ ماہانہ CPI میں شامل ہونے سے پہلے خوراک کی قیمتوں کے دباؤ کے لیے ابتدائی انتباہی نظام کے طور پر کام کرتا ہے۔",
        rm: "SPI 17 shahron mein 51 zaroori khaana cheezein (jaise gandum, cheeni, pyaaz, ande) track karta hai, jo PBS har hafte shaai'a karta hai. Yeh maahana CPI mein shamil hone se pehle khaane ki qeematon ke dabaao ke liye ibtidaai inzaari nizam ke tor par kaam karta hai.",
      },
    },
    {
      question: {
        en: "What is 'core CPI' (NFNE) and why does the SBP use it?",
        ur: "بنیادی CPI (NFNE) کیا ہے اور SBP اسے کیوں استعمال کرتا ہے؟",
        rm: "Bunyaadi CPI (NFNE) kya hai aur SBP ise kyun istemal karta hai?",
      },
      options: [
        { en: "CPI including only the most important goods", ur: "صرف سب سے اہم اشیاء کی CPI", rm: "Sirf sab se aham cheezoon ki CPI" },
        { en: "CPI excluding food and energy — to measure underlying demand-driven inflation", ur: "خوراک اور توانائی کے بغیر CPI — بنیادی طلب سے چلنے والے افراطِ زر کو ماپنے کے لیے", rm: "Khaana aur energy ke baghair CPI — bunyaadi talab se chalane wale inflation ko maapne ke liye" },
        { en: "CPI measured only in urban areas", ur: "صرف شہری علاقوں میں ماپی گئی CPI", rm: "Sirf shahri ilaqon mein maapi gayi CPI" },
        { en: "CPI before seasonal adjustment", ur: "موسمی ایڈجسٹمنٹ سے پہلے CPI", rm: "Mausami adjustment se pehle CPI" },
      ],
      correctIndex: 1,
      explanation: {
        en: "Core CPI (Non-Food, Non-Energy / NFNE) removes the most volatile items to reveal the underlying trend in inflation driven by demand, not supply shocks. The SBP uses it to judge whether inflation is structural — requiring monetary policy tightening — or transitory.",
        ur: "بنیادی CPI (غیر خوراک، غیر توانائی / NFNE) سب سے متغیر اشیاء کو نکال کر افراطِ زر کے بنیادی رجحان کو ظاہر کرتی ہے۔ SBP اسے اس بات کا فیصلہ کرنے کے لیے استعمال کرتا ہے کہ آیا افراطِ زر ڈھانچاگت ہے یا عارضی۔",
        rm: "Bunyaadi CPI (Ghair Khaana, Ghair Energy / NFNE) sab se mutaghayyar cheezein nikal kar inflation ke bunyaadi rujhaan ko zahir karti hai. SBP ise is baat ka faisla karne ke liye istemal karta hai ke aaya inflation dhaanchaagat hai ya aarizataan.",
      },
    },
    {
      question: {
        en: "If CPI growth falls from 38% to 10% year-on-year, are prices falling?",
        ur: "اگر CPI نمو سالانہ بنیاد پر 38٪ سے 10٪ ہو جائے، تو کیا قیمتیں گر رہی ہیں؟",
        rm: "Agar CPI numa saalana bunyaad par 38% se 10% ho jaaye, to kya qeematen gir rahi hain?",
      },
      options: [
        { en: "Yes — prices are falling", ur: "ہاں — قیمتیں گر رہی ہیں", rm: "Haan — qeematen gir rahi hain" },
        { en: "No — prices are still rising, just more slowly", ur: "نہیں — قیمتیں اب بھی بڑھ رہی ہیں، بس آہستہ", rm: "Nahi — qeematen ab bhi barh rahi hain, bas aahista" },
        { en: "Impossible to tell without more data", ur: "مزید ڈیٹا کے بغیر بتانا ناممکن ہے", rm: "Mazeed data ke baghair batana namumkin hai" },
        { en: "Prices will fall in the next period", ur: "قیمتیں اگلے دور میں گریں گی", rm: "Qeematen agle daur mein girengi" },
      ],
      correctIndex: 1,
      explanation: {
        en: "A fall in the CPI growth rate is called disinflation — prices are still rising, just at a slower rate. Actual price *falls* (deflation) only occur when CPI growth goes negative. Pakistan's CPI fell from 38% to single digits in 2024, but all prices remained at their elevated levels — just rising more slowly.",
        ur: "CPI نمو کی شرح میں کمی کو تنزلِ افراطِ زر کہتے ہیں — قیمتیں اب بھی بڑھ رہی ہیں، بس آہستہ۔ قیمتوں میں اصل کمی صرف اس وقت ہوتی ہے جب CPI نمو منفی ہو جائے۔",
        rm: "CPI numa ki shar mein kami ko tanzul-e-inflation kehte hain — qeematen ab bhi barh rahi hain, bas aahista. Qeematon mein asal kami sirf us waqt hoti hai jab CPI numa manfi ho jaaye.",
      },
    },
  ],
  faq: [
    {
      question: {
        en: "Why does the inflation I experience at home feel higher than the official CPI?",
        ur: "گھر پر میرا تجربہ کردہ افراطِ زر سرکاری CPI سے زیادہ کیوں محسوس ہوتا ہے؟",
        rm: "Ghar par mera tajruba karda inflation sarkari CPI se zyada kyun mehsoos hota hai?",
      },
      answer: {
        en: "Several reasons: (1) The CPI basket represents average household spending — your personal spending mix differs. If you spend more on food than average, you experience higher effective inflation. (2) The CPI captures national average price changes; prices in your city or neighbourhood may differ. (3) PBS surveys formal retail outlets; prices in informal markets often move differently. (4) Lower-income households in Pakistan consistently face effective inflation 5–10 percentage points above the headline CPI because food makes up a larger share of their spending.",
        ur: "کئی وجوہات: (1) CPI باسکٹ اوسط گھریلو خرچ کی نمائندگی کرتا ہے — آپ کا ذاتی خرچ مختلف ہے۔ (2) CPI قومی اوسط قیمتوں کی تبدیلیاں ماپتی ہے؛ آپ کے شہر یا محلے کی قیمتیں مختلف ہو سکتی ہیں۔ (3) پاکستان کے کم آمدنی والے گھرانے مسلسل عنوانی CPI سے 5–10 فیصد پوائنٹس زیادہ مؤثر افراطِ زر کا سامنا کرتے ہیں۔",
        rm: "Kai wujuhaat: (1) CPI basket ausat gharelu kharch ki numaindagi karta hai — aapka zaati kharch mukhtalif hai. (2) CPI qaomi ausat qeematon ki tabdeeliyan maapti hai; aapke shahr ya muhalle ki qeematen mukhtalif ho sakti hain. (3) Pakistan ke kam aamdani wale gharane musalsal unwaani CPI se 5–10 feesad pointo zyada mu'assir inflation ka samna karte hain.",
      },
    },
    {
      question: {
        en: "How does PBS collect price data for the CPI?",
        ur: "PBS CPI کے لیے قیمتوں کا ڈیٹا کیسے جمع کرتا ہے؟",
        rm: "PBS CPI ke liye qeematon ka data kaise jama karta hai?",
      },
      answer: {
        en: "PBS field surveyors visit shops, markets, and service providers across 35 urban centres every month to record prices. They collect around 487 price quotations for items spanning food, housing, clothing, transport, health, and education. Rural price data is also collected, though from a smaller sample. The raw prices are then aggregated and weighted to produce the CPI index.",
        ur: "PBS فیلڈ سروے کرنے والے ماہانہ 35 شہری مراکز میں دکانوں، بازاروں اور سروس فراہم کنندگان کو قیمتیں ریکارڈ کرنے کے لیے جاتے ہیں۔ وہ خوراک، رہائش، لباس، نقل و حمل، صحت اور تعلیم پر محیط اشیاء کے لیے تقریباً 487 قیمتوں کے حوالے جمع کرتے ہیں۔",
        rm: "PBS field survey karne wale maahana 35 shahri maraakiz mein dukaaon, baazaron aur service fraham kunandagan ko qeematen record karne ke liye jaate hain. Woh khaana, rahaaish, libaas, naql-o-hamal, sehat aur ta'aleem par muheit cheezeen ke liye taqreeban 487 qeematon ke hawale jama karte hain.",
      },
    },
    {
      question: {
        en: "What is the 'base effect' and how did it affect Pakistan's CPI in 2023–2024?",
        ur: "بنیادی اثر کیا ہے اور اس نے 2023–2024 میں پاکستان کی CPI کو کیسے متاثر کیا؟",
        rm: "Bunyaadi asar kya hai aur is ne 2023–2024 mein Pakistan ki CPI ko kaise mutaassir kiya?",
      },
      answer: {
        en: "The 'base effect' refers to how year-on-year inflation comparisons are distorted by the level of prices in the comparison period. In Pakistan's case: when CPI was 38% in May 2023, the comparison period (May 2022) already had elevated prices. By late 2023, Pakistan was comparing against an already-high base, making the YoY growth rate look lower even as prices continued to rise. This base effect mechanically pulled CPI lower in late 2023 and 2024 — though absolute price levels remained deeply elevated versus 2021.",
        ur: "بنیادی اثر سے مراد ہے کہ سالانہ بنیاد پر افراطِ زر کے موازنے موازنے کی مدت میں قیمتوں کی سطح سے کیسے مسخ ہوتے ہیں۔ جب CPI مئی 2023 میں 38٪ تھی، تو موازنے کی مدت (مئی 2022) میں پہلے سے بلند قیمتیں تھیں۔ اس بنیادی اثر نے 2023 اور 2024 کے آخر میں CPI کو میکانکی طور پر نیچے کھینچا۔",
        rm: "'Bunyaadi asar' se muraad hai ke saalana bunyaad par inflation ke muwaazane muwaazane ki muddat mein qeematon ki satah se kaise maskh hote hain. Jab CPI May 2023 mein 38% thi, to muwaazane ki muddat (May 2022) mein pehle se buland qeematen thin. Is bunyaadi asar ne 2023 aur 2024 ke aakhir mein CPI ko makaniki tor par neeche khaincha.",
      },
    },
  ],
};
