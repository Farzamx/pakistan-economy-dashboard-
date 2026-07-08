import type { Lesson } from "@/lib/academy/types";

export const demandPullLesson: Lesson = {
  slug: "demand-pull",
  category: "inflation",
  title: { en: "Demand-Pull Inflation Explained", ur: "طلب-کشش افراط زر کی وضاحت", rm: "Talab-Kashish Inflation ki Wazaahat" },
  subtitle: {
    en: "Why too much money chasing too few goods causes prices to rise — and Pakistan's PMKJ stimulus experience",
    ur: "بہت کم اشیاء کے پیچھے بہت زیادہ پیسہ قیمتیں کیوں بڑھاتا ہے — اور پاکستان کا PMKJ محرک تجربہ",
    rm: "Bahut kam ashaaya ke peechhe bahut zyada paisa qeematen kyun barhata hai — aur Pakistan ka PMKJ mohrik tajruba",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan"],
  relatedLessonSlugs: ["types-of-inflation", "cost-push", "money-and-currency", "fiscal-vs-monetary"],
  content: {
    overview: {
      en: "Demand-pull inflation occurs when aggregate demand (total spending in the economy) grows faster than aggregate supply (total productive capacity). When everyone has more money to spend but the economy can't produce more goods quickly, sellers raise prices. This is the 'too much money chasing too few goods' scenario. It's often triggered by fiscal stimulus, loose monetary policy, or commodity booms. In Pakistan, demand-pull inflation episodes have followed large government spending increases and SBP money printing.",
      ur: "طلب-کشش افراط زر اس وقت ہوتا ہے جب مجموعی طلب (معیشت میں کل خرچ) مجموعی سپلائی (کل پیداواری صلاحیت) سے تیز بڑھے۔ جب ہر کوئی خرچ کرنے کے لیے زیادہ پیسہ رکھتا ہے لیکن معیشت تیزی سے مزید اشیاء پیدا نہیں کر سکتی، بیچنے والے قیمتیں بڑھاتے ہیں۔ پاکستان میں، طلب-کشش افراط زر کے اقساط بڑے سرکاری اخراجات میں اضافے اور SBP کی رقم چھاپنے کے بعد آئے ہیں۔",
      rm: "Talab-kashish inflation us waqt hota hai jab majmooee talab (muaashat mein kul kharch) majmooee supply (kul paidawaari salaaḥiyat) se tez barhe. Jab har koi kharch karne ke liye zyada paisa rakhta hai lekin muaashat tezi se mazeed ashaaya paida nahin kar sakti, bechne wale qeematen barhate hain. Pakistan mein, talab-kashish inflation ke aqsaat bare sarkari ikhraajaati mein izaafe aur SBP ki raqam chhaapne ke baad aaye hain.",
    },
    whyItMatters: {
      en: "Demand-pull inflation is the type most responsive to monetary policy (raising interest rates). Understanding when demand-pull is driving inflation versus cost-push helps policymakers choose the right tool. When Pakistan's SBP raises rates to fight inflation, it's primarily targeting demand-pull — reducing borrowing, investment, and consumer spending to bring demand back in line with supply. Pakistan's 2021-22 pre-election spending boom created demand-pull pressure that fed into the 2022-23 inflation crisis.",
      ur: "طلب-کشش افراط زر وہ قسم ہے جو مالیاتی پالیسی (شرح سود بڑھانے) کے لیے سب سے زیادہ جوابدہ ہے۔ یہ سمجھنا کہ طلب-کشش یا لاگت-دھکیل افراط زر چلا رہی ہے پالیسی سازوں کو صحیح آلہ چننے میں مدد کرتا ہے۔ جب SBP شرحیں بڑھاتی ہے، یہ بنیادی طور پر طلب-کشش کو ہدف بنا رہی ہے۔",
      rm: "Talab-kashish inflation woh qism hai jo maaliyaati policy (shar-e-sood barhane) ke liye sab se zyada jawaabdah hai. Yeh samajhna ke talab-kashish ya lagat-dhakail inflation chala rahi hai policy saazoon ko sahih aala chunne mein madad karta hai. Jab SBP sharhein barhati hai, yeh bunyaadi tor par talab-kashish ko hadaf bana rahi hai.",
    },
    explanation: {
      en: `**What drives demand-pull inflation:**

**1. Fiscal stimulus (government spending):** When the government spends more than it collects in taxes (deficit spending), it injects purchasing power into the economy. If the economy is already near full capacity, this excess demand drives up prices.

**2. Loose monetary policy:** When the SBP keeps interest rates low, borrowing is cheap. Businesses borrow to invest, consumers borrow to spend. This credit expansion raises aggregate demand. If supply doesn't keep pace, inflation follows.

**3. Consumer confidence booms:** When households feel wealthy (rising asset prices, employment boom), they spend more. Increased spending → higher demand → price pressure.

**4. Export booms:** When export earnings surge (higher commodity prices, currency depreciation boosting export competitiveness), foreign currency flows in, increasing the money supply domestically.

**The output gap concept:**
- Potential GDP: what the economy can produce at full capacity without inflationary pressure
- Actual GDP: what the economy is actually producing
- When actual > potential (positive output gap): demand exceeds capacity → demand-pull inflation
- When actual < potential (negative output gap): spare capacity → deflationary pressure

**Pakistan's capacity constraints:** Pakistan's supply side is often constrained by energy shortages (load shedding), infrastructure gaps, and imported inputs. So even moderate demand increases can cause prices to rise because supply can't easily expand.`,
      ur: `**طلب-کشش افراط زر کیا چلاتا ہے:**

**1. مالی محرک (سرکاری خرچ):** جب حکومت ٹیکس سے زیادہ خرچ کرتی ہے، یہ معیشت میں قوت خرید انجیکٹ کرتی ہے۔ اگر معیشت پہلے سے مکمل صلاحیت کے قریب ہے، تو یہ زائد طلب قیمتیں بڑھاتی ہے۔

**2. ڈھیلی مالیاتی پالیسی:** جب SBP شرح سود کم رکھتی ہے، قرض لینا سستا ہے۔ یہ کریڈٹ توسیع مجموعی طلب بڑھاتی ہے۔

**3. صارف اعتماد ابھار:** جب گھرانے امیر محسوس کریں، وہ زیادہ خرچ کرتے ہیں۔

**4. برآمد ابھار:** جب برآمدی آمدنی بڑھتی ہے، غیر ملکی کرنسی آتی ہے، ملکی پیسے کی فراہمی بڑھاتی ہے۔

**آؤٹ پٹ گیپ تصور:**
- جب اصل > ممکنہ (مثبت آؤٹ پٹ گیپ): طلب صلاحیت سے زیادہ → طلب-کشش افراط زر`,
      rm: `**Talab-kashish inflation kya chalata hai:**

**1. Maali mohrik (sarkari kharch):** Jab hukoomat tax se zyada kharch karti hai, yeh muaashat mein quwwat-e-khireed inject karti hai. Agar muaashat pehle se mukammal salaaḥiyat ke qareeb hai, to yeh zaaid talab qeematen barhati hai.

**2. Dhili maaliyaati policy:** Jab SBP shar-e-sood kam rakhti hai, qarz lena sasta hai. Yeh credit tausee majmooee talab barhati hai.

**3. Saraaf aitmaad ubhaar:** Jab ghraane ameer mehsoos karen, woh zyada kharch karte hain.

**4. Baraamdaat ubhaar:** Jab baraamdaati aamdani barhti hai, ghair mulki currency aati hai, mulki paise ki faraahami barhati hai.`,
    },
    misconceptions: {
      en: `**Myth 1: All inflation is demand-pull.** Supply shocks (food crop failures, oil price spikes), currency depreciation, and supply chain disruptions all cause inflation without demand increasing. Treating supply-side inflation as demand-side leads to over-tightening.

**Myth 2: Demand-pull inflation is always caused by the government.** Private sector credit booms can also create excess demand — Pakistan's 2007-08 consumer credit boom (easy car loans, mortgages) contributed to demand-pull inflation without government stimulus.

**Myth 3: Reducing government spending always reduces inflation.** If the private sector fills the spending gap, demand remains high. Also, cuts in public investment (PSDP) can reduce supply-side capacity, worsening the supply-demand gap longer-term.`,
      ur: `**غلط فہمی 1: تمام افراط زر طلب-کشش ہے۔** سپلائی جھٹکے (فصل کی ناکامیاں، تیل کی قیمتوں میں اضافہ)، کرنسی کی کمزوری سب افراط زر کا باعث بنتے ہیں۔

**غلط فہمی 2: طلب-کشش افراط زر ہمیشہ حکومت کی وجہ سے ہے۔** نجی شعبے کے کریڈٹ ابھار بھی زائد طلب پیدا کر سکتے ہیں۔

**غلط فہمی 3: سرکاری خرچ کم کرنا ہمیشہ افراط زر کم کرتا ہے۔** اگر نجی شعبہ خرچ خلا کو پر کرتا ہے، طلب اعلی رہتی ہے۔`,
      rm: `**Ghalat fehmi 1: Tamam inflation talab-kashish hai.** Supply jhatke (fasl ki naakamiyan, tel ki qeematon mein izaafa), currency ki kamzori sab inflation ka baais bante hain.

**Ghalat fehmi 2: Talab-kashish inflation hamesha hukoomat ki wajah se hai.** Niji shube ke credit ubhaar bhi zaaid talab paida kar sakte hain.

**Ghalat fehmi 3: Sarkari kharch kam karna hamesha inflation kam karta hai.** Agar niji shuba kharch khala ko pur karta hai, talab aali rehti hai.`,
    },
    pakistanExample: {
      en: `**PMKJ (Ehsaas Kafaalat) COVID Cash Transfers (2020-21):** During COVID, Pakistan's government disbursed Rs144 billion in cash (Rs12,000-25,000 per household) to ~15 million vulnerable families under the Ehsaas programme. This was sound social policy — the poorest needed income support. But it also injected large purchasing power into an economy with disrupted supply chains. Recipients used cash for food (causing food price spikes in some areas) and basic goods. This demand-pull element — combined with global supply disruptions — contributed to the post-COVID inflation that began building in 2021.`,
      ur: `**PMKJ (احساس کفالت) COVID نقد ٹرانسفر (2020-21):** COVID کے دوران، پاکستان کی حکومت نے احساس پروگرام کے تحت ~1.5 کروڑ کمزور خاندانوں کو Rs144 ارب نقد تقسیم کیا۔ یہ اچھی سماجی پالیسی تھی۔ لیکن اس نے ٹوٹی سپلائی چین والی معیشت میں بڑی قوت خرید انجیکٹ کی۔ اس طلب-کشش عنصر نے — عالمی سپلائی میں خلل کے ساتھ مل کر — پوسٹ-COVID افراط زر میں حصہ ڈالا جو 2021 میں بننا شروع ہوا۔`,
      rm: `**PMKJ (Ehsaas Kafaalat) COVID Naqad Transfer (2020-21):** COVID ke dauran, Pakistan ki hukoomat ne Ehsaas programme ke tehet ~1.5 karor kamzor khandanon ko Rs144 arab naqad taqseem kiya. Yeh achi samaaji policy thi. Lekin is ne tuti supply chain waali muaashat mein bari quwwat-e-khireed inject ki. Is talab-kashish ansar ne — aalami supply mein khalal ke saath mil kar — post-COVID inflation mein hissa daala jo 2021 mein banna shuroo hua.`,
    },
    realWorld: {
      en: "Germany's hyperinflation (1921-23) is the extreme demand-pull case. Germany paid WWI reparations by printing money — massively expanding the money supply without any corresponding increase in production. Within months, the purchasing power of the Mark collapsed: prices that were 1 Mark in 1921 cost 4.2 trillion Marks in November 1923. Workers were paid twice a day and ran to buy food immediately because prices rose by the hour. This case shows that when money supply grows far faster than output, demand-pull inflation becomes hyperinflation.)",
      ur: "جرمنی کی ہائپر افراط زر (1921-23) انتہائی طلب-کشش کیس ہے۔ جرمنی نے پیسہ چھاپ کر WWI تلافی ادا کی — بغیر پیداوار میں کوئی اضافے کے پیسے کی فراہمی بڑے پیمانے پر بڑھائی۔ نومبر 1923 میں 1 مارک کی قیمت 4.2 ٹریلین مارک ہو گئی۔",
      rm: "Germany ki hyper inflation (1921-23) intihaayi talab-kashish case hai. Germany ne paisa chhaap kar WWI talaafi ada ki — baghair paidawar mein koi izaafe ke paise ki faraahami bare paimane par barhaai. November 1923 mein 1 Mark ki qeemat 4.2 trillion Mark ho gayi.",
    },
    summary: {
      en: "• Demand-pull: aggregate demand > aggregate supply → prices rise\n• Triggers: fiscal stimulus, loose monetary policy, consumer confidence, export booms\n• Output gap: when actual GDP > potential GDP, inflation builds\n• Fix: reduce demand — raise interest rates (SBP policy), cut fiscal deficit\n• Pakistan's 2021-22 election spending + SBP money printing → demand-pull pressure\n• Limit: rate hikes only work for demand-pull, not cost-push or imported inflation",
      ur: "• طلب-کشش: مجموعی طلب > مجموعی سپلائی → قیمتیں بڑھتی ہیں\n• محرکات: مالی محرک، ڈھیلی مالیاتی پالیسی، صارف اعتماد، برآمد ابھار\n• آؤٹ پٹ گیپ: جب اصل GDP > ممکنہ GDP، افراط زر بنتا ہے\n• علاج: طلب کم کریں — شرح سود بڑھائیں، مالی خسارہ کم کریں\n• پاکستان کا 2021-22 انتخابی خرچ + SBP رقم چھاپنا → طلب-کشش دباؤ\n• حد: شرح اضافے صرف طلب-کشش کے لیے کام کرتے ہیں، لاگت-دھکیل یا درآمدی افراط زر کے لیے نہیں",
      rm: "• Talab-kashish: majmooee talab > majmooee supply → qeematen barhti hain\n• Mohrikaat: maali mohrik, dhili maaliyaati policy, saraaf aitmaad, baraamdaat ubhaar\n• Output gap: jab asl GDP > mumkina GDP, inflation banta hai\n• Ilaaj: talab kam karein — shar-e-sood barhaaein, maali khasaara kam karein\n• Pakistan ka 2021-22 intikhabi kharch + SBP raqam chhaapna → talab-kashish dabaao\n• Hadd: shar izaafey sirf talab-kashish ke liye kaam karte hain, lagat-dhakail ya daraamdaati inflation ke liye nahin",
    },
  },
  quiz: [
    {
      question: { en: "In the COVID period, the government gave Rs144 billion in cash transfers to poor households. How did this contribute to inflation?", ur: "COVID کے دوران، حکومت نے غریب گھرانوں کو Rs144 ارب نقد ٹرانسفر دیے۔ اس نے افراط زر میں کیسے حصہ ڈالا؟", rm: "COVID ke dauran, hukoomat ne ghareeb ghraanon ko Rs144 arab naqad transfer diye. Is ne inflation mein kaise hissa daala?" },
      options: [
        { en: "It didn't — giving money to poor people never causes inflation", ur: "نہیں — غریب لوگوں کو پیسہ دینا کبھی افراط زر کا باعث نہیں بنتا", rm: "Nahin — ghareeb logon ko paisa dena kabhi inflation ka baais nahin banta" },
        { en: "It boosted demand in a supply-constrained economy — more money chasing limited goods", ur: "اس نے سپلائی محدود معیشت میں طلب بڑھائی — محدود اشیاء کے پیچھے زیادہ پیسہ", rm: "Is ne supply mahdood muaashat mein talab barhaai — mahdood ashaaya ke peechhe zyada paisa" },
        { en: "It caused hyperinflation immediately", ur: "اس نے فوری ہائپر افراط زر پیدا کیا", rm: "Is ne fori hyper inflation paida kiya" },
        { en: "It only affected the stock market, not consumer prices", ur: "اس نے صرف اسٹاک مارکیٹ کو متاثر کیا، صارف قیمتوں کو نہیں", rm: "Is ne sirf stock market ko mutaassir kiya, saraaf qeematon ko nahin" },
      ],
      correctIndex: 1,
      explanation: { en: "Cash transfers boost purchasing power — recipients can buy more goods. If supply is constrained (pandemic disruptions), this increased spending can't be met by more production. Result: sellers raise prices. This is demand-pull — not wrong policy, just an inherent trade-off in stimulus during supply disruptions.", ur: "نقد ٹرانسفر قوت خرید بڑھاتے ہیں — وصول کنندگان مزید اشیاء خرید سکتے ہیں۔ اگر سپلائی محدود ہو (وبا میں خلل)، یہ بڑھا ہوا خرچ مزید پیداوار سے پورا نہیں ہو سکتا۔ نتیجہ: بیچنے والے قیمتیں بڑھاتے ہیں۔", rm: "Naqad transfer quwwat-e-khireed barhate hain — wasool kunandgan mazeed ashaaya khareed sakte hain. Agar supply mahdood ho (waba mein khalal), yeh barha hua kharch mazeed paidawar se poora nahin ho sakta. Nateeja: bechne wale qeematen barhate hain." },
    },
    {
      question: { en: "What is the 'output gap' in macroeconomics?", ur: "معاشیات کبیر میں 'آؤٹ پٹ گیپ' کیا ہے؟", rm: "Maashiyaat-e-kabeer mein 'output gap' kya hai?" },
      options: [
        { en: "The gap between exports and imports", ur: "برآمدات اور درآمدات کے درمیان خلا", rm: "Baraamdaat aur daraamdaat ke darmiyan khala" },
        { en: "The difference between actual GDP and potential GDP — when positive, it signals demand-pull inflation pressure", ur: "اصل GDP اور ممکنہ GDP کے درمیان فرق — جب مثبت ہو، یہ طلب-کشش افراط زر دباؤ کا اشارہ دیتا ہے", rm: "Asl GDP aur mumkina GDP ke darmiyan faraq — jab masbat ho, yeh talab-kashish inflation dabaao ka ishaara deta hai" },
        { en: "The budget deficit in a given year", ur: "کسی سال میں بجٹ خسارہ", rm: "Kisi saal mein budget khasaara" },
        { en: "The gap between rich and poor in terms of income", ur: "آمدنی کے لحاظ سے امیر اور غریب کے درمیان خلا", rm: "Aamdani ke lihaaz se ameer aur ghareeb ke darmiyan khala" },
      ],
      correctIndex: 1,
      explanation: { en: "Potential GDP is what the economy can produce at full employment without inflation. When actual GDP exceeds potential (positive output gap), the economy is running 'hot' — demand exceeds capacity, creating upward price pressure. When actual GDP is below potential (negative output gap), there's spare capacity — deflationary conditions.", ur: "ممکنہ GDP وہ ہے جو معیشت افراط زر کے بغیر مکمل روزگار پر پیدا کر سکتی ہے۔ جب اصل GDP ممکنہ سے زیادہ ہو (مثبت آؤٹ پٹ گیپ)، معیشت 'گرم' چل رہی ہے — طلب صلاحیت سے زیادہ، اوپر کی قیمت دباؤ پیدا کرتی ہے۔", rm: "Mumkina GDP woh hai jo muaashat inflation ke baghair mukammal rozgaar par paida kar sakti hai. Jab asl GDP mumkina se zyada ho (masbat output gap), muaashat 'garm' chal rahi hai — talab salaaḥiyat se zyada, uupar ki qeemat dabaao paida karti hai." },
    },
    {
      question: { en: "Which of the following would NOT cause demand-pull inflation?", ur: "مندرجہ ذیل میں سے کون سا طلب-کشش افراط زر کا باعث نہیں بنے گا؟", rm: "Mundarja zeel mein se kaun sa talab-kashish inflation ka baais nahin banega?" },
      options: [
        { en: "Government printing money to fund spending", ur: "حکومت کا اخراجات فنڈ کرنے کے لیے پیسہ چھاپنا", rm: "Hukoomat ka ikhraajaati fund karne ke liye paisa chhaapna" },
        { en: "SBP cutting interest rates dramatically", ur: "SBP کا شرح سود ڈرامائی طور پر کم کرنا", rm: "SBP ka shar-e-sood dramaayi tor par kam karna" },
        { en: "A drought destroying 30% of the wheat crop", ur: "ایک خشک سالی 30٪ گندم فصل تباہ کر دیتی ہے", rm: "Ek khushk saali 30% gandum fasal tabaah kar deti hai" },
        { en: "Strong export earnings flooding the economy with dollars converted to rupees", ur: "مضبوط برآمدی آمدنی معیشت کو روپوں میں تبدیل ڈالروں سے بھرتی ہے", rm: "Mazboot baraamdaati aamdani muaashat ko rupon mein tabdeel daallaron se bharti hai" },
      ],
      correctIndex: 2,
      explanation: { en: "A drought destroying wheat crops is a supply shock — it reduces the quantity of wheat available. This raises prices due to supply reduction, not demand increase. It's cost-push/supply-side inflation, not demand-pull. The other three options all increase aggregate demand (government spending, lower borrowing costs, export earnings).", ur: "گندم کی فصل تباہ کرنے والی خشک سالی ایک سپلائی جھٹکا ہے — یہ دستیاب گندم کی مقدار کم کرتی ہے۔ یہ سپلائی کمی کی وجہ سے قیمتیں بڑھاتا ہے، طلب میں اضافے کی وجہ سے نہیں۔ یہ لاگت-دھکیل/سپلائی-سائیڈ افراط زر ہے، طلب-کشش نہیں۔", rm: "Gandum ki fasal tabaah karne wali khushk saali ek supply jhatka hai — yeh dastiyaab gandum ki miqdar kam karti hai. Yeh supply kami ki wajah se qeematen barhata hai, talab mein izaafe ki wajah se nahin. Yeh lagat-dhakail/supply-side inflation hai, talab-kashish nahin." },
    },
    {
      question: { en: "The SBP raises interest rates to fight demand-pull inflation. What is the main mechanism?", ur: "SBP طلب-کشش افراط زر سے لڑنے کے لیے شرح سود بڑھاتی ہے۔ اہم طریقہ کار کیا ہے؟", rm: "SBP talab-kashish inflation se larne ke liye shar-e-sood barhati hai. Ahem tareeqa-kaar kya hai?" },
      options: [
        { en: "Higher rates directly reduce the price of goods", ur: "اعلی شرحیں اشیاء کی قیمت براہ راست کم کرتی ہیں", rm: "Aali sharhein ashaaya ki qeemat baraah-e-raast kam karti hain" },
        { en: "Higher rates make borrowing more expensive → businesses invest less, consumers spend less → aggregate demand falls → inflation pressure reduces", ur: "اعلی شرحیں قرض لینا زیادہ مہنگا بناتی ہیں → کاروبار کم سرمایہ کاری کرتے ہیں، صارفین کم خرچ کرتے ہیں → مجموعی طلب گرتی ہے → افراط زر کا دباؤ کم ہوتا ہے", rm: "Aali sharhein qarz lena zyada mahanga banati hain → kaarobaar kam sarmaaya kaari karte hain, saraafeen kam kharch karte hain → majmooee talab girti hai → inflation ka dabaao kam hota hai" },
        { en: "Higher rates automatically reduce government spending", ur: "اعلی شرحیں خودکار طور پر سرکاری خرچ کم کرتی ہیں", rm: "Aali sharhein khudkaar tor par sarkari kharch kam karti hain" },
        { en: "Higher rates increase the supply of goods in the economy", ur: "اعلی شرحیں معیشت میں اشیاء کی سپلائی بڑھاتی ہیں", rm: "Aali sharhein muaashat mein ashaaya ki supply barhati hain" },
      ],
      correctIndex: 1,
      explanation: { en: "Monetary transmission: SBP raises policy rate → commercial banks raise lending rates → businesses face higher borrowing costs → they scale back investment and expansion → consumers face higher EMIs on loans → they spend less → aggregate demand falls → firms have less pricing power → inflation falls. This works well for demand-pull but not for supply-side inflation.", ur: "مالیاتی ترسیل: SBP پالیسی شرح بڑھاتی ہے → تجارتی بینک قرض دینے کی شرحیں بڑھاتے ہیں → کاروبار کو زیادہ قرض لاگت کا سامنا ہے → وہ سرمایہ کاری کم کرتے ہیں → صارفین کو قرضوں پر زیادہ EMI کا سامنا ہے → وہ کم خرچ کرتے ہیں → مجموعی طلب گرتی ہے → افراط زر گرتا ہے۔", rm: "Maaliyaati tarseel: SBP policy shar barhati hai → tijarati bank qarz dene ki sharhein barhate hain → kaarobaar ko zyada qarz lagat ka saamna hai → woh sarmaaya kaari kam karte hain → saraafeen ko qarzon par zyada EMI ka saamna hai → woh kam kharch karte hain → majmooee talab girti hai → inflation girta hai." },
    },
  ],
  faq: [
    {
      question: { en: "How can you tell if inflation is demand-pull or supply-side in real time?", ur: "آپ حقیقی وقت میں کیسے بتا سکتے ہیں کہ افراط زر طلب-کشش ہے یا سپلائی-سائیڈ؟", rm: "Aap haqeeqi waqt mein kaise bata sakte hain ke inflation talab-kashish hai ya supply-side?" },
      answer: { en: "Economists look at several signals: (1) Output gap: if the economy is growing above potential (low unemployment, high capacity utilisation), demand-pull is likely; (2) Wage growth: rapid wage growth across sectors suggests demand-side pressure; (3) Core vs. headline inflation: core inflation (excluding food and energy) is a better gauge of demand-pull, while food/energy price spikes suggest supply shocks; (4) Which sectors are inflating: broad-based price rises across all sectors suggest demand-pull; concentrated rises in specific commodities (food, energy) suggest supply shocks. In Pakistan, the 2022-23 inflation had clear supply-side and imported components (energy deregulation, PKR depreciation) alongside demand-side ones.", ur: "ماہرین اقتصادیات کئی اشارات دیکھتے ہیں: (1) آؤٹ پٹ گیپ: اگر معیشت ممکنہ سے اوپر بڑھ رہی ہے، طلب-کشش ممکنہ ہے؛ (2) اجرت نمو: تیز اجرت نمو طلب-سائیڈ دباؤ کا مشورہ دیتی ہے؛ (3) بنیادی بمقابلہ مجموعی افراط زر: بنیادی افراط زر طلب-کشش کا بہتر گیج ہے؛ (4) کون سے شعبے افراط زر کر رہے ہیں: تمام شعبوں میں وسیع بنیاد قیمت اضافہ طلب-کشش کا مشورہ دیتا ہے۔", rm: "Maahireen iqtisaadiyaat kayi ishaare dekhte hain: (1) Output gap: agar muaashat mumkina se uupar barh rahi hai, talab-kashish mumkina hai; (2) Ujrat numa: tez ujrat numa talab-side dabaao ka mashwarah deti hai; (3) Bunyaadi ba-muqaabla majmooee inflation: bunyaadi inflation talab-kashish ka behtar gauge hai; (4) Kaun se shube inflation kar rahe hain: tamam shubon mein wasee bunyaad qeemat izaafa talab-kashish ka mashwarah deta hai." },
    },
  ],
};
