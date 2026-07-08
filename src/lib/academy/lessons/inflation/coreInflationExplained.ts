import type { Lesson } from "@/lib/academy/types";

export const coreInflationExplainedLesson: Lesson = {
  slug: "core-inflation-explained",
  category: "inflation",
  title: { en: "Core Inflation: Stripping Out the Noise", ur: "بنیادی افراط زر: شور کو الگ کرنا", rm: "Bunyaadi Inflation: Shor ko Alag Karna" },
  subtitle: {
    en: "Why economists look beyond headline CPI to see the underlying inflation trend",
    ur: "ماہرین اقتصادیات بنیادی افراط زر کے رجحان کو دیکھنے کے لیے مجموعی CPI سے آگے کیوں دیکھتے ہیں",
    rm: "Maahireen iqtisaadiyaat bunyaadi inflation ke rujhaan ko dekhne ke liye majmooee CPI se aage kyun dekhte hain",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan", "core-inflation"],
  relatedLessonSlugs: ["cpi-explained", "food-inflation", "energy-inflation"],
  content: {
    overview: {
      en: "Core inflation measures price changes while excluding the most volatile items in the CPI basket — typically food and energy. These categories swing wildly due to weather, seasonal patterns, and global commodity shocks, creating 'noise' that can obscure the underlying inflation trend. Core inflation gives policymakers a clearer signal of persistent, demand-driven inflationary pressure — the type that monetary policy can actually influence — separate from temporary supply shocks that rates can't fix. The SBP monitors both headline and core CPI, but core inflation often guides monetary policy decisions more directly.",
      ur: "بنیادی افراط زر CPI ٹوکری میں سب سے غیر مستحکم اشیاء — عام طور پر خوراک اور توانائی — کو خارج کرتے ہوئے قیمت تبدیلیوں کو ناپتا ہے۔ یہ زمرے موسم، موسمی پیٹرن اور عالمی اجناس جھٹکوں کی وجہ سے وسیع پیمانے پر جھولتے ہیں، 'شور' پیدا کرتے ہیں جو بنیادی افراط زر رجحان کو دھندلا سکتا ہے۔",
      rm: "Bunyaadi inflation CPI tokri mein sab se ghair mustahkam ashaaya — aam tor par khuraak aur tawanaayi — ko khaarij karte hue qeemat tabdeeliyon ko naapata hai. Yeh zamre mausam, mausami pattern aur aalami ajnaas jhatkon ki wajah se wasee paimane par jhoolte hain, 'shor' paida karte hain jo bunyaadi inflation rujhaan ko dhundla sakta hai.",
    },
    whyItMatters: {
      en: "When headline CPI spikes due to a one-off vegetable price shock from flooding, raising interest rates won't help — the price rise will reverse naturally once the harvest normalises. But if core inflation is also rising, that signals broader, more persistent price pressure that monetary policy should address. The SBP's Monetary Policy Committee statements consistently reference core inflation trends because they provide a cleaner read on whether inflation is becoming entrenched versus being driven by temporary, self-correcting shocks.",
      ur: "جب سیلاب سے یکبارگی سبزی قیمت جھٹکے کی وجہ سے مجموعی CPI عروج پر ہو، شرح سود بڑھانا مدد نہیں کرے گا — قیمت اضافہ فصل معمول پر آنے کے بعد قدرتی طور پر پلٹے گا۔ لیکن اگر بنیادی افراط زر بھی بڑھ رہا ہے، یہ زیادہ وسیع، زیادہ پائیدار قیمت دباؤ کا اشارہ دیتا ہے۔",
      rm: "Jab sailaab se yak-baargi sabzi qeemat jhatke ki wajah se majmooee CPI uroj par ho, shar-e-sood barhana madad nahin karega — qeemat izaafa fasal maamool par aane ke baad qudrati tor par palte ga. Lekin agar bunyaadi inflation bhi barh raha hai, yeh zyada wasee, zyada paayidaar qeemat dabaao ka ishaara deta hai.",
    },
    explanation: {
      en: `**Why exclude food and energy:**

Food prices are volatile due to weather (droughts, floods), seasonal harvest cycles, and perishability (can't be stockpiled long). Energy prices are volatile due to geopolitical events, OPEC decisions, and global demand swings. Neither reflects the underlying, persistent inflationary momentum in the broader economy — they reflect temporary supply-and-demand mismatches in specific markets.

**Core CPI calculation:** Core CPI = CPI basket minus food and energy items, reweighted to sum to 100%. It captures price changes in categories like: housing, clothing, healthcare, education, transport (excluding fuel), communication, and recreation.

**Trimmed mean and median CPI — alternative core measures:**
Some central banks (and increasingly the SBP) also examine:
- **Trimmed mean CPI:** Removes the most extreme price changes (both increases and decreases) each month, regardless of category, then averages the remainder
- **Median CPI:** Takes the middle value of all price changes in the basket, ignoring both tails

These alternative measures can sometimes give an even cleaner signal than the traditional "ex-food-energy" core measure, especially when non-food/energy categories also experience temporary shocks.

**Headline vs core: reading the relationship:**
- Headline > Core: temporary factors (food/energy shocks) are pushing overall inflation up — may reverse
- Headline < Core: temporary factors are actually helping — underlying pressure is worse than the headline suggests
- Headline ≈ Core: inflation is broad-based and persistent — often the hardest scenario for policymakers, since there's no "transitory" component to wait out

**Pakistan's core inflation reality:** Pakistan's core inflation (both urban and rural, tracked separately by PBS) has also run persistently high (20%+ during 2022-23), confirming that Pakistan's inflation crisis wasn't just a food/energy blip — it reflected broad-based, entrenched price pressure requiring sustained monetary tightening, not just a temporary supply shock that would resolve itself.`,
      ur: `**خوراک اور توانائی کو کیوں خارج کریں:**

خوراک کی قیمتیں موسم کی وجہ سے غیر مستحکم ہیں۔ توانائی کی قیمتیں جغرافیائی سیاسی واقعات کی وجہ سے غیر مستحکم ہیں۔ کوئی بھی وسیع تر معیشت میں بنیادی، پائیدار افراط زر کی رفتار کی عکاسی نہیں کرتا۔

**بنیادی CPI حساب:** بنیادی CPI = CPI ٹوکری منہا خوراک اور توانائی اشیاء۔ یہ گھر، کپڑے، صحت کی دیکھ بھال، تعلیم، ٹرانسپورٹ جیسے زمروں میں قیمت تبدیلیوں کو پکڑتا ہے۔

**ٹرم شدہ اوسط اور میڈین CPI:**
- ٹرم شدہ اوسط CPI: ہر ماہ سب سے انتہائی قیمت تبدیلیوں کو ہٹاتا ہے
- میڈین CPI: ٹوکری میں تمام قیمت تبدیلیوں کی درمیانی قدر لیتا ہے

**مجموعی بمقابلہ بنیادی:**
- مجموعی > بنیادی: عارضی عوامل مجموعی افراط زر کو بڑھا رہے ہیں
- مجموعی < بنیادی: بنیادی دباؤ مجموعی سے بدتر ہے
- مجموعی ≈ بنیادی: افراط زر وسیع البنیاد اور پائیدار ہے`,
      rm: `**Khuraak aur tawanaayi ko kyun khaarij karein:**

Khuraak ki qeematen mausam ki wajah se ghair mustahkam hain. Tawanaayi ki qeematen jughrafiyaayi siyaasi waaqiaat ki wajah se ghair mustahkam hain. Koi bhi wasee tar muaashat mein bunyaadi, paayidaar inflation ki raftaar ki aksi nahin karta.

**Bunyaadi CPI hisaab:** Bunyaadi CPI = CPI tokri minus khuraak aur tawanaayi ashaaya. Yeh ghar, kapre, sehat ki dekh-bhaal, taleem, transport jaise zamron mein qeemat tabdeeliyon ko pakadta hai.

**Trim shuda ausat aur median CPI:**
- Trim shuda ausat CPI: har maah sab se intihaayi qeemat tabdeeliyon ko hataata hai
- Median CPI: tokri mein tamam qeemat tabdeeliyon ki darmiyaani qadr leta hai

**Majmooee ba-muqaabla bunyaadi:**
- Majmooee > Bunyaadi: aarzi awaamil majmooee inflation ko barha rahe hain
- Majmooee < Bunyaadi: bunyaadi dabaao majmooee se badtar hai
- Majmooee ≈ Bunyaadi: inflation wasee-ul-bunyaad aur paayidaar hai`,
    },
    misconceptions: {
      en: `**Myth 1: Core inflation is a 'fake' or misleading number designed to hide the real cost of living.** Core inflation isn't meant to replace headline CPI as a measure of household living costs — it's a policy analysis tool designed to identify persistent trends. Households should still track headline CPI for their actual budget planning; economists use core CPI for diagnosing structural inflation causes.

**Myth 2: If core inflation is low, there's no need to worry about overall inflation.** If food and energy prices remain persistently elevated (as in Pakistan's structural energy cost situation), households still suffer from high headline inflation even if core inflation looks more contained — the "noise" being excluded is very real spending for most families.

**Myth 3: Core and headline inflation always move in opposite directions.** They often move together, especially during broad-based inflation episodes. The distinction matters most when there's a clear divergence — signalling that a specific shock (not broad demand) is driving headline numbers.`,
      ur: `**غلط فہمی 1: بنیادی افراط زر ایک 'جعلی' یا گمراہ کن نمبر ہے جو زندگی کی حقیقی لاگت چھپانے کے لیے بنایا گیا۔** بنیادی افراط زر گھریلو رہن سہن کی لاگت کے پیمانے کے طور پر مجموعی CPI کی جگہ لینے کے لیے نہیں ہے۔

**غلط فہمی 2: اگر بنیادی افراط زر کم ہے، مجموعی افراط زر کی فکر کرنے کی ضرورت نہیں۔** اگر خوراک اور توانائی کی قیمتیں مستقل طور پر اعلی رہیں، گھرانے اب بھی اعلی مجموعی افراط زر کا شکار ہیں۔

**غلط فہمی 3: بنیادی اور مجموعی افراط زر ہمیشہ مخالف سمتوں میں حرکت کرتے ہیں۔** وہ اکثر ساتھ حرکت کرتے ہیں۔`,
      rm: `**Ghalat fehmi 1: Bunyaadi inflation ek 'jaali' ya gumraah-kun number hai jo zindagi ki haqeeqi lagat chhupaane ke liye banaya gaya.** Bunyaadi inflation ghareluu rehen sehen ki lagat ke paimaane ke tor par majmooee CPI ki jagah lene ke liye nahin hai.

**Ghalat fehmi 2: Agar bunyaadi inflation kam hai, majmooee inflation ki fikar karne ki zaroorat nahin.** Agar khuraak aur tawanaayi ki qeematen mustaqil tor par aali rahen, ghraane ab bhi aali majmooee inflation ka shikaar hain.

**Ghalat fehmi 3: Bunyaadi aur majmooee inflation hamesha mukhaalif samton mein harkat karte hain.** Woh aksar saath harkat karte hain.`,
    },
    pakistanExample: {
      en: `**Core vs headline during Pakistan's 2022-23 crisis:** During Pakistan's inflation peak, both headline CPI (38%) and core inflation (urban core hit ~18-20%, close to record highs for the series) rose sharply together — signalling that the crisis was NOT merely a food/energy blip but reflected broad-based demand and cost pressures spreading through housing, clothing, transport, and other core categories. This confirmed to the SBP that aggressive, sustained rate hikes (reaching 22%) were necessary rather than a wait-and-see approach — because core inflation showed the price pressure wasn't going to self-correct once the initial energy/food shock passed.`,
      ur: `**پاکستان کے 2022-23 بحران کے دوران بنیادی بمقابلہ مجموعی:** پاکستان کے افراط زر عروج کے دوران، مجموعی CPI (38٪) اور بنیادی افراط زر (شہری بنیادی ~18-20٪ تک پہنچا) دونوں ایک ساتھ تیزی سے بڑھے — یہ اشارہ دیتے ہوئے کہ بحران صرف خوراک/توانائی جھٹکا نہیں تھا۔`,
      rm: `**Pakistan ke 2022-23 bohran ke dauraan bunyaadi ba-muqaabla majmooee:** Pakistan ke inflation uroj ke dauraan, majmooee CPI (38%) aur bunyaadi inflation (shehri bunyaadi ~18-20% tak pohuncha) dono ek saath tezi se barhe — yeh ishaara dete hue ke bohran sirf khuraak/tawanaayi jhatka nahin tha.`,
    },
    realWorld: {
      en: "The US Federal Reserve's use of 'core PCE' (Personal Consumption Expenditures, excluding food and energy) as its preferred inflation gauge illustrates the practical value of core measures. During 2021-22, headline US CPI spiked partly due to volatile used car prices and energy costs from the Ukraine war. The Fed watched core PCE closely to judge whether inflation was becoming broadly entrenched (requiring aggressive rate hikes) versus driven by temporary, resolvable supply chain issues. When core measures also began rising persistently, the Fed concluded rate hikes were necessary — demonstrating how core inflation measures guide real, consequential policy decisions rather than being an academic exercise.",
      ur: "امریکی فیڈرل ریزرو کا 'کور PCE' استعمال کرنا بنیادی پیمانوں کی عملی قدر کو واضح کرتا ہے۔ 2021-22 کے دوران، مجموعی امریکی CPI جزوی طور پر غیر مستحکم استعمال شدہ کار قیمتوں اور یوکرین جنگ سے توانائی لاگت کی وجہ سے عروج پر پہنچا۔ فیڈ نے یہ فیصلہ کرنے کے لیے کور PCE کو قریب سے دیکھا کہ آیا افراط زر وسیع طور پر جڑ پکڑ رہا ہے۔",
      rm: "Amreeki Federal Reserve ka 'core PCE' istemal karna bunyaadi paimaanoN ki amali qadr ko waazeh karta hai. 2021-22 ke dauraan, majmooee Amreeki CPI juz'wi tor par ghair mustahkam istemal shuda car qeematon aur Ukraine jang se tawanaayi lagat ki wajah se uroj par pohuncha. Fed ne yeh faisla karne ke liye core PCE ko qareeb se dekha ke aaya inflation wasee tor par jarh pakad raha hai.",
    },
    summary: {
      en: "• Core inflation: CPI excluding food and energy — filters out volatile, temporary shocks\n• Reveals underlying, persistent inflation trend that monetary policy can address\n• Headline > Core: temporary factors driving inflation up (may self-correct)\n• Headline ≈ Core: broad-based, persistent inflation (harder to fix, requires sustained policy)\n• Alternative measures: trimmed mean CPI, median CPI — remove extreme changes regardless of category\n• Pakistan's 2022-23 crisis: both core and headline rose together, confirming entrenched, broad-based inflation",
      ur: "• بنیادی افراط زر: CPI منہا خوراک اور توانائی — غیر مستحکم، عارضی جھٹکوں کو فلٹر کرتا ہے\n• بنیادی، پائیدار افراط زر رجحان کو ظاہر کرتا ہے\n• مجموعی > بنیادی: عارضی عوامل افراط زر بڑھا رہے ہیں\n• مجموعی ≈ بنیادی: وسیع البنیاد، پائیدار افراط زر\n• متبادل پیمانے: ٹرم شدہ اوسط CPI، میڈین CPI\n• پاکستان کا 2022-23 بحران: بنیادی اور مجموعی دونوں ساتھ بڑھے",
      rm: "• Bunyaadi inflation: CPI minus khuraak aur tawanaayi — ghair mustahkam, aarzi jhatkon ko filter karta hai\n• Bunyaadi, paayidaar inflation rujhaan ko zaahir karta hai\n• Majmooee > Bunyaadi: aarzi awaamil inflation barha rahe hain\n• Majmooee ≈ Bunyaadi: wasee-ul-bunyaad, paayidaar inflation\n• Mutabaadil paimaane: trim shuda ausat CPI, median CPI\n• Pakistan ka 2022-23 bohran: bunyaadi aur majmooee dono saath barhe",
    },
  },
  quiz: [
    {
      question: { en: "Why do economists exclude food and energy from core inflation measures?", ur: "ماہرین اقتصادیات بنیادی افراط زر پیمانوں سے خوراک اور توانائی کو کیوں خارج کرتے ہیں؟", rm: "Maahireen iqtisaadiyaat bunyaadi inflation paimaanoN se khuraak aur tawanaayi ko kyun khaarij karte hain?" },
      options: [
        { en: "Because food and energy are unimportant to households", ur: "کیونکہ خوراک اور توانائی گھرانوں کے لیے غیر اہم ہیں", rm: "Kyunke khuraak aur tawanaayi ghraanon ke liye ghair-ahem hain" },
        { en: "Because they're highly volatile due to weather, seasons, and geopolitics, obscuring the underlying persistent inflation trend", ur: "کیونکہ وہ موسم، موسموں اور جغرافیائی سیاست کی وجہ سے انتہائی غیر مستحکم ہیں، بنیادی پائیدار افراط زر رجحان کو دھندلاتے ہیں", rm: "Kyunke woh mausam, mausamon aur jughrafiyaayi siyaasat ki wajah se intihaayi ghair mustahkam hain, bunyaadi paayidaar inflation rujhaan ko dhundlaate hain" },
        { en: "Because food and energy prices never change", ur: "کیونکہ خوراک اور توانائی کی قیمتیں کبھی تبدیل نہیں ہوتیں", rm: "Kyunke khuraak aur tawanaayi ki qeematen kabhi tabdeel nahin hoteeN" },
        { en: "Because the PBS doesn't collect data on food and energy", ur: "کیونکہ PBS خوراک اور توانائی پر ڈیٹا جمع نہیں کرتا", rm: "Kyunke PBS khuraak aur tawanaayi par data jamaa nahin karta" },
      ],
      correctIndex: 1,
      explanation: { en: "Food prices swing due to weather and harvest cycles; energy prices swing due to geopolitical events and OPEC decisions. Neither reflects broad, demand-driven inflation momentum in the economy — they create 'noise' around the true underlying trend, which core inflation strips away to give policymakers a clearer signal.", ur: "خوراک کی قیمتیں موسم اور فصل کے چکروں کی وجہ سے جھولتی ہیں؛ توانائی کی قیمتیں جغرافیائی سیاسی واقعات کی وجہ سے جھولتی ہیں۔ کوئی بھی معیشت میں وسیع، طلب سے چلنے والی افراط زر رفتار کی عکاسی نہیں کرتا۔", rm: "Khuraak ki qeematen mausam aur fasal ke chakron ki wajah se jhoolti hain; tawanaayi ki qeematen jughrafiyaayi siyaasi waaqiaat ki wajah se jhoolti hain. Koi bhi muaashat mein wasee, talab se chalne wali inflation raftaar ki aksi nahin karta." },
    },
    {
      question: { en: "If headline CPI is 40% but core inflation is 15%, what does this suggest?", ur: "اگر مجموعی CPI 40٪ ہے لیکن بنیادی افراط زر 15٪ ہے، اس کا کیا مطلب ہے؟", rm: "Agar majmooee CPI 40% hai lekin bunyaadi inflation 15% hai, is ka kya matlab hai?" },
      options: [
        { en: "The headline number is fake and should be ignored", ur: "مجموعی نمبر جعلی ہے اور اسے نظرانداز کرنا چاہیے", rm: "Majmooee number jaali hai aur ise nazarandaaz karna chahiye" },
        { en: "A large part of the inflation is being driven by volatile food/energy prices that may reverse, rather than broad-based, persistent price pressure", ur: "افراط زر کا ایک بڑا حصہ غیر مستحکم خوراک/توانائی قیمتوں سے چل رہا ہے جو الٹ سکتی ہیں، وسیع البنیاد، پائیدار قیمت دباؤ کی بجائے", rm: "Inflation ka ek bara hissa ghair mustahkam khuraak/tawanaayi qeematon se chal raha hai jo ulat sakti hain, wasee-ul-bunyaad, paayidaar qeemat dabaao ki bajaaye" },
        { en: "Core inflation is always higher than headline inflation", ur: "بنیادی افراط زر ہمیشہ مجموعی افراط زر سے زیادہ ہوتا ہے", rm: "Bunyaadi inflation hamesha majmooee inflation se zyada hota hai" },
        { en: "The country is experiencing deflation", ur: "ملک افلاس زر کا سامنا کر رہا ہے", rm: "Mulk iflaas-e-zer ka saamna kar raha hai" },
      ],
      correctIndex: 1,
      explanation: { en: "A large gap between headline (40%) and core (15%) inflation suggests that volatile food and energy prices are driving most of the headline number. Since these categories can self-correct once weather/supply conditions normalise, aggressive monetary tightening solely based on the headline number might overreact — though policymakers still need to watch for second-round effects on core inflation.", ur: "مجموعی (40٪) اور بنیادی (15٪) افراط زر کے درمیان بڑا فرق بتاتا ہے کہ غیر مستحکم خوراک اور توانائی قیمتیں زیادہ تر مجموعی نمبر چلا رہی ہیں۔ چونکہ یہ زمرے موسم/سپلائی حالات معمول پر آنے کے بعد خود کو ٹھیک کر سکتے ہیں۔", rm: "Majmooee (40%) aur bunyaadi (15%) inflation ke darmiyan bara faraq batata hai ke ghair mustahkam khuraak aur tawanaayi qeematen zyada tar majmooee number chala rahi hain. Chunke yeh zamre mausam/supply haalaat maamool par aane ke baad khud ko theek kar sakte hain." },
    },
    {
      question: { en: "What does it mean when both headline and core inflation rise together, as happened in Pakistan during 2022-23?", ur: "پاکستان میں 2022-23 کے دوران جیسا ہوا، جب مجموعی اور بنیادی دونوں افراط زر ایک ساتھ بڑھیں تو اس کا کیا مطلب ہے؟", rm: "Pakistan mein 2022-23 ke dauraan jaisa hua, jab majmooee aur bunyaadi dono inflation ek saath barhein to is ka kya matlab hai?" },
      options: [
        { en: "The inflation is purely a temporary food price shock", ur: "افراط زر خالصتاً عارضی خوراک قیمت جھٹکا ہے", rm: "Inflation khaalistan aarzi khuraak qeemat jhatka hai" },
        { en: "The inflation is broad-based and persistent, spreading through housing, transport, clothing, and other core categories — requiring sustained monetary policy response", ur: "افراط زر وسیع البنیاد اور پائیدار ہے، گھر، ٹرانسپورٹ، کپڑوں اور دیگر بنیادی زمروں میں پھیل رہا ہے — مستقل مالیاتی پالیسی ردعمل کی ضرورت ہے", rm: "Inflation wasee-ul-bunyaad aur paayidaar hai, ghar, transport, kapron aur doosre bunyaadi zamron mein phail raha hai — mustaqil maaliyaati policy rad-e-amal ki zaroorat hai" },
        { en: "It means the SBP miscalculated both numbers", ur: "اس کا مطلب ہے SBP نے دونوں نمبروں کا غلط حساب لگایا", rm: "Is ka matlab hai SBP ne dono numbron ka ghalat hisaab lagaya" },
        { en: "It has no policy implications whatsoever", ur: "اس کا کوئی پالیسی مضمرات نہیں", rm: "Is ka koi policy muzammiraat nahin" },
      ],
      correctIndex: 1,
      explanation: { en: "When core inflation rises alongside headline inflation, it signals that price pressure has broadened beyond just volatile food/energy categories into housing, clothing, transport, and services — the type of persistent, demand/cost-driven inflation that monetary policy needs to address through sustained rate hikes, as the SBP did in 2022-23.", ur: "جب بنیادی افراط زر مجموعی افراط زر کے ساتھ بڑھتا ہے، یہ اشارہ دیتا ہے کہ قیمت دباؤ صرف غیر مستحکم خوراک/توانائی زمروں سے آگے گھر، کپڑوں، ٹرانسپورٹ اور خدمات میں پھیل گیا ہے۔", rm: "Jab bunyaadi inflation majmooee inflation ke saath barhta hai, yeh ishaara deta hai ke qeemat dabaao sirf ghair mustahkam khuraak/tawanaayi zamron se aage ghar, kapron, transport aur khadamaat mein phail gaya hai." },
    },
  ],
  faq: [
    {
      question: { en: "If I'm just a regular person, should I care about core inflation or only headline CPI?", ur: "اگر میں صرف ایک عام شخص ہوں، مجھے بنیادی افراط زر کی فکر کرنی چاہیے یا صرف مجموعی CPI کی؟", rm: "Agar main sirf ek aam shakhs hun, mujhe bunyaadi inflation ki fikar karni chahiye ya sirf majmooee CPI ki?" },
      answer: { en: "For your personal budgeting, headline CPI (or better yet, your own specific spending pattern) is more directly relevant — it reflects the actual prices you pay for everything, including food and fuel. Core inflation is primarily a policy analysis tool for economists and central bankers to diagnose the nature and persistence of inflation. However, understanding core inflation can help you interpret news about interest rate decisions: if you hear the SBP raised rates despite headline inflation falling, it's often because core inflation remained stubbornly high — telling you that underlying price pressures (and likely borrowing costs) will stay elevated for longer than the headline number alone might suggest.", ur: "آپ کی ذاتی بجٹنگ کے لیے، مجموعی CPI (یا بہتر، آپ کا اپنا مخصوص خرچ پیٹرن) زیادہ براہ راست متعلقہ ہے — یہ ہر چیز کے لیے آپ کی ادا کردہ حقیقی قیمتوں کی عکاسی کرتا ہے۔ بنیادی افراط زر بنیادی طور پر معاشی ماہرین اور مرکزی بینکروں کے لیے ایک پالیسی تجزیہ آلہ ہے۔", rm: "Aap ki zaati budgeting ke liye, majmooee CPI (ya behtar, aap ka apna makhsoos kharch pattern) zyada baraah-e-raast mutaalliq hai — yeh har cheez ke liye aap ki ada karda haqeeqi qeematon ki aksi karta hai. Bunyaadi inflation bunyaadi tor par muaashi maahireen aur markazi bankaron ke liye ek policy tajziya aala hai." },
    },
  ],
};
