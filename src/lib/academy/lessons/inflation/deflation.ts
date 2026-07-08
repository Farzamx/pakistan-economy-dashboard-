import type { Lesson } from "@/lib/academy/types";

export const deflationLesson: Lesson = {
  slug: "deflation",
  category: "inflation",
  title: { en: "Deflation: When Falling Prices Are Bad News", ur: "افلاس زر: جب گرتی قیمتیں بری خبر ہوں", rm: "Deflation: Jab Girti Qeematen Buri Khabar Hon" },
  subtitle: {
    en: "Why economists fear falling prices more than rising ones — the deflation trap explained",
    ur: "ماہرین اقتصادیات بڑھتی قیمتوں سے زیادہ گرتی قیمتوں سے کیوں ڈرتے ہیں — افلاس زر کا جال",
    rm: "Maahireen iqtisaadiyaat barhti qeematon se zyada girti qeematon se kyun darte hain — deflation ka jaal",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan"],
  relatedLessonSlugs: ["types-of-inflation", "stagflation", "economic-cycles"],
  content: {
    overview: {
      en: "Deflation is a sustained fall in the general price level — the opposite of inflation. It sounds appealing (cheaper goods!) but economists consider it more dangerous than moderate inflation. Deflation causes consumers to delay purchases (why buy today if it's cheaper tomorrow?), which reduces demand, causing businesses to cut production and lay off workers, which reduces incomes further, causing more delayed spending — a self-reinforcing 'deflationary spiral.' Pakistan has never experienced sustained deflation, but understanding it explains why the SBP targets low positive inflation (not zero) and why Japan's decades-long deflation is considered an economic disaster, not a success.",
      ur: "افلاس زر عمومی قیمت کی سطح میں مستقل کمی ہے — افراط زر کے برعکس۔ یہ پرکشش لگتا ہے لیکن ماہرین اقتصادیات اسے معتدل افراط زر سے زیادہ خطرناک سمجھتے ہیں۔ افلاس زر صارفین کو خریداری میں تاخیر کا باعث بنتا ہے، جس سے طلب کم ہوتی ہے، جس کی وجہ سے کاروبار پیداوار کم کرتے ہیں اور کارکنوں کو نکالتے ہیں — ایک خود مضبوط 'افلاس زر سرپل'۔",
      rm: "Iflaas-e-zer amoomi qeemat ki satah mein mustaqil kami hai — inflation ke bar'aks. Yeh pur-kashish lagta hai lekin maahireen iqtisaadiyaat ise mutadil inflation se zyada khatarnaak samajhte hain. Iflaas-e-zer saraafeen ko khareedari mein takheer ka baais banta hai, jis se talab kam hoti hai.",
    },
    whyItMatters: {
      en: "Understanding deflation risk is why the SBP and most central banks target ~2% inflation rather than 0%. It also explains why Pakistan's period of very low growth combined with disinflation (2019-20, before COVID) worried policymakers, and why a sudden collapse in demand (severe recession) is watched carefully for deflationary risk. Deflation is particularly dangerous for debtors — if you have fixed debt payments but your income (and the value of your assets) falls, your real debt burden rises. Pakistan's high debt levels make deflation a genuine concern in any severe recession scenario.",
      ur: "افلاس زر کے خطرے کو سمجھنا یہ بتاتا ہے کہ SBP اور زیادہ تر مرکزی بینک 0٪ کی بجائے ~2٪ افراط زر کو ہدف بناتے ہیں۔ یہ قرض داروں کے لیے خاص طور پر خطرناک ہے — اگر آپ کے پاس مقررہ قرض کی ادائیگی ہے لیکن آپ کی آمدنی گرتی ہے، آپ کا حقیقی قرض بوجھ بڑھتا ہے۔",
      rm: "Iflaas-e-zer ke khatre ko samajhna yeh batata hai ke SBP aur zyada tar markazi bank 0% ki bajaaye ~2% inflation ko hadaf banate hain. Yeh qarz daaron ke liye khaas tor par khatarnaak hai — agar aap ke paas muqarrar qarz ki adaayigi hai lekin aap ki aamdani girti hai, aap ka haqeeqi qarz bojh barhta hai.",
    },
    explanation: {
      en: `**Why falling prices sound good but aren't:**

**The deflationary spiral:**
1. Prices start falling (due to weak demand, oversupply, or a financial crisis)
2. Consumers delay purchases, expecting prices to fall further
3. Reduced spending → businesses cut production, lay off workers
4. Unemployment rises, incomes fall
5. Lower incomes → even less spending → prices fall further
6. Cycle repeats, deepening the recession

**Why deflation hurts debtors specifically:**
Debt contracts are fixed in nominal terms. If you owe Rs1,000,000 and prices/wages fall 10%, your real debt burden (relative to your now-lower income) effectively rises. This is called "debt deflation" — Irving Fisher's theory explaining why the Great Depression was so severe: falling prices increased the real burden of 1920s-era debt, causing widespread bankruptcy.

**Why central banks fear deflation more than moderate inflation:**
- Moderate inflation (2-4%): manageable, allows relative price adjustments, doesn't trap the economy
- Deflation: interest rates can't go much below zero (the "zero lower bound"), limiting the central bank's ability to stimulate the economy through rate cuts
- Once deflation expectations set in, they're very hard to reverse (Japan's experience)

**Types of deflation:**
- "Good" deflation: prices fall due to productivity improvements and technological progress (e.g., electronics getting cheaper) — this doesn't trigger the spiral because it doesn't come with falling demand
- "Bad" deflation: prices fall due to collapsing demand (recession, financial crisis) — this is the dangerous type that triggers the spiral

**Why Pakistan hasn't experienced deflation:** Pakistan's chronic fiscal deficits, currency depreciation tendency, and energy cost pressures create persistent inflationary rather than deflationary pressure. Pakistan's macroeconomic problem has always been too much inflation, never too little.`,
      ur: `**گرتی قیمتیں اچھی کیوں لگتی ہیں لیکن نہیں ہیں:**

**افلاس زر سرپل:**
1. قیمتیں گرنا شروع ہوتی ہیں
2. صارفین خریداری میں تاخیر کرتے ہیں
3. کم خرچ → کاروبار پیداوار کم کرتے ہیں، کارکن نکالتے ہیں
4. بے روزگاری بڑھتی ہے، آمدنی گرتی ہے
5. کم آمدنی → اور بھی کم خرچ → قیمتیں مزید گرتی ہیں

**افلاس زر خاص طور پر قرض داروں کو کیوں نقصان دیتا ہے:**
قرض کے معاہدے برائے نام لحاظ سے مقرر ہوتے ہیں۔ اگر قیمتیں/اجرتیں 10٪ گریں، آپ کا حقیقی قرض بوجھ مؤثر طریقے سے بڑھتا ہے۔

**اقسام:**
- "اچھی" افلاس زر: پیداواریت بہتری کی وجہ سے قیمتیں گرتی ہیں
- "بری" افلاس زر: طلب گرنے کی وجہ سے قیمتیں گرتی ہیں — خطرناک قسم`,
      rm: `**Girti qeematen achi kyun lagti hain lekin nahin hain:**

**Iflaas-e-zer spiral:**
1. Qeematen girna shuroo hoti hain
2. Saraafeen khareedari mein takheer karte hain
3. Kam kharch → kaarobaar paidawar kam karte hain, kaarkin nikalte hain
4. Be-rozgaari barhti hai, aamdani girti hai
5. Kam aamdani → aur bhi kam kharch → qeematen mazeed girti hain

**Iflaas-e-zer khaas tor par qarz daaron ko kyun nuqsaan deta hai:**
Qarz ke muaahadey baraaye naam lihaaz se muqarrar hote hain. Agar qeematen/ujraten 10% girein, aap ka haqeeqi qarz bojh moassir tareeqe se barhta hai.

**Aqsaam:**
- "Achi" iflaas-e-zer: paidaawariyat behtari ki wajah se qeematen girti hain
- "Buri" iflaas-e-zer: talab girne ki wajah se qeematen girti hain — khatarnaak qism`,
    },
    misconceptions: {
      en: `**Myth 1: Falling prices are always good for consumers.** In a deflationary spiral, falling prices come with rising unemployment and falling wages — consumers end up worse off despite lower prices, because their income falls faster than prices.

**Myth 2: A country can just print money to escape deflation easily.** Japan tried aggressive monetary easing (near-zero and negative interest rates, massive asset purchases) for over two decades and still struggled to escape mild deflation — showing that once deflationary expectations are entrenched, they're very hard to reverse.

**Myth 3: Deflation and low inflation are the same thing.** Low positive inflation (1-2%) is manageable and often desirable. Deflation (negative inflation, prices actually falling) is qualitatively different because it changes consumer and business behaviour — inducing delay rather than immediate consumption.`,
      ur: `**غلط فہمی 1: گرتی قیمتیں ہمیشہ صارفین کے لیے اچھی ہوتی ہیں۔** افلاس زر سرپل میں، گرتی قیمتیں بے روزگاری اور گرتی اجرتوں کے ساتھ آتی ہیں۔

**غلط فہمی 2: کوئی ملک آسانی سے افلاس زر سے بچنے کے لیے پیسہ چھاپ سکتا ہے۔** جاپان نے دو دہائیوں سے زیادہ جارحانہ مالیاتی نرمی آزمائی اور پھر بھی معتدل افلاس زر سے بچنے میں جدوجہد کی۔

**غلط فہمی 3: افلاس زر اور کم افراط زر ایک ہی چیز ہیں۔** کم مثبت افراط زر (1-2٪) قابل انتظام ہے۔`,
      rm: `**Ghalat fehmi 1: Girti qeematen hamesha saraafeen ke liye achi hoti hain.** Iflaas-e-zer spiral mein, girti qeematen be-rozgaari aur girti ujraton ke saath aati hain.

**Ghalat fehmi 2: Koi mulk aasaani se iflaas-e-zer se bachne ke liye paisa chhaap sakta hai.** Japan ne do dahaayon se zyada jaraahana maaliyaati narmi aazmaai aur phir bhi mutadil iflaas-e-zer se bachne mein jaddojehad ki.

**Ghalat fehmi 3: Iflaas-e-zer aur kam inflation ek hi cheez hain.** Kam masbat inflation (1-2%) qaabil-e-intzaam hai.`,
    },
    pakistanExample: {
      en: `**Pakistan has never had sustained deflation, and why that's relevant:** Some countries (Japan, and briefly the Eurozone in 2015-16) faced deflation, but Pakistan's macroeconomic structure — chronic fiscal deficits, currency depreciation bias, energy cost pass-through, and food price volatility from weather shocks — makes deflation extremely unlikely. Even Pakistan's slowest growth periods (2019-20, 2022-23 near-zero GDP growth) saw inflation remain high (double digits), not falling into negative territory. This is actually informative: it shows Pakistan's inflation problem is structural (driven by fiscal and currency dynamics) rather than purely cyclical (driven by demand weakness) — a recession alone doesn't fix Pakistan's inflation the way it might in economies prone to deflation.`,
      ur: `**پاکستان نے کبھی مستقل افلاس زر کا سامنا نہیں کیا، اور یہ کیوں متعلقہ ہے:** کچھ ممالک (جاپان) نے افلاس زر کا سامنا کیا، لیکن پاکستان کا معاشی ڈھانچہ — دائمی مالی خسارے، کرنسی کی کمزوری کا رجحان — افلاس زر کو انتہائی غیر امکانی بناتا ہے۔ پاکستان کے سست ترین نمو ادوار میں بھی افراط زر اعلی رہا۔`,
      rm: `**Pakistan ne kabhi mustaqil iflaas-e-zer ka saamna nahin kiya, aur yeh kyun mutaalliqa hai:** Kuch mumaalik (Japan) ne iflaas-e-zer ka saamna kiya, lekin Pakistan ka muaashi dhaancha — daemi maali khasaare, currency ki kamzori ka rujhaan — iflaas-e-zer ko intihaayi ghair imkaani banata hai. Pakistan ke sust tareen numa adwaar mein bhi inflation aali raha.`,
    },
    realWorld: {
      en: "Japan's 'Lost Decades' (1990s-2010s) is the defining modern deflation case. After a massive asset bubble burst in 1991, Japan experienced two decades of near-zero or negative inflation. Consumers delayed purchases expecting further price falls, companies froze wages, and economic growth stagnated at ~1% for years. The Bank of Japan tried near-zero interest rates, then negative interest rates, then massive quantitative easing (buying trillions in bonds and even stocks) — yet deflationary psychology proved incredibly persistent. Only recently (2022-24), aided partly by global inflation, has Japan seen inflation return to positive territory. This shows how difficult it is to escape deflation once expectations are entrenched — a key reason central banks fight hard to avoid it.",
      ur: "جاپان کی 'کھوئی ہوئی دہائیاں' (1990s-2010s) جدید افلاس زر کا حتمی کیس ہے۔ 1991 میں ایک بڑے اثاثہ بلبلے کے پھٹنے کے بعد، جاپان نے دو دہائیوں تک تقریباً صفر یا منفی افراط زر کا تجربہ کیا۔ صارفین نے مزید قیمت گرنے کی توقع میں خریداری میں تاخیر کی۔",
      rm: "Japan ki 'khoi hui dahaayan' (1990s-2010s) jadeed iflaas-e-zer ka hatami case hai. 1991 mein ek bare aasiya bulbule ke phatne ke baad, Japan ne do dahaayon tak taqreeban sifar ya manfi inflation ka tajruba kiya. Saraafeen ne mazeed qeemat girne ki tawaqqu mein khareedari mein takheer ki.",
    },
    summary: {
      en: "• Deflation: sustained fall in general price level — sounds good, but economists fear it\n• Deflationary spiral: falling prices → delayed spending → less production → job losses → less spending → prices fall further\n• Debt deflation: fixed debt burden rises in real terms when prices/incomes fall\n• Zero lower bound: interest rates can't go much below zero — limits central bank tools\n• 'Good' deflation (productivity-driven) vs 'bad' deflation (demand collapse)\n• Pakistan has never faced sustained deflation — structural inflation bias due to fiscal/currency dynamics",
      ur: "• افلاس زر: عمومی قیمت کی سطح میں مستقل کمی\n• افلاس زر سرپل: گرتی قیمتیں → تاخیر شدہ خرچ → کم پیداوار → ملازمت کا نقصان → مزید قیمت میں کمی\n• قرض افلاس زر: قیمتیں/آمدنی گرنے پر حقیقی قرض بوجھ بڑھتا ہے\n• زیرو لوئر باؤنڈ: شرح سود صفر سے نیچے زیادہ نہیں جا سکتی\n• 'اچھی' افلاس زر بمقابلہ 'بری' افلاس زر\n• پاکستان نے کبھی مستقل افلاس زر کا سامنا نہیں کیا",
      rm: "• Iflaas-e-zer: amoomi qeemat ki satah mein mustaqil kami\n• Iflaas-e-zer spiral: girti qeematen → takheer shuda kharch → kam paidawar → mulaazamat ka nuqsaan → mazeed qeemat mein kami\n• Qarz iflaas-e-zer: qeematen/aamdani girne par haqeeqi qarz bojh barhta hai\n• Zero lower bound: shar-e-sood sifar se neeche zyada nahin ja sakti\n• 'Achi' iflaas-e-zer ba-muqaabla 'buri' iflaas-e-zer\n• Pakistan ne kabhi mustaqil iflaas-e-zer ka saamna nahin kiya",
    },
  },
  quiz: [
    {
      question: { en: "Why do economists consider deflation dangerous rather than beneficial for consumers?", ur: "ماہرین اقتصادیات صارفین کے لیے افلاس زر کو فائدہ مند کی بجائے خطرناک کیوں سمجھتے ہیں؟", rm: "Maahireen iqtisaadiyaat saraafeen ke liye iflaas-e-zer ko faayda mand ki bajaaye khatarnaak kyun samajhte hain?" },
      options: [
        { en: "Because falling prices are illegal in most countries", ur: "کیونکہ گرتی قیمتیں زیادہ تر ممالک میں غیر قانونی ہیں", rm: "Kyunke girti qeematen zyada tar mumaalik mein ghair-qaanooni hain" },
        { en: "Because deflation triggers delayed spending, falling production, job losses, and a self-reinforcing downward spiral", ur: "کیونکہ افلاس زر تاخیر شدہ خرچ، گرتی پیداوار، ملازمت کے نقصانات، اور خود مضبوط نیچے کی طرف سرپل کو متحرک کرتا ہے", rm: "Kyunke iflaas-e-zer takheer shuda kharch, girti paidawar, mulaazamat ke nuqsanaat, aur khud mazboot neeche ki taraf spiral ko muharrik karta hai" },
        { en: "Because prices never actually fall in reality", ur: "کیونکہ حقیقت میں قیمتیں کبھی نہیں گرتیں", rm: "Kyunke haqeeqat mein qeematen kabhi nahin girteen" },
        { en: "Because deflation only affects rich countries", ur: "کیونکہ افلاس زر صرف امیر ممالک کو متاثر کرتا ہے", rm: "Kyunke iflaas-e-zer sirf ameer mumaalik ko mutaassir karta hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Falling prices sound good in isolation, but they change behaviour: consumers delay purchases expecting further declines, reducing demand. This forces businesses to cut production and jobs, further reducing incomes and demand — a self-reinforcing spiral that can turn a mild slowdown into a prolonged depression, as happened in 1930s America and 1990s-2010s Japan.", ur: "گرتی قیمتیں تنہائی میں اچھی لگتی ہیں، لیکن یہ رویہ بدلتی ہیں: صارفین مزید کمی کی توقع میں خریداری میں تاخیر کرتے ہیں۔ یہ کاروباروں کو پیداوار اور ملازمتیں کم کرنے پر مجبور کرتا ہے، جو مزید آمدنی اور طلب کم کرتا ہے۔", rm: "Girti qeematen tanhaai mein achi lagti hain, lekin yeh rawayya badalti hain: saraafeen mazeed kami ki tawaqqu mein khareedari mein takheer karte hain. Yeh kaarobaaron ko paidawar aur mulaazmaten kam karne par majboor karta hai." },
    },
    {
      question: { en: "What is 'debt deflation' and why does it hurt borrowers?", ur: "'قرض افلاس زر' کیا ہے اور یہ قرض لینے والوں کو کیوں نقصان دیتا ہے؟", rm: "'Qarz iflaas-e-zer' kya hai aur yeh qarz lene walon ko kyun nuqsaan deta hai?" },
      options: [
        { en: "It's when banks reduce loan interest rates to zero", ur: "یہ اس وقت ہے جب بینک قرض کی شرح سود صفر کر دیتے ہیں", rm: "Yeh us waqt hai jab bank qarz ki shar-e-sood sifar kar dete hain" },
        { en: "Debt is fixed in nominal terms, so when prices and incomes fall, the real burden of that debt effectively rises", ur: "قرض برائے نام لحاظ سے مقرر ہے، اس لیے جب قیمتیں اور آمدنی گرتی ہیں، اس قرض کا حقیقی بوجھ مؤثر طریقے سے بڑھتا ہے", rm: "Qarz baraaye naam lihaaz se muqarrar hai, is liye jab qeematen aur aamdani girti hain, is qarz ka haqeeqi bojh moassir tareeqe se barhta hai" },
        { en: "It's when the government forgives all debt during deflation", ur: "یہ اس وقت ہے جب حکومت افلاس زر کے دوران تمام قرض معاف کرتی ہے", rm: "Yeh us waqt hai jab hukoomat iflaas-e-zer ke dauran tamam qarz maaf karti hai" },
        { en: "It only applies to government debt, not personal loans", ur: "یہ صرف سرکاری قرض پر لاگو ہوتا ہے، ذاتی قرضوں پر نہیں", rm: "Yeh sirf sarkari qarz par laagoo hota hai, zaati qarzon par nahin" },
      ],
      correctIndex: 1,
      explanation: { en: "If you owe Rs1,000,000 fixed in nominal terms, and general prices/wages fall 10%, your income (in nominal terms) also likely falls — but your debt obligation stays exactly the same. This means your debt now represents a larger share of your (reduced) real income — a heavier real burden. Irving Fisher identified this as a key amplifier of the Great Depression's severity.", ur: "اگر آپ پر برائے نام لحاظ سے مقررہ Rs1,000,000 واجب ہیں، اور عمومی قیمتیں/اجرتیں 10٪ گریں، تو آپ کی آمدنی بھی گرتی ہے — لیکن آپ کا قرض ذمہ داری بالکل ویسی ہی رہتی ہے۔ اس کا مطلب ہے آپ کا قرض اب آپ کی (کم شدہ) حقیقی آمدنی کا بڑا حصہ ظاہر کرتا ہے۔", rm: "Agar aap par baraaye naam lihaaz se muqarrar Rs1,000,000 waajib hain, aur amoomi qeematen/ujraten 10% girein, to aap ki aamdani bhi girti hai — lekin aap ka qarz zimmedaari bilkul waisi hi rehti hai. Is ka matlab hai aap ka qarz ab aap ki (kam shuda) haqeeqi aamdani ka bara hissa zaahir karta hai." },
    },
    {
      question: { en: "Why do central banks like the SBP target ~2% inflation rather than 0%?", ur: "SBP جیسے مرکزی بینک 0٪ کی بجائے ~2٪ افراط زر کا ہدف کیوں رکھتے ہیں؟", rm: "SBP jaise markazi bank 0% ki bajaaye ~2% inflation ka hadaf kyun rakhte hain?" },
      options: [
        { en: "Because 2% inflation generates more tax revenue for the government", ur: "کیونکہ 2٪ افراط زر حکومت کے لیے زیادہ ٹیکس آمدنی پیدا کرتا ہے", rm: "Kyunke 2% inflation hukoomat ke liye zyada tax aamdani paida karta hai" },
        { en: "A small buffer above zero avoids the risk of tipping into deflation, which is much harder to escape than moderate inflation", ur: "صفر سے تھوڑا بفر افلاس زر میں گرنے کے خطرے سے بچاتا ہے، جو معتدل افراط زر سے کہیں زیادہ مشکل سے بچنے والا ہے", rm: "Sifar se thoda buffer iflaas-e-zer mein girne ke khatre se bachata hai, jo mutadil inflation se kahin zyada mushkil se bachne wala hai" },
        { en: "Because 0% inflation is technically impossible to measure", ur: "کیونکہ 0٪ افراط زر تکنیکی طور پر ناپنا ناممکن ہے", rm: "Kyunke 0% inflation technicki tor par naapna na-mumkin hai" },
        { en: "There is no specific reason — it's an arbitrary historical accident", ur: "کوئی مخصوص وجہ نہیں ہے — یہ ایک صوابدیدی تاریخی حادثہ ہے", rm: "Koi makhsoos wajah nahin hai — yeh ek sawaabdeedi taareekhi haadsa hai" },
      ],
      correctIndex: 1,
      explanation: { en: "A small positive inflation target (2%) gives central banks a buffer against accidentally tipping into deflation during an economic downturn. Since deflation is self-reinforcing and very hard to escape (as Japan showed), central banks prefer to err on the side of slightly positive inflation rather than risk zero or negative inflation.", ur: "ایک چھوٹا مثبت افراط زر ہدف (2٪) مرکزی بینکوں کو معاشی مندی کے دوران غلطی سے افلاس زر میں گرنے کے خلاف بفر دیتا ہے۔ چونکہ افلاس زر خود مضبوط ہے اور اس سے بچنا بہت مشکل ہے۔", rm: "Ek chhota masbat inflation hadaf (2%) markazi bankon ko muaashi mandi ke dauran ghalti se iflaas-e-zer mein girne ke khilaf buffer deta hai. Chunke iflaas-e-zer khud mazboot hai aur is se bachna bahut mushkil hai." },
    },
  ],
  faq: [
    {
      question: { en: "Has Pakistan ever come close to experiencing deflation?", ur: "کیا پاکستان کبھی افلاس زر کا تجربہ کرنے کے قریب آیا ہے؟", rm: "Kya Pakistan kabhi iflaas-e-zer ka tajruba karne ke qareeb aaya hai?" },
      answer: { en: "No — Pakistan has never recorded negative annual CPI inflation in its modern economic history. Even during severe economic slowdowns (2019-20 pre-COVID slump, 2022-23 near-zero GDP growth), inflation remained stubbornly high (in double digits). This reflects Pakistan's structural inflation drivers: persistent fiscal deficits requiring some monetary financing, chronic currency depreciation raising import costs, and administered energy price adjustments. Pakistan's macroeconomic challenge has consistently been managing too much inflation, never too little — the opposite problem from Japan or the post-2008 Eurozone.", ur: "نہیں — پاکستان نے اپنی جدید معاشی تاریخ میں کبھی منفی سالانہ CPI افراط زر ریکارڈ نہیں کیا۔ شدید معاشی مندی کے دوران بھی، افراط زر ضدی طور پر اعلی (دوہرے ہندسوں میں) رہا۔ یہ پاکستان کے ساختی افراط زر محرکات کی عکاسی کرتا ہے۔", rm: "Nahin — Pakistan ne apni jadeed muaashi taareekh mein kabhi manfi saalaana CPI inflation record nahin kiya. Shadeed muaashi mandi ke dauran bhi, inflation zidi tor par aali (dohre hindson mein) raha. Yeh Pakistan ke saakhti inflation muharrikaat ki aksi karta hai." },
    },
  ],
};
