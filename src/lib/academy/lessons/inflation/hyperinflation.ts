import type { Lesson } from "@/lib/academy/types";

export const hyperinflationLesson: Lesson = {
  slug: "hyperinflation",
  category: "inflation",
  title: { en: "Hyperinflation: When Money Loses All Meaning", ur: "ہائپر افراط زر: جب پیسہ اپنا مطلب کھو دیتا ہے", rm: "Hyper Inflation: Jab Paisa Apna Matlab Kho Deta Hai" },
  subtitle: {
    en: "The extreme end of inflation — Zimbabwe, Weimar Germany, Venezuela, and why Pakistan hasn't reached this stage",
    ur: "افراط زر کی انتہا — زمبابوے، ویمار جرمنی، وینزویلا، اور پاکستان اس مرحلے تک کیوں نہیں پہنچا",
    rm: "Inflation ki inteha — Zimbabwe, Weimar Germany, Venezuela, aur Pakistan is marhale tak kyun nahin pohuncha",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan"],
  relatedLessonSlugs: ["types-of-inflation", "demand-pull", "money-and-currency"],
  content: {
    overview: {
      en: "Hyperinflation is inflation so extreme it destroys the basic function of money. Economists typically define it as prices rising more than 50% per month — meaning prices double roughly every 3 weeks. At this level, money becomes worthless faster than people can spend it. Hyperinflation is almost always caused by governments printing money uncontrollably to finance spending they can't fund through taxes or borrowing. Pakistan has faced serious inflation (peak 38% annually in 2023) but is nowhere near hyperinflation territory — understanding the difference matters for calibrating how alarmed to be.",
      ur: "ہائپر افراط زر اتنا انتہائی افراط زر ہے کہ یہ پیسے کے بنیادی کام کو تباہ کر دیتا ہے۔ ماہرین اقتصادیات عام طور پر اسے قیمتوں میں ماہانہ 50٪ سے زیادہ اضافے کے طور پر بیان کرتے ہیں — یعنی قیمتیں تقریباً ہر 3 ہفتوں میں دوگنی ہو جاتی ہیں۔ پاکستان نے سنگین افراط زر (2023 میں سالانہ 38٪ عروج) کا سامنا کیا ہے لیکن ہائپر افراط زر کے علاقے کے قریب کہیں نہیں ہے۔",
      rm: "Hyper inflation itna intihaayi inflation hai ke yeh paise ke bunyaadi kaam ko tabaah kar deta hai. Maahireen iqtisaadiyaat umuman ise qeematon mein maahana 50% se zyada izaafe ke tor par bayaan karte hain — yani qeematen taqreeban har 3 haftoN mein dugni ho jaati hain. Pakistan ne sangeen inflation (2023 mein saalaana 38% uroj) ka saamna kiya hai lekin hyper inflation ke ilaaqe ke qareeb kahin nahin hai.",
    },
    whyItMatters: {
      en: "Understanding hyperinflation's causes and warning signs helps Pakistanis correctly assess risk. Media sometimes uses alarming language ('Pakistan heading toward Zimbabwe-style collapse') that isn't grounded in economic reality. Hyperinflation requires a very specific failure mode: the government losing all ability to finance itself except by printing money, combined with a total collapse of confidence in the currency. Pakistan's debt problems are serious, but its institutions (SBP independence since 2022, IMF-monitored fiscal discipline) provide guardrails that hyperinflation cases typically lack.",
      ur: "ہائپر افراط زر کی وجوہات اور انتباہی علامات کو سمجھنا پاکستانیوں کو خطرے کا صحیح اندازہ لگانے میں مدد کرتا ہے۔ میڈیا کبھی کبھی خطرناک زبان استعمال کرتا ہے جو معاشی حقیقت میں جڑی نہیں ہے۔ ہائپر افراط زر کو ایک بہت مخصوص ناکامی موڈ کی ضرورت ہے: حکومت کا پیسہ چھاپنے کے علاوہ خود کو فنانس کرنے کی تمام صلاحیت کھو دینا۔",
      rm: "Hyper inflation ki wajoohaatein aur intibaahi alaamaat ko samajhna Pakistaniyon ko khatre ka sahih andaaza lagane mein madad karta hai. Media kabhi kabhi khatarnaak zubaan istemal karta hai jo muaashi haqeeqat mein juri nahin hai. Hyper inflation ko ek bahut makhsoos naakaami mode ki zaroorat hai: hukoomat ka paisa chhaapne ke alaawa khud ko finance karne ki tamam salaaḥiyat kho dena.",
    },
    explanation: {
      en: `**Defining hyperinflation:**
The classic economic threshold (Cagan's definition): inflation exceeding 50% per MONTH. At that rate:
- Prices double every ~3 weeks
- Money loses meaningful value within days
- People spend wages immediately (before they lose value)
- Barter or foreign currency often replaces the local currency

**The mechanism:**
1. Government has large deficit it cannot finance through taxes or normal borrowing (nobody wants to lend anymore)
2. Government instructs the central bank to print money to cover the gap
3. More money chasing the same goods → prices rise
4. As prices rise, government's real revenue (fixed nominal taxes, rising prices) falls further behind expenses
5. Government prints even more money to cover the now-larger gap
6. This becomes a self-reinforcing spiral — the "inflation tax" becomes a death spiral

**Why it's different from ordinary inflation:**
- Ordinary inflation (Pakistan's 20-38%): prices rise significantly but money still functions — people use bank accounts, sign contracts, save
- Hyperinflation: money stops functioning as a store of value or unit of account; people switch to barter, foreign currency (dollarization), or gold

**Famous hyperinflation cases:**
- Germany (1921-23): prices rose 1 trillion percent; workers paid twice daily
- Zimbabwe (2007-08): inflation hit 79.6 billion percent per month at its peak; printed a 100 trillion dollar note
- Venezuela (2016-2019): inflation exceeded 1,000,000% annually; people weighed banknotes instead of counting them
- Hungary (1945-46): worst hyperinflation ever recorded — prices doubled every 15 hours

**Why Pakistan is not at risk of hyperinflation (currently):** Despite serious fiscal problems, Pakistan retains: functioning tax collection (~Rs10 trillion/year), access to external financing (IMF, bilateral loans), an independent SBP (2022 SBP Act reduced direct government borrowing from the central bank), and functioning capital markets. These are exactly the mechanisms that, when they fail entirely, produce hyperinflation.`,
      ur: `**ہائپر افراط زر کی تعریف:**
کلاسک معاشی حد (کیگن کی تعریف): ماہانہ 50٪ سے زیادہ افراط زر۔ اس شرح پر:
- قیمتیں ہر ~3 ہفتوں میں دوگنی ہو جاتی ہیں
- پیسہ دنوں کے اندر بامعنی قدر کھو دیتا ہے

**طریقہ کار:**
1. حکومت کا بڑا خسارہ جسے وہ ٹیکس یا عام قرض سے فنانس نہیں کر سکتی
2. حکومت مرکزی بینک کو خلا پر کرنے کے لیے پیسہ چھاپنے کی ہدایت کرتی ہے
3. زیادہ پیسہ ایک جیسی اشیاء کے پیچھے → قیمتیں بڑھتی ہیں
4. یہ خود مضبوط سرپل بن جاتا ہے

**مشہور ہائپر افراط زر کیسز:**
- جرمنی (1921-23): قیمتیں 1 ٹریلین فیصد بڑھیں
- زمبابوے (2007-08): افراط زر عروج پر ماہانہ 79.6 ارب فیصد تک پہنچا

**پاکستان ہائپر افراط زر کے خطرے میں کیوں نہیں ہے:** سنگین مالی مسائل کے باوجود، پاکستان برقرار رکھتا ہے: کام کرنے والا ٹیکس جمع کرنا، بیرونی فنانسنگ تک رسائی، آزاد SBP۔`,
      rm: `**Hyper inflation ki tareef:**
Classic muaashi hadd (Cagan ki tareef): maahana 50% se zyada inflation. Is shar par:
- Qeematen har ~3 haftoN mein dugni ho jaati hain
- Paisa dinon ke andar baa-maani qadr kho deta hai

**Tareeqa-kaar:**
1. Hukoomat ka bara khasaara jise woh tax ya aam qarz se finance nahin kar sakti
2. Hukoomat markazi bank ko khala poora karne ke liye paisa chhaapne ki hidaayat karti hai
3. Zyada paisa ek jaisi ashaaya ke peechhe → qeematen barhti hain
4. Yeh khud mazboot spiral ban jaata hai

**Mashhoor hyper inflation cases:**
- Germany (1921-23): qeematen 1 trillion fisad barhin
- Zimbabwe (2007-08): inflation uroj par maahana 79.6 arab fisad tak pohuncha

**Pakistan hyper inflation ke khatre mein kyun nahin hai:** Sangeen maali masaail ke bawajood, Pakistan barqaraar rakhta hai: kaam karne wala tax jamaa karna, baeruni financing tak rasaai, aazaad SBP.`,
    },
    misconceptions: {
      en: `**Myth 1: Pakistan's inflation could turn into hyperinflation at any time.** Hyperinflation requires total loss of fiscal financing options and central bank independence collapse. Pakistan's 38% peak inflation, while painful, is orders of magnitude below hyperinflation thresholds (50%+ per MONTH, not year).

**Myth 2: Hyperinflation is caused by external factors like war or sanctions alone.** While wars and sanctions can trigger the fiscal crisis that leads to hyperinflation, the proximate cause is always domestic: a government printing money because it has no other financing option. Venezuela's hyperinflation was driven by internal fiscal mismanagement compounded by (not solely caused by) sanctions.

**Myth 3: Once hyperinflation starts, it's impossible to stop.** Hyperinflation can be stopped through currency reform (introducing a new, credible currency), fiscal discipline (balancing the budget), and often IMF-style stabilisation programmes. Germany ended its 1923 hyperinflation within months by introducing the Rentenmark, backed by land value, and committing to fiscal discipline.`,
      ur: `**غلط فہمی 1: پاکستان کا افراط زر کسی بھی وقت ہائپر افراط زر میں بدل سکتا ہے۔** ہائپر افراط زر کو مالی فنانسنگ اختیارات کے مکمل نقصان کی ضرورت ہے۔ پاکستان کا 38٪ عروج افراط زر ہائپر افراط زر کی حدود سے بہت نیچے ہے۔

**غلط فہمی 2: ہائپر افراط زر صرف جنگ یا پابندیوں جیسے بیرونی عوامل کی وجہ سے ہوتا ہے۔** فوری وجہ ہمیشہ ملکی ہوتی ہے۔

**غلط فہمی 3: ہائپر افراط زر شروع ہونے کے بعد اسے روکنا ناممکن ہے۔** کرنسی اصلاح، مالی نظم و ضبط کے ذریعے روکا جا سکتا ہے۔`,
      rm: `**Ghalat fehmi 1: Pakistan ka inflation kisi bhi waqt hyper inflation mein badal sakta hai.** Hyper inflation ko maali financing ikhtiyaaraat ke mukammal nuqsaan ki zaroorat hai. Pakistan ka 38% uroj inflation hyper inflation ki hududat se bahut neeche hai.

**Ghalat fehmi 2: Hyper inflation sirf jang ya paabandiyon jaise bairooni awaamil ki wajah se hota hai.** Fori wajah hamesha mulki hoti hai.

**Ghalat fehmi 3: Hyper inflation shuroo hone ke baad ise rokna na-mumkin hai.** Currency islaah, maali nazm-o-zabt ke zariye roka ja sakta hai.`,
    },
    pakistanExample: {
      en: `**Why Pakistan's 2023 crisis wasn't hyperinflation:** At its worst, Pakistan's CPI hit 38% year-on-year (May 2023) — roughly 2.7% per month on average. Hyperinflation requires 50% per MONTH. Pakistan's inflation was severe and painful for households, but the Pakistani rupee remained functional: banks operated normally, salaries were paid monthly without immediate spending panic, and contracts continued to be denominated in rupees. The distinction matters: Pakistan faced a serious but manageable inflation crisis requiring IMF-supported stabilisation — not a currency collapse requiring redenomination or dollarization as Zimbabwe and Venezuela experienced.`,
      ur: `**پاکستان کا 2023 بحران ہائپر افراط زر کیوں نہیں تھا:** اپنی بدترین حالت میں، پاکستان کا CPI سالانہ 38٪ (مئی 2023) تک پہنچا — اوسطاً تقریباً ماہانہ 2.7٪۔ ہائپر افراط زر کو ماہانہ 50٪ کی ضرورت ہے۔ پاکستان کا افراط زر شدید اور تکلیف دہ تھا لیکن پاکستانی روپیہ کام کر رہا تھا: بینک معمول کے مطابق کام کر رہے تھے، تنخواہیں ماہانہ ادا کی جا رہی تھیں۔`,
      rm: `**Pakistan ka 2023 bohran hyper inflation kyun nahin tha:** Apni badtareen haalat mein, Pakistan ka CPI saalaana 38% (May 2023) tak pohuncha — ausatan taqreeban maahana 2.7%. Hyper inflation ko maahana 50% ki zaroorat hai. Pakistan ka inflation shadeed aur takleef deh tha lekin Pakistani rupaya kaam kar raha tha: bank maamool ke mutaabiq kaam kar rahe the, tankhaahein maahana ada ki ja rahi thin.`,
    },
    realWorld: {
      en: "Zimbabwe's 2007-08 hyperinflation is the most extreme documented case. Inflation reached 79.6 billion percent per month — meaning prices doubled every 24.7 hours. The government printed a 100 trillion Zimbabwean dollar note (worth about $30 at the time). People carried cash in wheelbarrows to buy groceries. Workers demanded to be paid daily, sometimes twice daily, and spent the money within hours. The root cause: the government's uncontrolled land reform destroyed agricultural export earnings, and the central bank printed money to cover the resulting fiscal collapse. Zimbabwe eventually abandoned its currency entirely, adopting the US dollar.",
      ur: "زمبابوے کا 2007-08 ہائپر افراط زر سب سے انتہائی دستاویزی کیس ہے۔ افراط زر ماہانہ 79.6 ارب فیصد تک پہنچا — یعنی قیمتیں ہر 24.7 گھنٹے میں دوگنی ہو جاتی تھیں۔ حکومت نے 100 ٹریلین زمبابوین ڈالر کا نوٹ چھاپا۔ لوگ گروسری خریدنے کے لیے ٹھیلوں میں نقد لے جاتے تھے۔",
      rm: "Zimbabwe ka 2007-08 hyper inflation sab se intihaayi dastaweazi case hai. Inflation maahana 79.6 arab fisad tak pohuncha — yani qeematen har 24.7 ghante mein dugni ho jaati thin. Hukoomat ne 100 trillion Zimbabwean dollar ka note chhaapa. Log grocery khareedne ke liye theloN mein naqad le jaate the.",
    },
    summary: {
      en: "• Hyperinflation: prices rising >50% per MONTH — money loses meaningful function\n• Mechanism: government prints money to cover deficit → self-reinforcing spiral\n• Famous cases: Weimar Germany (1923), Zimbabwe (2008), Venezuela (2016-19), Hungary (1946)\n• Pakistan's 38% annual peak (2023) is far below hyperinflation threshold (50%/month)\n• Pakistan retains functioning tax system, external financing, independent SBP — guardrails against hyperinflation\n• Hyperinflation is stoppable through currency reform + fiscal discipline (Germany's 1923 example)",
      ur: "• ہائپر افراط زر: قیمتیں ماہانہ >50٪ بڑھتی ہیں — پیسہ بامعنی کام کھو دیتا ہے\n• طریقہ کار: حکومت خسارہ پورا کرنے کے لیے پیسہ چھاپتی ہے → خود مضبوط سرپل\n• مشہور کیسز: ویمار جرمنی (1923)، زمبابوے (2008)، وینزویلا (2016-19)\n• پاکستان کا 38٪ سالانہ عروج (2023) ہائپر افراط زر کی حد سے بہت نیچے ہے\n• پاکستان کام کرنے والا ٹیکس نظام، بیرونی فنانسنگ، آزاد SBP برقرار رکھتا ہے\n• ہائپر افراط زر کرنسی اصلاح + مالی نظم کے ذریعے روکا جا سکتا ہے",
      rm: "• Hyper inflation: qeematen maahana >50% barhti hain — paisa baa-maani kaam kho deta hai\n• Tareeqa-kaar: hukoomat khasaara poora karne ke liye paisa chhaapti hai → khud mazboot spiral\n• Mashhoor cases: Weimar Germany (1923), Zimbabwe (2008), Venezuela (2016-19)\n• Pakistan ka 38% saalaana uroj (2023) hyper inflation ki hadd se bahut neeche hai\n• Pakistan kaam karne wala tax nizam, baeruni financing, aazaad SBP barqaraar rakhta hai\n• Hyper inflation currency islaah + maali nazm ke zariye roka ja sakta hai",
    },
  },
  quiz: [
    {
      question: { en: "What is the standard economic threshold that defines 'hyperinflation'?", ur: "'ہائپر افراط زر' کی تعریف کرنے والی معیاری معاشی حد کیا ہے؟", rm: "'Hyper inflation' ki tareef karne wali mayaari muaashi hadd kya hai?" },
      options: [
        { en: "Prices rising more than 10% per year", ur: "قیمتیں سالانہ 10٪ سے زیادہ بڑھیں", rm: "Qeematen saalaana 10% se zyada barhein" },
        { en: "Prices rising more than 50% per MONTH", ur: "قیمتیں ماہانہ 50٪ سے زیادہ بڑھیں", rm: "Qeematen maahana 50% se zyada barhein" },
        { en: "Prices rising more than 20% per year", ur: "قیمتیں سالانہ 20٪ سے زیادہ بڑھیں", rm: "Qeematen saalaana 20% se zyada barhein" },
        { en: "Any inflation above the central bank's target", ur: "مرکزی بینک کے ہدف سے اوپر کوئی بھی افراط زر", rm: "Markazi bank ke hadaf se uupar koi bhi inflation" },
      ],
      correctIndex: 1,
      explanation: { en: "Cagan's classic definition of hyperinflation is prices rising more than 50% in a single month — meaning prices double roughly every 3 weeks. This is a dramatically higher threshold than Pakistan's worst annual inflation rate of 38%, which works out to only about 2.7% per month.", ur: "کیگن کی ہائپر افراط زر کی کلاسک تعریف ایک مہینے میں قیمتوں کا 50٪ سے زیادہ بڑھنا ہے — یعنی قیمتیں تقریباً ہر 3 ہفتوں میں دوگنی ہو جاتی ہیں۔ یہ پاکستان کی بدترین سالانہ افراط زر شرح 38٪ سے کہیں زیادہ حد ہے۔", rm: "Cagan ki hyper inflation ki classic tareef ek maheene mein qeematon ka 50% se zyada barhna hai — yani qeematen taqreeban har 3 haftoN mein dugni ho jaati hain. Yeh Pakistan ki badtareen saalaana inflation shar 38% se kahin zyada hadd hai." },
    },
    {
      question: { en: "What is the core mechanism that causes hyperinflation?", ur: "ہائپر افراط زر کا اصل طریقہ کار کیا ہے؟", rm: "Hyper inflation ka asal tareeqa-kaar kya hai?" },
      options: [
        { en: "High global oil prices", ur: "اعلی عالمی تیل قیمتیں", rm: "Aali aalami tel qeematen" },
        { en: "A government printing unlimited money to finance deficits it cannot cover through taxes or borrowing", ur: "ایک حکومت جو ٹیکس یا قرض سے پورے نہ کیے جا سکنے والے خسارے کو فنانس کرنے کے لیے لامحدود پیسہ چھاپتی ہے", rm: "Ek hukoomat jo tax ya qarz se poore na kiye ja sakne wale khasaare ko finance karne ke liye laa-mahdood paisa chhaapti hai" },
        { en: "Consumers buying too many imported goods", ur: "صارفین بہت زیادہ درآمدی اشیاء خریدتے ہیں", rm: "Saraafeen bahut zyada daraamdaati ashaaya khareedte hain" },
        { en: "The central bank raising interest rates too high", ur: "مرکزی بینک شرح سود کو بہت اونچا بڑھاتا ہے", rm: "Markazi bank shar-e-sood ko bahut uunch a barhata hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Hyperinflation's root cause is always a government that has exhausted normal financing options (taxes, bond sales) and resorts to printing money to cover its deficit. This creates a self-reinforcing spiral: more money chasing goods raises prices, which further erodes real tax revenue, prompting even more money printing.", ur: "ہائپر افراط زر کی جڑ کی وجہ ہمیشہ ایک حکومت ہوتی ہے جس نے عام فنانسنگ اختیارات ختم کر دیے ہیں اور اپنے خسارے کو پورا کرنے کے لیے پیسہ چھاپنے کا سہارا لیتی ہے۔ یہ ایک خود مضبوط سرپل پیدا کرتا ہے۔", rm: "Hyper inflation ki jarh ki wajah hamesha ek hukoomat hoti hai jis ne aam financing ikhtiyaaraat khatam kar diye hain aur apne khasaare ko poora karne ke liye paisa chhaapne ka sahaara leti hai. Yeh ek khud mazboot spiral paida karta hai." },
    },
    {
      question: { en: "Why hasn't Pakistan's inflation crisis turned into hyperinflation despite serious debt problems?", ur: "سنگین قرض کے مسائل کے باوجود پاکستان کا افراط زر بحران ہائپر افراط زر میں کیوں نہیں بدلا؟", rm: "Sangeen qarz ke masaail ke bawajood Pakistan ka inflation bohran hyper inflation mein kyun nahin badla?" },
      options: [
        { en: "Pakistan has no fiscal problems at all", ur: "پاکستان کو کوئی مالی مسائل نہیں ہیں", rm: "Pakistan ko koi maali masaail nahin hain" },
        { en: "Pakistan retains functioning tax collection, external financing access (IMF/bilateral), and an independent central bank", ur: "پاکستان کام کرنے والا ٹیکس جمع، بیرونی فنانسنگ رسائی، اور آزاد مرکزی بینک برقرار رکھتا ہے", rm: "Pakistan kaam karne wala tax jamaa, baeruni financing rasaai, aur aazaad markazi bank barqaraar rakhta hai" },
        { en: "Pakistan has never printed any money", ur: "پاکستان نے کبھی کوئی پیسہ نہیں چھاپا", rm: "Pakistan ne kabhi koi paisa nahin chhaapa" },
        { en: "Hyperinflation only happens in African countries", ur: "ہائپر افراط زر صرف افریقی ممالک میں ہوتا ہے", rm: "Hyper inflation sirf Afriqi mumaalik mein hota hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Pakistan still collects ~Rs10 trillion annually in taxes, can access IMF and bilateral (Saudi, UAE, China) financing, and since the 2022 SBP Act, the central bank has more independence from direct government borrowing. These functioning institutions are exactly what fails in hyperinflation cases — their presence is Pakistan's buffer.", ur: "پاکستان اب بھی سالانہ ~Rs10 ٹریلین ٹیکس جمع کرتا ہے، IMF اور دو طرفہ فنانسنگ تک رسائی حاصل کر سکتا ہے، اور 2022 SBP ایکٹ کے بعد سے مرکزی بینک کو براہ راست سرکاری قرض سے زیادہ آزادی حاصل ہے۔", rm: "Pakistan ab bhi saalaana ~Rs10 trillion tax jamaa karta hai, IMF aur do-tarfa financing tak rasaai haasil kar sakta hai, aur 2022 SBP Act ke baad se markazi bank ko baraah-e-raast sarkari qarz se zyada aazaadi haasil hai." },
    },
    {
      question: { en: "How did Germany end its 1923 hyperinflation?", ur: "جرمنی نے اپنے 1923 کے ہائپر افراط زر کو کیسے ختم کیا؟", rm: "Germany ne apne 1923 ke hyper inflation ko kaise khatam kiya?" },
      options: [
        { en: "By printing even more money to overwhelm the problem", ur: "مسئلے پر قابو پانے کے لیے مزید پیسہ چھاپ کر", rm: "Masle par qaaboo paane ke liye mazeed paisa chhaap kar" },
        { en: "By introducing a new currency (Rentenmark) backed by land value and committing to fiscal discipline", ur: "زمین کی قدر سے حمایت یافتہ نئی کرنسی (Rentenmark) متعارف کرا کر اور مالی نظم و ضبط کا عہد کر کے", rm: "Zameen ki qadr se himaayat yaafta nayi currency (Rentenmark) mutaaruf kara kar aur maali nazm-o-zabt ka ahd kar ke" },
        { en: "By banning all economic activity for a year", ur: "ایک سال کے لیے تمام معاشی سرگرمی پر پابندی لگا کر", rm: "Ek saal ke liye tamam muaashi sargarmi par paabandi laga kar" },
        { en: "The hyperinflation never actually ended", ur: "ہائپر افراط زر دراصل کبھی ختم نہیں ہوا", rm: "Hyper inflation darasal kabhi khatam nahin hua" },
      ],
      correctIndex: 1,
      explanation: { en: "Germany introduced the Rentenmark in November 1923, backed by mortgages on agricultural and industrial land (since gold reserves were depleted). Combined with a commitment to stop printing money to cover deficits, this restored confidence almost immediately. Hyperinflation stopped within weeks — showing that credible currency reform can end even the most severe inflation crises.", ur: "جرمنی نے نومبر 1923 میں Rentenmark متعارف کرایا، جو زرعی اور صنعتی زمین پر مارگیج سے حمایت یافتہ تھا۔ پیسہ چھاپنا بند کرنے کے عہد کے ساتھ، اس نے تقریباً فوری طور پر اعتماد بحال کیا۔", rm: "Germany ne November 1923 mein Rentenmark mutaaruf karaya, jo ziraati aur sanaati zameen par mortgage se himaayat yaafta tha. Paisa chhaapna band karne ke ahd ke saath, is ne taqreeban fori tor par aitmaad bahaal kiya." },
    },
  ],
  faq: [
    {
      question: { en: "Could Pakistan ever experience hyperinflation like Zimbabwe or Venezuela?", ur: "کیا پاکستان کبھی زمبابوے یا وینزویلا کی طرح ہائپر افراط زر کا تجربہ کر سکتا ہے؟", rm: "Kya Pakistan kabhi Zimbabwe ya Venezuela ki tarah hyper inflation ka tajruba kar sakta hai?" },
      answer: { en: "It's extremely unlikely under current conditions, though not theoretically impossible. Hyperinflation requires a total collapse of fiscal financing options combined with central bank money-printing to cover the gap. Pakistan's situation, while serious, differs fundamentally: Pakistan retains market access (can still sell bonds domestically), retains international relationships (IMF, bilateral partners willing to lend), and has taken steps to increase SBP independence (the 2022 SBP Amendment Act restricted direct government borrowing from the central bank). The scenarios that produce hyperinflation — total international isolation, complete loss of tax collection capacity, central bank fully subordinated to reckless fiscal demands — are not present in Pakistan. The more realistic risk for Pakistan is continued high (20-30%) inflation from structural fiscal and energy problems, not hyperinflation.", ur: "موجودہ حالات میں یہ انتہائی غیر امکانی ہے، اگرچہ نظریاتی طور پر ناممکن نہیں۔ ہائپر افراط زر کو مالی فنانسنگ اختیارات کے مکمل خاتمے کی ضرورت ہے۔ پاکستان کی صورتحال، سنگین ہونے کے باوجود، بنیادی طور پر مختلف ہے: پاکستان بازار تک رسائی برقرار رکھتا ہے، بین الاقوامی تعلقات برقرار رکھتا ہے، اور SBP کی آزادی بڑھانے کے لیے اقدامات کیے ہیں۔", rm: "Maujooda haalaat mein yeh intihaayi ghair imkaani hai, agarchay nazariyaati tor par na-mumkin nahin. Hyper inflation ko maali financing ikhtiyaaraat ke mukammal khaatme ki zaroorat hai. Pakistan ki sorat-e-haal, sangeen hone ke bawajood, bunyaadi tor par mukhtalif hai: Pakistan baazaar tak rasaai barqaraar rakhta hai, bain-ul-aqwaami taluqaat barqaraar rakhta hai, aur SBP ki aazaadi barhane ke liye iqdaamaat kiye hain." },
    },
  ],
};
