import type { Lesson } from "@/lib/academy/types";

export const energyInflationLesson: Lesson = {
  slug: "energy-inflation",
  category: "inflation",
  title: { en: "Energy Inflation: The Circular Debt Connection", ur: "توانائی افراط زر: گردشی قرضے کا تعلق", rm: "Tawanaayi Inflation: Gardishi Qarzay ka Taluq" },
  subtitle: {
    en: "How petrol, gas, and electricity prices ripple through every corner of Pakistan's economy",
    ur: "پیٹرول، گیس اور بجلی کی قیمتیں پاکستان کی معیشت کے ہر کونے میں کیسے پھیلتی ہیں",
    rm: "Petrol, gas aur bijli ki qeematen Pakistan ki muaashat ke har kone mein kaise phailti hain",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan"],
  relatedLessonSlugs: ["cost-push", "circular-debt", "imported-inflation"],
  content: {
    overview: {
      en: "Energy inflation tracks how fast the prices of petrol, diesel, gas, and electricity rise. Because energy is an input to nearly every economic activity — transport, manufacturing, agriculture, cooking, heating, cooling — energy price increases don't stay contained; they cascade into food prices, transport fares, manufactured goods, and services. Pakistan's energy sector is unusually distorted by decades of circular debt (unpaid subsidies accumulating as losses), making energy price adjustments in Pakistan larger and more disruptive than in most countries.",
      ur: "توانائی افراط زر یہ ٹریک کرتا ہے کہ پیٹرول، ڈیزل، گیس اور بجلی کی قیمتیں کتنی تیزی سے بڑھتی ہیں۔ چونکہ توانائی تقریباً ہر معاشی سرگرمی کا آدان ہے — ٹرانسپورٹ، مینوفیکچرنگ، زراعت — توانائی قیمت اضافے محدود نہیں رہتے؛ وہ خوراک قیمتوں، ٹرانسپورٹ کرایوں، تیار شدہ اشیاء میں پھیلتے ہیں۔",
      rm: "Tawanaayi inflation yeh track karta hai ke petrol, diesel, gas aur bijli ki qeematen kitni tezi se barhti hain. Chunke tawanaayi taqreeban har muaashi sargarmi ka aadaan hai — transport, manufacturing, ziraat — tawanaayi qeemat izaafe mahdood nahin rehte; woh khuraak qeematon, transport kirayon, taiyaar shuda ashaaya mein phailte hain.",
    },
    whyItMatters: {
      en: "Understanding energy inflation is key to understanding Pakistan's broader inflation dynamics, because energy price shocks in Pakistan aren't market-driven — they're policy-driven, tied to the circular debt problem. Every time the government raises electricity or gas tariffs (often mandated by IMF programmes), it directly and immediately raises costs for transport, agriculture (tube wells, tractors), and industry. Tracking energy inflation lets you anticipate broader CPI movements a few months ahead, since energy costs feed into other prices with a lag.",
      ur: "توانائی افراط زر کو سمجھنا پاکستان کی وسیع تر افراط زر حرکیات کو سمجھنے کی کلید ہے، کیونکہ پاکستان میں توانائی قیمت جھٹکے بازار سے چلنے والے نہیں ہیں — وہ پالیسی سے چلنے والے ہیں، گردشی قرضے کے مسئلے سے جڑے ہوئے۔ ہر بار جب حکومت بجلی یا گیس ٹیرف بڑھاتی ہے، یہ براہ راست اور فوری طور پر ٹرانسپورٹ، زراعت اور صنعت کے لیے لاگت بڑھاتی ہے۔",
      rm: "Tawanaayi inflation ko samajhna Pakistan ki wasee tar inflation harkiyaat ko samajhne ki kunji hai, kyunke Pakistan mein tawanaayi qeemat jhatke baazaar se chalne wale nahin hain — woh policy se chalne wale hain, gardishi qarzay ke masle se jure hue. Har baar jab hukoomat bijli ya gas tariff barhati hai, yeh baraah-e-raast aur fori tor par transport, ziraat aur sanaat ke liye lagat barhati hai.",
    },
    explanation: {
      en: `**Why energy is uniquely inflationary when its price rises:**

**1. Energy touches every production process:** Factories need electricity/gas to run machines; farmers need diesel for tractors and tube wells; transporters need petrol/diesel to move goods; households need gas/electricity for cooking and cooling. A single energy price hike raises costs system-wide, not in one sector.

**2. Pass-through with a lag:** Energy cost increases don't show up in consumer prices instantly. Transport fares adjust within days, but manufactured goods take weeks or months as existing inventory (bought at old energy costs) sells through first. This means energy price hikes have a delayed, extended effect on overall CPI.

**3. Pakistan's circular debt mechanism:**
- Government sets electricity tariffs below the true cost of generation + distribution (often for political reasons)
- Power distribution companies (DISCOs) can't collect enough revenue to pay power producers (IPPs)
- IPPs can't pay fuel suppliers
- Government accumulates "circular debt" — unpaid dues throughout the chain — reaching Rs2.5+ trillion by 2023
- Eventually, unsustainable losses force tariff hikes (often as IMF conditions) — sudden, large jumps rather than gradual adjustment

**4. Petroleum Development Levy (PDL):** The government also taxes petrol/diesel through the PDL (up to Rs60/litre), used to generate revenue. This means petrol price changes reflect both global oil prices AND domestic tax policy — two separate inflationary channels.

**Why energy inflation in Pakistan is "lumpy" not smooth:** Unlike countries with market-based energy pricing that adjusts gradually, Pakistan's administered pricing system means energy costs stay artificially low for a period, then jump sharply when the government can no longer avoid a correction — creating sudden CPI shocks rather than gradual, predictable inflation.`,
      ur: `**توانائی کی قیمت بڑھنے پر یہ منفرد طور پر افراط زر آور کیوں ہے:**

**1. توانائی ہر پیداواری عمل کو چھوتی ہے:** فیکٹریوں کو مشینیں چلانے کے لیے بجلی/گیس چاہیے؛ کسانوں کو ٹریکٹر کے لیے ڈیزل چاہیے؛ ٹرانسپورٹرز کو سامان منتقل کرنے کے لیے پیٹرول چاہیے۔

**2. تاخیر کے ساتھ گزرنا:** توانائی لاگت اضافے فوری طور پر صارف قیمتوں میں ظاہر نہیں ہوتے۔

**3. پاکستان کا گردشی قرضہ طریقہ کار:**
- حکومت بجلی ٹیرف کو پیداوار کی حقیقی لاگت سے نیچے مقرر کرتی ہے
- تقسیم کمپنیاں (DISCOs) پاور پروڈیوسرز کو ادائیگی کے لیے کافی آمدنی جمع نہیں کر سکتیں
- حکومت "گردشی قرضہ" جمع کرتی ہے — 2023 تک Rs2.5+ ٹریلین تک پہنچا
- بالآخر، غیر پائیدار نقصانات ٹیرف اضافے پر مجبور کرتے ہیں

**4. پیٹرولیم ترقیاتی لیوی (PDL):** حکومت PDL کے ذریعے پیٹرول/ڈیزل پر ٹیکس بھی لگاتی ہے۔`,
      rm: `**Tawanaayi ki qeemat barhne par yeh munfarid tor par inflation aawar kyun hai:**

**1. Tawanaayi har paidawaari amal ko chhooti hai:** Factoriyon ko machinein chalane ke liye bijli/gas chahiye; kissaanon ko tractor ke liye diesel chahiye; transporters ko saamaan muntaqil karne ke liye petrol chahiye.

**2. Takheer ke saath guzarna:** Tawanaayi lagat izaafey fori tor par saraaf qeematon mein zaahir nahin hote.

**3. Pakistan ka gardishi qarzay tareeqa-kaar:**
- Hukoomat bijli tariff ko paidawar ki haqeeqi lagat se neeche muqarrar karti hai
- Taqseem companies (DISCOs) power producers ko adaayigi ke liye kaafi aamdani jamaa nahin kar sakteeN
- Hukoomat "gardishi qarzay" jamaa karti hai — 2023 tak Rs2.5+ trillion tak pohuncha
- Bilaakhir, ghair-paayidaar nuqsaanaat tariff izaafe par majboor karte hain

**4. Petroleum Taraqiyaati Levy (PDL):** Hukoomat PDL ke zariye petrol/diesel par tax bhi lagati hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Energy inflation is only about global oil prices.** In Pakistan's case, much of the energy price volatility is domestic policy-driven (circular debt corrections, PDL taxes, currency effects on import costs) — not purely global oil market movements.

**Myth 2: Subsidising energy prices reduces inflation permanently.** Subsidies delay the price adjustment but don't eliminate the underlying cost — they shift the cost to future taxpayers via circular debt accumulation, ultimately causing a larger, sharper price correction later.

**Myth 3: Renewable energy has no relevance to Pakistan's inflation problem.** Solar and wind have near-zero marginal cost once installed, making them a long-term structural hedge against imported fuel price volatility. Pakistan's growing solar adoption is partly a response to energy cost unpredictability.`,
      ur: `**غلط فہمی 1: توانائی افراط زر صرف عالمی تیل قیمتوں کے بارے میں ہے۔** پاکستان کے کیس میں، زیادہ تر توانائی قیمت اتار چڑھاؤ ملکی پالیسی سے چلتا ہے۔

**غلط فہمی 2: توانائی قیمتوں کو سبسڈی دینا مستقل طور پر افراط زر کم کرتا ہے۔** سبسڈیاں قیمت ایڈجسٹمنٹ میں تاخیر کرتی ہیں لیکن بنیادی لاگت کو ختم نہیں کرتیں۔

**غلط فہمی 3: قابل تجدید توانائی کا پاکستان کے افراط زر مسئلے سے کوئی تعلق نہیں۔** شمسی اور ہوا توانائی ایک بار نصب ہونے پر تقریباً صفر مارجنل لاگت رکھتی ہیں۔`,
      rm: `**Ghalat fehmi 1: Tawanaayi inflation sirf aalami tel qeematon ke baare mein hai.** Pakistan ke case mein, zyada tar tawanaayi qeemat utaar-charhaao mulki policy se chalta hai.

**Ghalat fehmi 2: Tawanaayi qeematon ko subsidy dena mustaqil tor par inflation kam karta hai.** Subsidiyaan qeemat adjustment mein takheer karti hain lekin bunyaadi lagat ko khatam nahin karteeN.

**Ghalat fehmi 3: Qaabil-e-tajdeed tawanaayi ka Pakistan ke inflation masle se koi taluq nahin.** Shamsi aur hawa tawanaayi ek baar nasb hone par taqreeban sifar marjinal lagat rakhti hain.`,
    },
    pakistanExample: {
      en: `**The 2022-23 tariff shock:** Under IMF programme conditions, Pakistan raised electricity base tariffs multiple times in 2022-23, with the average tariff rising from ~Rs16-18/unit to Rs35-45/unit (150%+ cumulative increase) for many consumer categories. Simultaneously, gas tariffs for industrial and captive power users rose sharply. Petrol prices, driven by both global oil prices and PKR depreciation, went from Rs149.86/litre (June 2022) to a peak of Rs333.5/litre (September 2023) before partially retreating. This triple energy shock (electricity + gas + petrol) fed into transport costs, manufacturing costs, and agricultural input costs simultaneously — a major driver of the 38% CPI peak.`,
      ur: `**2022-23 کا ٹیرف جھٹکا:** IMF پروگرام شرائط کے تحت، پاکستان نے 2022-23 میں کئی بار بجلی کے بنیادی ٹیرف بڑھائے، اوسط ٹیرف ~Rs16-18/یونٹ سے Rs35-45/یونٹ تک بڑھا (150٪+ مجموعی اضافہ)۔ پیٹرول کی قیمتیں Rs149.86/لیٹر (جون 2022) سے Rs333.5/لیٹر (ستمبر 2023) کے عروج تک گئیں۔`,
      rm: `**2022-23 ka tariff jhatka:** IMF programme sharaait ke tehet, Pakistan ne 2022-23 mein kayi baar bijli ke bunyaadi tariff barhaye, ausat tariff ~Rs16-18/unit se Rs35-45/unit tak barha (150%+ majmooee izaafa). Petrol ki qeematen Rs149.86/litre (June 2022) se Rs333.5/litre (September 2023) ke uroj tak gain.`,
    },
    realWorld: {
      en: "The 1970s oil shocks (1973 and 1979) remain the clearest global example of energy inflation's cascading effect. The 1973 OPEC embargo quadrupled oil prices; the 1979 Iranian Revolution disrupted supply again, doubling prices further. Both episodes caused inflation to surge across every oil-importing economy simultaneously — transport costs, manufacturing costs, heating costs, and food costs (since agriculture depends on diesel and fertiliser, itself oil-derived) all rose together. These episodes taught policymakers globally that energy security is inseparable from price stability — a lesson central to why Pakistan's circular debt crisis is treated as a macroeconomic emergency, not just a sector-specific problem.",
      ur: "1970s کے تیل جھٹکے (1973 اور 1979) توانائی افراط زر کے عالمی اثر کی سب سے واضح مثال ہیں۔ 1973 کی OPEC پابندی نے تیل کی قیمتوں کو چوگنا کیا؛ 1979 کے ایرانی انقلاب نے سپلائی میں مزید خلل ڈالا۔ دونوں اقساط نے ہر تیل درآمد کرنے والی معیشت میں بیک وقت افراط زر بڑھایا۔",
      rm: "1970s ke tel jhatke (1973 aur 1979) tawanaayi inflation ke aalami asar ki sab se waazeh misaal hain. 1973 ki OPEC paabandi ne tel ki qeematon ko chaoguna kiya; 1979 ke Irani inqilaab ne supply mein mazeed khalal daala. Dono aqsaat ne har tel daraamd karne wali muaashat mein bayak waqt inflation barhaaya.",
    },
    summary: {
      en: "• Energy inflation: rate of change in petrol, gas, electricity prices — feeds into virtually all other prices\n• Cascades with a lag: transport adjusts fast; manufactured goods and services adjust over weeks/months\n• Pakistan's circular debt: administered pricing below cost creates 'lumpy' shocks instead of gradual adjustment\n• PDL (Petroleum Development Levy): a domestic tax layer separate from global oil prices\n• 2022-23 shock: electricity +150%, petrol from Rs150 to Rs330+ — a triple energy shock feeding the 38% CPI peak\n• Renewable energy (solar/wind) is a long-term structural hedge against this volatility",
      ur: "• توانائی افراط زر: پیٹرول، گیس، بجلی قیمتوں میں تبدیلی کی شرح — تقریباً تمام دیگر قیمتوں میں پھیلتی ہے\n• تاخیر کے ساتھ پھیلتی ہے: ٹرانسپورٹ تیزی سے ایڈجسٹ ہوتا ہے\n• پاکستان کا گردشی قرضہ: لاگت سے نیچے منظم قیمت 'گانٹھ دار' جھٹکے پیدا کرتی ہے\n• PDL: عالمی تیل قیمتوں سے الگ ملکی ٹیکس تہہ\n• 2022-23 جھٹکا: بجلی +150٪، پیٹرول Rs150 سے Rs330+ تک\n• قابل تجدید توانائی طویل مدتی ساختی ہیج ہے",
      rm: "• Tawanaayi inflation: petrol, gas, bijli qeematon mein tabdeeli ki shar — taqreeban tamam doosri qeematon mein phailti hai\n• Takheer ke saath phailti hai: transport tezi se adjust hota hai\n• Pakistan ka gardishi qarzay: lagat se neeche munazzam qeemat 'gaanth-daar' jhatke paida karti hai\n• PDL: aalami tel qeematon se alag mulki tax tah\n• 2022-23 jhatka: bijli +150%, petrol Rs150 se Rs330+ tak\n• Qaabil-e-tajdeed tawanaayi taweel muddat ka saakhti hedge hai",
    },
  },
  quiz: [
    {
      question: { en: "Why does a rise in electricity tariffs affect food prices, not just electricity bills?", ur: "بجلی ٹیرف میں اضافہ خوراک قیمتوں کو کیوں متاثر کرتا ہے، صرف بجلی کے بلوں کو نہیں؟", rm: "Bijli tariff mein izaafa khuraak qeematon ko kyun mutaassir karta hai, sirf bijli ke bilon ko nahin?" },
      options: [
        { en: "It doesn't — electricity and food prices are completely unrelated", ur: "یہ نہیں ہوتا — بجلی اور خوراک کی قیمتیں بالکل غیر متعلقہ ہیں", rm: "Yeh nahin hota — bijli aur khuraak ki qeematen bilkul ghair-mutaalliqa hain" },
        { en: "Farmers use electricity/diesel for tube wells and irrigation, and food processing/storage uses electricity — raising costs throughout the food supply chain", ur: "کسان ٹیوب ویل اور آبپاشی کے لیے بجلی/ڈیزل استعمال کرتے ہیں، اور خوراک پروسیسنگ/ذخیرہ بجلی استعمال کرتا ہے — پوری خوراک سپلائی چین میں لاگت بڑھاتا ہے", rm: "Kissaan tube well aur aab-paashi ke liye bijli/diesel istemal karte hain, aur khuraak processing/zakheera bijli istemal karta hai — poori khuraak supply chain mein lagat barhata hai" },
        { en: "Because the government bans food production when electricity prices rise", ur: "کیونکہ حکومت بجلی کی قیمتیں بڑھنے پر خوراک کی پیداوار پر پابندی لگاتی ہے", rm: "Kyunke hukoomat bijli ki qeematen barhne par khuraak ki paidawar par paabandi lagati hai" },
        { en: "Food prices are set by a completely separate government body unaffected by energy", ur: "خوراک کی قیمتیں ایک بالکل الگ سرکاری ادارے کی طرف سے مقرر ہیں جو توانائی سے متاثر نہیں", rm: "Khuraak ki qeematen ek bilkul alag sarkari idaare ki taraf se muqarrar hain jo tawanaayi se mutaassir nahin" },
      ],
      correctIndex: 1,
      explanation: { en: "Energy is embedded throughout the agricultural supply chain: irrigation (tube wells run on electricity/diesel), tractors and machinery (diesel), fertiliser production (natural gas-intensive), cold storage and processing (electricity), and transport to markets (diesel). A rise in any of these energy costs raises the total cost of food production and distribution.", ur: "توانائی زرعی سپلائی چین میں شامل ہے: آبپاشی (ٹیوب ویل بجلی/ڈیزل پر چلتے ہیں)، ٹریکٹر اور مشینری (ڈیزل)، کھاد کی پیداوار (قدرتی گیس پر مبنی)، کولڈ اسٹوریج (بجلی)۔", rm: "Tawanaayi ziraati supply chain mein shaamil hai: aab-paashi (tube well bijli/diesel par chalte hain), tractor aur machinery (diesel), khaad ki paidawar (qudrati gas par mabni), cold storage (bijli)." },
    },
    {
      question: { en: "What is Pakistan's 'circular debt' and how does it relate to energy inflation?", ur: "پاکستان کا 'گردشی قرضہ' کیا ہے اور یہ توانائی افراط زر سے کیسے متعلق ہے؟", rm: "Pakistan ka 'gardishi qarzay' kya hai aur yeh tawanaayi inflation se kaise mutaalliq hai?" },
      options: [
        { en: "Money borrowed from the IMF specifically for green energy projects", ur: "خاص طور پر سبز توانائی منصوبوں کے لیے IMF سے لیا گیا پیسہ", rm: "Khaas tor par sabz tawanaayi mansooby ke liye IMF se liya gaya paisa" },
        { en: "Unpaid dues accumulated because electricity tariffs are set below true costs, eventually forcing sharp tariff hikes that spike inflation", ur: "غیر ادا شدہ واجبات جمع ہوتے ہیں کیونکہ بجلی ٹیرف حقیقی لاگت سے نیچے مقرر ہیں، بالآخر تیز ٹیرف اضافوں پر مجبور کرتے ہیں جو افراط زر بڑھاتے ہیں", rm: "Ghair-ada shuda waajibaat jamaa hote hain kyunke bijli tariff haqeeqi lagat se neeche muqarrar hain, bilaakhir tez tariff izaafon par majboor karte hain jo inflation barhate hain" },
        { en: "A type of foreign currency reserve held by the SBP", ur: "SBP کے پاس رکھی گئی غیر ملکی کرنسی ذخائر کی ایک قسم", rm: "SBP ke paas rakhi gayi ghair mulki currency zakhayir ki ek qism" },
        { en: "Debt owed exclusively by textile exporters", ur: "خصوصی طور پر ٹیکسٹائل برآمد کنندگان کا واجب الادا قرض", rm: "Khusoosi tor par textile baraadm kunandgaan ka waajib-ul-ada qarz" },
      ],
      correctIndex: 1,
      explanation: { en: "Circular debt is the chain of unpaid dues in Pakistan's power sector: government sets tariffs below cost-recovery, DISCOs can't collect enough to pay power producers, producers can't pay fuel suppliers. This accumulates as losses over years until unsustainable — forcing sudden, large tariff corrections rather than gradual adjustment, causing energy inflation shocks.", ur: "گردشی قرضہ پاکستان کے بجلی شعبے میں غیر ادا شدہ واجبات کا سلسلہ ہے: حکومت لاگت بازیابی سے نیچے ٹیرف مقرر کرتی ہے، DISCOs کافی جمع نہیں کر سکتیں۔ یہ سالوں میں نقصانات کے طور پر جمع ہوتا ہے۔", rm: "Gardishi qarzay Pakistan ke bijli shube mein ghair-ada shuda waajibaat ka silsila hai: hukoomat lagat-baaziyaabi se neeche tariff muqarrar karti hai, DISCOs kaafi jamaa nahin kar sakteeN. Yeh salon mein nuqsanaat ke tor par jamaa hota hai." },
    },
    {
      question: { en: "What is the Petroleum Development Levy (PDL) and why does it matter for inflation?", ur: "پیٹرولیم ترقیاتی لیوی (PDL) کیا ہے اور یہ افراط زر کے لیے کیوں اہم ہے؟", rm: "Petroleum Taraqiyaati Levy (PDL) kya hai aur yeh inflation ke liye kyun ahem hai?" },
      options: [
        { en: "A subsidy the government gives to petrol consumers", ur: "ایک سبسڈی جو حکومت پیٹرول صارفین کو دیتی ہے", rm: "Ek subsidy jo hukoomat petrol saraafeen ko deti hai" },
        { en: "A domestic tax on petrol/diesel (up to Rs60/litre) that adds a policy-driven inflation channel separate from global oil price movements", ur: "پیٹرول/ڈیزل پر ایک ملکی ٹیکس (Rs60/لیٹر تک) جو عالمی تیل قیمت حرکات سے الگ پالیسی سے چلنے والا افراط زر چینل شامل کرتا ہے", rm: "Petrol/diesel par ek mulki tax (Rs60/litre tak) jo aalami tel qeemat harkaton se alag policy se chalne wala inflation channel shaamil karta hai" },
        { en: "A tax only foreign oil companies pay", ur: "ایک ٹیکس جو صرف غیر ملکی تیل کمپنیاں ادا کرتی ہیں", rm: "Ek tax jo sirf ghair mulki tel companies ada karti hain" },
        { en: "A one-time tax that was abolished in 2015", ur: "ایک یکبارگی ٹیکس جو 2015 میں ختم کر دیا گیا", rm: "Ek yak-baargi tax jo 2015 mein khatam kar diya gaya" },
      ],
      correctIndex: 1,
      explanation: { en: "The PDL is a government tax on petroleum products, used to raise revenue (and satisfy IMF revenue targets). It means petrol prices in Pakistan reflect both global crude oil price movements AND domestic tax policy decisions — the government can raise the PDL even if global oil prices are flat, directly and immediately affecting consumer fuel costs.", ur: "PDL پیٹرولیم مصنوعات پر ایک سرکاری ٹیکس ہے، آمدنی بڑھانے کے لیے استعمال ہوتا ہے۔ اس کا مطلب ہے پاکستان میں پیٹرول کی قیمتیں عالمی خام تیل قیمت حرکات اور ملکی ٹیکس پالیسی فیصلے دونوں کی عکاسی کرتی ہیں۔", rm: "PDL petroleum masnoowaat par ek sarkari tax hai, aamdani barhane ke liye istemal hota hai. Is ka matlab hai Pakistan mein petrol ki qeematen aalami khaam tel qeemat harkaton aur mulki tax policy faisle dono ki aksi karti hain." },
    },
    {
      question: { en: "Why is renewable energy (solar/wind) considered a long-term hedge against Pakistan's energy inflation?", ur: "قابل تجدید توانائی (شمسی/ہوا) کو پاکستان کے توانائی افراط زر کے خلاف طویل مدتی ہیج کیوں سمجھا جاتا ہے؟", rm: "Qaabil-e-tajdeed tawanaayi (shamsi/hawa) ko Pakistan ke tawanaayi inflation ke khilaf taweel muddat ka hedge kyun samjha jaata hai?" },
      options: [
        { en: "Because it is banned from being taxed", ur: "کیونکہ اسے ٹیکس سے مستثنیٰ کیا گیا ہے", rm: "Kyunke ise tax se mustasna kiya gaya hai" },
        { en: "Because once installed, it has near-zero marginal cost, reducing exposure to volatile imported fuel prices and currency depreciation effects", ur: "کیونکہ ایک بار نصب ہونے پر، اس کی مارجنل لاگت تقریباً صفر ہوتی ہے، جس سے غیر مستحکم درآمدی ایندھن قیمتوں اور کرنسی کمزوری اثرات سے نمائش کم ہوتی ہے", rm: "Kyunke ek baar nasb hone par, is ki marjinal lagat taqreeban sifar hoti hai, jis se ghair mustahkam daraamdaati eendhan qeematon aur currency kamzori asaraat se numaish kam hoti hai" },
        { en: "Because solar panels are manufactured entirely in Pakistan", ur: "کیونکہ سولر پینل مکمل طور پر پاکستان میں تیار ہوتے ہیں", rm: "Kyunke solar panel mukammal tor par Pakistan mein taiyaar hote hain" },
        { en: "Because renewable energy has no upfront cost", ur: "کیونکہ قابل تجدید توانائی کی کوئی ابتدائی لاگت نہیں", rm: "Kyunke qaabil-e-tajdeed tawanaayi ki koi ibtidaai lagat nahin" },
      ],
      correctIndex: 1,
      explanation: { en: "Unlike imported fossil fuels (oil, LNG) whose costs fluctuate with global prices and PKR exchange rates, solar and wind energy have very low ongoing operating costs once the initial infrastructure is built. This insulates electricity generation costs from future currency depreciation and global commodity price shocks — a structural hedge against the type of energy-driven cost-push inflation Pakistan experienced in 2022-23.", ur: "درآمدی فوسل ایندھن کے برعکس جن کی لاگت عالمی قیمتوں اور PKR شرح تبادلہ کے ساتھ اتار چڑھاؤ کرتی ہے، شمسی اور ہوا توانائی کی جاری آپریٹنگ لاگت بہت کم ہوتی ہے۔ یہ بجلی پیداوار لاگت کو مستقبل کی کرنسی کمزوری سے محفوظ کرتا ہے۔", rm: "Daraamdaati fossil eendhan ke bar'aks jin ki lagat aalami qeematon aur PKR shar-e-tabadla ke saath utaar-charhaao karti hai, shamsi aur hawa tawanaayi ki jaari operating lagat bahut kam hoti hai. Yeh bijli paidawar lagat ko mustaqbil ki currency kamzori se mehfooz karta hai." },
    },
  ],
  faq: [
    {
      question: { en: "Why doesn't Pakistan just keep energy prices low permanently to control inflation?", ur: "پاکستان افراط زر کنٹرول کرنے کے لیے توانائی قیمتیں مستقل طور پر کم کیوں نہیں رکھتا؟", rm: "Pakistan inflation control karne ke liye tawanaayi qeematen mustaqil tor par kam kyun nahin rakhta?" },
      answer: { en: "Keeping energy prices artificially low is exactly what created the circular debt crisis in the first place. If prices don't cover the true cost of generation and distribution, someone has to absorb the difference — historically, the government absorbed it through subsidies funded by borrowing, which added to the fiscal deficit and national debt. Eventually, this becomes unsustainable (Pakistan's circular debt reached Rs2.5+ trillion), forcing the government to either default on payments to power producers (risking blackouts) or sharply raise tariffs. The IMF, as a condition for financial support, has required Pakistan to move toward cost-reflective energy pricing to prevent the circular debt problem from recurring. The painful trade-off: either accept gradual, market-based price adjustments now, or face larger, more disruptive shocks later when subsidies become fiscally unsustainable.", ur: "توانائی قیمتوں کو مصنوعی طور پر کم رکھنا بالکل وہی ہے جس نے گردشی قرضے کا بحران پیدا کیا۔ اگر قیمتیں پیداوار اور تقسیم کی حقیقی لاگت پوری نہیں کرتیں، تو کسی کو فرق جذب کرنا پڑتا ہے — تاریخی طور پر، حکومت نے قرض سے فنڈ شدہ سبسڈیوں کے ذریعے اسے جذب کیا۔", rm: "Tawanaayi qeematon ko masnooi tor par kam rakhna bilkul wahi hai jis ne gardishi qarzay ka bohran paida kiya. Agar qeematen paidawar aur taqseem ki haqeeqi lagat poori nahin karteeN, to kisi ko faraq jazb karna parta hai — taareekhi tor par, hukoomat ne qarz se fund shuda subsidiyon ke zariye ise jazb kiya." },
    },
  ],
};
