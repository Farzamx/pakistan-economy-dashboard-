import type { Lesson } from "@/lib/academy/types";

export const typesOfInflationLesson: Lesson = {
  slug: "types-of-inflation",
  category: "inflation",
  title: { en: "Types of Inflation: A Complete Guide", ur: "افراط زر کی اقسام: ایک مکمل رہنما", rm: "Inflation ki Aqsaam: Ek Mukammal Rahnuma" },
  subtitle: {
    en: "Demand-pull, cost-push, built-in, and imported inflation — and which type Pakistan faces",
    ur: "طلب-کشش، لاگت-دھکیل، اندرونی، اور درآمدی افراط زر — اور پاکستان کس قسم کا سامنا کرتا ہے",
    rm: "Talab-kashish, lagat-dhakail, androoni, aur daraamdaati inflation — aur Pakistan kis qism ka saamna karta hai",
  },
  level: "beginner",
  readMinutes: 7,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan"],
  relatedLessonSlugs: ["demand-pull", "cost-push", "imported-inflation", "inflation-expectations"],
  content: {
    overview: {
      en: "Inflation is not a single phenomenon — it has different causes that require different policy responses. Demand-pull inflation comes from too much spending chasing too few goods. Cost-push inflation comes from rising production costs. Built-in (wage-price spiral) inflation comes from expectations. Imported inflation comes from global price changes passing through exchange rates. Pakistan's 2022-23 inflation crisis (peaking at 38%) was all four types simultaneously — making it exceptionally difficult to control.",
      ur: "افراط زر ایک واحد رجحان نہیں ہے — اس کی مختلف وجوہات ہیں جن کے لیے مختلف پالیسی ردعمل درکار ہیں۔ طلب-کشش افراط زر بہت کم اشیاء کے پیچھے بہت زیادہ خرچ سے آتا ہے۔ لاگت-دھکیل افراط زر بڑھتی پیداواری لاگت سے آتا ہے۔ پاکستان کا 2022-23 افراط زر بحران (38٪ تک پہنچتا ہے) چاروں اقسام بیک وقت تھیں۔",
      rm: "Inflation ek waahid ruzhan nahin hai — is ki mukhtalif wajoohaatein hain jin ke liye mukhtalif policy rad-e-amal darkaar hain. Talab-kashish inflation bahut kam ashaaya ke peechhe bahut zyada kharch se aata hai. Lagat-dhakail inflation barhti paidawaari lagat se aata hai. Pakistan ka 2022-23 inflation bohran (38% tak pohunchata hai) chaaron aqsaam bayak waqt thin.",
    },
    whyItMatters: {
      en: "Misdiagnosing the type of inflation leads to wrong policy. If you treat cost-push inflation with demand-reduction (raising interest rates aggressively), you get a recession without curing the inflation — because the inflation source was supply-side, not demand-side. Pakistan's SBP faced exactly this: much of 2022-23 inflation was cost-push (energy prices, supply chain disruptions) and imported (PKR depreciation). Raising rates 22% could reduce demand but couldn't fix expensive global oil or a weak currency.",
      ur: "افراط زر کی قسم کی غلط تشخیص غلط پالیسی کا باعث بنتی ہے۔ اگر آپ لاگت-دھکیل افراط زر کا شرح سود بڑھا کر علاج کرتے ہیں، تو آپ کساد بازاری حاصل کرتے ہیں بغیر افراط زر کا علاج کیے — کیونکہ افراط زر کا ذریعہ سپلائی-سائیڈ تھا، طلب-سائیڈ نہیں۔ پاکستان کے SBP کو بالکل یہی سامنا کرنا پڑا۔",
      rm: "Inflation ki qism ki ghalat tashkhees ghalat policy ka baais banti hai. Agar aap lagat-dhakail inflation ka shar-e-sood barha kar ilaaj karte hain, to aap kasaad-baazaari haasil karte hain baghair inflation ka ilaaj kiye — kyunke inflation ka zariya supply-side tha, talab-side nahin. Pakistan ke SBP ko bilkul yahi saamna karna para.",
    },
    explanation: {
      en: `**The four main types of inflation:**

**1. Demand-pull inflation** — "Too much money chasing too few goods"
When aggregate demand exceeds aggregate supply, prices rise. Causes: government fiscal stimulus, low interest rates fuelling borrowing and spending, high consumer confidence, export booms.
*Pakistan example:* COVID-era PMKJ cash transfers (Rs144bn) boosted demand while supply was constrained.

**2. Cost-push inflation** — "Stagflation driver"
When production costs rise (energy, raw materials, wages), firms pass the increase to consumers via higher prices. Even if demand is stable, prices rise. Can cause simultaneous inflation + recession (stagflation).
*Pakistan example:* Pakistan removed fuel subsidies in 2022 — petrol went from Rs149 to Rs330/litre. This raised the cost of transport, agriculture, manufacturing — pushing up prices for almost everything.

**3. Built-in inflation (wage-price spiral)**
Workers demand higher wages to compensate for past inflation. Higher wages raise firms' costs, which they pass to consumers as higher prices, which workers then demand higher wages to compensate for — a self-reinforcing cycle. Once entrenched, hard to break without recession.
*Pakistan example:* Government workers received 35% pay raise in FY2024 budget. This raised public sector wages, pressuring private sector to match, adding to cost pressures.

**4. Imported inflation** — "Transmitted through exchange rates"
When a country's currency weakens, imported goods cost more in local currency. Pakistan imports oil, gas, wheat, machinery, chemicals — all priced in dollars. When PKR fell from 180 to 300 (2022-23), all these imported costs doubled in rupee terms — directly feeding into domestic inflation.

**Pakistan's 2022-23 perfect storm:** All four types simultaneously:
- Demand-pull: post-COVID stimulus + election-year spending
- Cost-push: energy price deregulation, global commodity price spike
- Built-in: 25-30% wage demands following 35%+ inflation
- Imported: PKR depreciation of 40%+ in 12 months`,
      ur: `**افراط زر کی چار اہم اقسام:**

**1. طلب-کشش افراط زر** — "بہت کم اشیاء کے پیچھے بہت زیادہ پیسہ"
جب مجموعی طلب مجموعی سپلائی سے زیادہ ہو، قیمتیں بڑھتی ہیں۔

**2. لاگت-دھکیل افراط زر** — "سٹیگ فلیشن ڈرائیور"
جب پیداواری لاگت بڑھتی ہے، کمپنیاں اضافہ صارفین کو اعلی قیمتوں کے ذریعے منتقل کرتی ہیں۔

**3. اندرونی افراط زر (اجرت-قیمت سرپل)**
مزدور ماضی کے افراط زر کی تلافی کے لیے اعلی اجرتیں مانگتے ہیں۔ ایک بار داخل ہونے پر توڑنا مشکل ہے۔

**4. درآمدی افراط زر** — "شرح تبادلہ کے ذریعے منتقل"
جب کرنسی کمزور ہوتی ہے، درآمدی اشیاء مقامی کرنسی میں زیادہ قیمت پڑتی ہیں۔`,
      rm: `**Inflation ki chaar ahem aqsaam:**

**1. Talab-kashish inflation** — "Bahut kam ashaaya ke peechhe bahut zyada paisa"
Jab majmooee talab majmooee supply se zyada ho, qeematen barhti hain.

**2. Lagat-dhakail inflation** — "Stagflation driver"
Jab paidawaari lagat barhti hai, companies izaafa saraafeen ko aali qeematon ke zariye muntaqil karti hain.

**3. Androoni inflation (ujrat-qeemat spiral)**
Mazdoor maazi ke inflation ki talaafi ke liye aali ujraten maangten hain. Ek baar daakhil hone par torhna mushkil hai.

**4. Daraamdaati inflation** — "Shar-e-tabadla ke zariye muntaqil"
Jab currency kamzor hoti hai, daraamdaati ashaaya maqaami currency mein zyada qeemat parti hain.`,
    },
    misconceptions: {
      en: `**Myth 1: All inflation is caused by printing money.** The money supply matters, but cost-push and imported inflation can happen without money printing. Pakistan's 2022-23 inflation was partly driven by PKR depreciation and energy deregulation — not primarily money printing (though that contributed too).

**Myth 2: Raising interest rates fixes all types of inflation.** Rates work against demand-pull and built-in inflation. They do little to fix cost-push (a supply problem) or imported inflation (an exchange rate problem). Excessive rate hikes during cost-push inflation can cause stagflation — recession without curing inflation.

**Myth 3: Low inflation is always better.** Moderate inflation (~2-3%) lubricates an economy. Zero or negative inflation (deflation) is dangerous — it causes consumers to delay purchases (prices will be lower tomorrow), reducing demand and triggering recession. Most central banks target ~2% inflation, not zero.`,
      ur: `**غلط فہمی 1: تمام افراط زر پیسہ چھاپنے کی وجہ سے ہوتا ہے۔** رقم کی فراہمی اہم ہے، لیکن لاگت-دھکیل اور درآمدی افراط زر پیسہ چھاپے بغیر ہو سکتا ہے۔

**غلط فہمی 2: شرح سود بڑھانا تمام اقسام کے افراط زر کو ٹھیک کرتا ہے۔** شرحیں طلب-کشش کے خلاف کام کرتی ہیں۔ لاگت-دھکیل یا درآمدی افراط زر کو ٹھیک کرنے کے لیے کم کرتی ہیں۔

**غلط فہمی 3: کم افراط زر ہمیشہ بہتر ہے۔** معتدل افراط زر (~2-3٪) معیشت کو چکنائی دیتا ہے۔ تفریح (افلاس زر) خطرناک ہے۔`,
      rm: `**Ghalat fehmi 1: Tamam inflation paisa chhaapne ki wajah se hota hai.** Raqam ki faraahami ahem hai, lekin lagat-dhakail aur daraamdaati inflation paisa chhaape baghair ho sakta hai.

**Ghalat fehmi 2: Shar-e-sood barhana tamam aqsaam ke inflation ko theek karta hai.** Sharhein talab-kashish ke khilaf kaam karti hain. Lagat-dhakail ya daraamdaati inflation ko theek karne ke liye kam karti hain.

**Ghalat fehmi 3: Kam inflation hamesha behtar hai.** Mutadil inflation (~2-3%) muaashat ko chiknaai deta hai. Tafreeq (iflaas-e-zer) khatarnaak hai.`,
    },
    pakistanExample: {
      en: `**FY2022-23: Pakistan's four-type inflation storm:** Pakistan's CPI hit 38% (May 2023). Breaking it down by type: (1) Cost-push: petrol went from Rs149 to Rs330 as government removed fuel subsidies under IMF pressure; electricity tariffs rose 100%+ as circular debt-era subsidies were unwound; (2) Imported: PKR fell from Rs200 to Rs295, raising the rupee cost of all imports by 47%; (3) Demand-pull: fiscal deficits funded by money creation (SBP borrowing) in 2021-22 had already expanded money supply; (4) Built-in: government employees got 35% raises in 2023 budget; private sector followed. The interaction between all four types made inflation self-reinforcing and very persistent.`,
      ur: `**FY2022-23: پاکستان کا چار قسم کا افراط زر طوفان:** پاکستان کا CPI 38٪ (مئی 2023) تک پہنچا۔ قسم کے حساب سے: (1) لاگت-دھکیل: پیٹرول Rs149 سے Rs330 گیا؛ بجلی کا ٹیرف 100٪+ بڑھا؛ (2) درآمدی: PKR Rs200 سے Rs295 گرا؛ (3) طلب-کشش: 2021-22 میں SBP سے قرض نے پیسے کی فراہمی بڑھائی؛ (4) اندرونی: 2023 بجٹ میں 35٪ اجرت اضافہ۔ چاروں اقسام کا باہمی تعامل افراط زر کو خود مضبوط اور بہت پائیدار بنایا۔`,
      rm: `**FY2022-23: Pakistan ka chaar qism ka inflation toofaan:** Pakistan ka CPI 38% (May 2023) tak pohuncha. Qism ke hisaab se: (1) Lagat-dhakail: petrol Rs149 se Rs330 gaya; bijli ka tariff 100%+ barha; (2) Daraamdaati: PKR Rs200 se Rs295 gira; (3) Talab-kashish: 2021-22 mein SBP se qarz ne paise ki faraahami barhaai; (4) Androoni: 2023 budget mein 35% ujrat izaafa. Chaaron aqsaam ka baaham taamus inflation ko khud mazboot aur bahut paayidaar banaya.`,
    },
    realWorld: {
      en: "The 1970s US stagflation is the classic cost-push inflation case. OPEC's 1973 oil embargo quadrupled oil prices — a massive cost-push shock. The US also had demand-pull inflation from Vietnam War spending and expansionary monetary policy. The Federal Reserve, initially confused about the type of inflation, applied both tightening and loosening — worsening stagflation. It took Paul Volcker's 1979-82 aggressive rate hike (rates reached 20%!) — deliberately causing a severe recession — to finally break the built-in inflation spiral. Pakistan's policymakers study this episode carefully.",
      ur: "1970 کی دہائی کی امریکی سٹیگ فلیشن لاگت-دھکیل افراط زر کا کلاسک کیس ہے۔ OPEC کی 1973 تیل کی پابندی نے تیل کی قیمتوں کو چوگنا کر دیا۔ فیڈرل ریزرو نے پہلے افراط زر کی قسم کے بارے میں الجھن میں سختی اور نرمی دونوں لاگو کیں — سٹیگ فلیشن کو بدتر بنایا۔ پال وولکر کی 1979-82 جارحانہ شرح اضافے نے آخرکار اندرونی افراط زر کے سرپل کو توڑا۔",
      rm: "1970 ki dahaayi ki Amreeki stagflation lagat-dhakail inflation ka classic case hai. OPEC ki 1973 tel ki paabandi ne tel ki qeematon ko chaoguna kar diya. Federal Reserve ne pehle inflation ki qism ke baare mein uljhan mein sakhti aur narmi dono laagoo kin — stagflation ko badtar banaya. Paul Volcker ki 1979-82 jaraahana shar izaafe ne bilآخar androoni inflation ke spiral ko tora.",
    },
    summary: {
      en: "• Demand-pull: excess demand > supply → prices rise; fix by reducing demand\n• Cost-push: rising production costs → prices rise; harder to fix with monetary policy alone\n• Built-in: wage-price spiral from inflation expectations; breaks only with recession or credible policy commitment\n• Imported: currency depreciation raises import costs → domestic prices rise\n• Pakistan's 2022-23 inflation: all four types simultaneously → peak 38% CPI\n• Policy lesson: must correctly diagnose type before choosing the cure",
      ur: "• طلب-کشش: زائد طلب > سپلائی → قیمتیں بڑھتی ہیں؛ طلب کم کرکے ٹھیک کریں\n• لاگت-دھکیل: بڑھتی پیداواری لاگت → قیمتیں بڑھتی ہیں؛ اکیلے مالیاتی پالیسی سے ٹھیک کرنا مشکل\n• اندرونی: توقعات سے اجرت-قیمت سرپل؛ صرف کساد بازاری یا قابل اعتماد پالیسی سے ٹوٹتا ہے\n• درآمدی: کرنسی کی کمزوری درآمد لاگت بڑھاتی ہے → ملکی قیمتیں بڑھتی ہیں\n• پاکستان کا 2022-23 افراط زر: چاروں اقسام بیک وقت → 38٪ CPI عروج\n• پالیسی سبق: علاج چننے سے پہلے قسم کی صحیح تشخیص ضروری",
      rm: "• Talab-kashish: zaaid talab > supply → qeematen barhti hain; talab kam karke theek karein\n• Lagat-dhakail: barhti paidawaari lagat → qeematen barhti hain; akele maaliyaati policy se theek karna mushkil\n• Androoni: tawaqquaat se ujrat-qeemat spiral; sirf kasaad-baazaari ya qaabil-e-aitemaad policy se toota hai\n• Daraamdaati: currency ki kamzori daraamd lagat barhati hai → mulki qeematen barhti hain\n• Pakistan ka 2022-23 inflation: chaaron aqsaam bayak waqt → 38% CPI uroj\n• Policy sabaq: ilaaj chunne se pehle qism ki sahih tashkhees zaroori",
    },
  },
  quiz: [
    {
      question: { en: "When Pakistan removed petrol subsidies in 2022, causing fuel prices to double, this primarily caused which type of inflation?", ur: "جب پاکستان نے 2022 میں پیٹرول سبسڈیاں ہٹائیں، جس سے ایندھن کی قیمتیں دوگنی ہو گئیں، تو اس نے بنیادی طور پر کس قسم کا افراط زر پیدا کیا؟", rm: "Jab Pakistan ne 2022 mein petrol subsidiyaan hataaeen, jis se eendhan ki qeematen dugni ho gain, to is ne bunyaadi tor par kis qism ka inflation paida kiya?" },
      options: [
        { en: "Demand-pull inflation", ur: "طلب-کشش افراط زر", rm: "Talab-kashish inflation" },
        { en: "Cost-push inflation — higher energy costs raised production costs throughout the economy", ur: "لاگت-دھکیل افراط زر — اعلی توانائی لاگت نے پوری معیشت میں پیداواری لاگت بڑھائی", rm: "Lagat-dhakail inflation — aali tawanaayi lagat ne poori muaashat mein paidawaari lagat barhaai" },
        { en: "Built-in inflation", ur: "اندرونی افراط زر", rm: "Androoni inflation" },
        { en: "Imported inflation", ur: "درآمدی افراط زر", rm: "Daraamdaati inflation" },
      ],
      correctIndex: 1,
      explanation: { en: "Fuel prices entering the cost structure of transport, agriculture, and manufacturing raise costs for producers throughout the supply chain. Producers pass these higher costs to consumers as higher prices — cost-push inflation. This is distinct from demand-pull (where inflation comes from too much spending, not rising costs).", ur: "ٹرانسپورٹ، زراعت اور مینوفیکچرنگ کی لاگت ساخت میں داخل ہونے والی ایندھن کی قیمتیں سپلائی چین میں پروڈیوسرز کے لیے لاگت بڑھاتی ہیں۔ پروڈیوسرز یہ اعلی لاگتیں صارفین کو اعلی قیمتوں کے طور پر منتقل کرتے ہیں — لاگت-دھکیل افراط زر۔", rm: "Transport, ziraat aur manufacturing ki lagat saakht mein daakhil hone wali eendhan ki qeematen supply chain mein producers ke liye lagat barhati hain. Producers yeh aali lagaten saraafeen ko aali qeematon ke tor par muntaqil karte hain — lagat-dhakail inflation." },
    },
    {
      question: { en: "PKR fell from Rs200 to Rs300 against the dollar in 2022-23. What type of inflation did this cause?", ur: "PKR 2022-23 میں ڈالر کے مقابلے میں Rs200 سے Rs300 گرا۔ اس نے کس قسم کا افراط زر پیدا کیا؟", rm: "PKR 2022-23 mein dollar ke muqaable mein Rs200 se Rs300 gira. Is ne kis qism ka inflation paida kiya?" },
      options: [
        { en: "Demand-pull, as more rupees chased the same goods", ur: "طلب-کشش، جیسے زیادہ روپے ایک جیسی اشیاء کے پیچھے پڑے", rm: "Talab-kashish, jaise zyada rupay ek jaisi ashaaya ke peechhe pare" },
        { en: "Built-in, as workers demanded wage hikes", ur: "اندرونی، جیسے مزدوروں نے اجرت اضافے مانگے", rm: "Androoni, jaise mazduron ne ujrat izaafey maange" },
        { en: "Imported inflation — dollar-priced imports (oil, wheat, machinery) became 50% more expensive in rupees", ur: "درآمدی افراط زر — ڈالر قیمت درآمدات (تیل، گندم، مشینری) روپوں میں 50٪ زیادہ مہنگی ہو گئیں", rm: "Daraamdaati inflation — dollar qeemat daraamdaat (tel, gandum, machinery) rupon mein 50% zyada mahang ho gain" },
        { en: "No inflation — currency changes don't affect domestic prices", ur: "کوئی افراط زر نہیں — کرنسی تبدیلیاں ملکی قیمتوں کو متاثر نہیں کرتیں", rm: "Koi inflation nahin — currency tabdeeliyan mulki qeematon ko mutaassir nahin karti" },
      ],
      correctIndex: 2,
      explanation: { en: "When PKR depreciates, everything Pakistan imports (oil, gas, wheat, machinery, chemicals) costs more in rupees. Pakistan imports 30-40% of its energy needs. A 50% depreciation means all those dollar-priced inputs cost 50% more in rupees — directly driving domestic inflation.", ur: "جب PKR کم ہوتا ہے، پاکستان جو کچھ درآمد کرتا ہے (تیل، گیس، گندم، مشینری) روپوں میں زیادہ قیمت پڑتی ہے۔ 50٪ کمزوری کا مطلب ہے وہ تمام ڈالر قیمت کے آدانات روپوں میں 50٪ زیادہ قیمت پڑتے ہیں — براہ راست ملکی افراط زر کو چلاتے ہیں۔", rm: "Jab PKR kam hota hai, Pakistan jo kuch daraamd karta hai (tel, gas, gandum, machinery) rupon mein zyada qeemat parti hai. 50% kamzori ka matlab hai woh tamam dollar qeemat ke aadaan rupon mein 50% zyada qeemat parte hain — baraah-e-raast mulki inflation ko chalate hain." },
    },
    {
      question: { en: "What is the 'wage-price spiral'?", ur: "'اجرت-قیمت سرپل' کیا ہے؟", rm: "'Ujrat-qeemat spiral' kya hai?" },
      options: [
        { en: "When wages and prices both fall together during deflation", ur: "جب افراط زر میں اجرتیں اور قیمتیں دونوں ایک ساتھ گرتی ہیں", rm: "Jab inflation mein ujraten aur qeematen dono ek saath girti hain" },
        { en: "When workers demand higher wages due to inflation, firms raise prices to cover costs, workers demand higher wages again — a self-reinforcing cycle", ur: "جب مزدور افراط زر کی وجہ سے اعلی اجرتیں مانگتے ہیں، کمپنیاں لاگت پوری کرنے کے لیے قیمتیں بڑھاتی ہیں، مزدور پھر اعلی اجرتیں مانگتے ہیں — ایک خود مضبوط چکر", rm: "Jab mazdoor inflation ki wajah se aali ujraten maangten hain, companies lagat poori karne ke liye qeematen barhati hain, mazdoor phir aali ujraten maangten hain — ek khud mazboot chakar" },
        { en: "When companies spiral into bankruptcy due to high wage costs", ur: "جب کمپنیاں اعلی اجرت لاگت کی وجہ سے دیوالیہ پن میں سرپل ہوتی ہیں", rm: "Jab companies aali ujrat lagat ki wajah se deewaaliyah-pan mein spiral hoti hain" },
        { en: "When the government raises minimum wages to control inflation", ur: "جب حکومت افراط زر کنٹرول کرنے کے لیے کم از کم اجرت بڑھاتی ہے", rm: "Jab hukoomat inflation control karne ke liye kam az kam ujrat barhati hai" },
      ],
      correctIndex: 1,
      explanation: { en: "The wage-price spiral is the mechanism behind built-in inflation. It's self-reinforcing: higher prices → workers demand higher wages → higher wages raise firms' costs → firms raise prices → back to step 1. Breaking this spiral typically requires either a recession (destroying demand enough to break expectations) or very credible central bank policy that convinces everyone inflation will fall.", ur: "اجرت-قیمت سرپل اندرونی افراط زر کے پیچھے طریقہ کار ہے۔ یہ خود مضبوط ہے: اعلی قیمتیں → مزدور اعلی اجرتیں مانگتے ہیں → اعلی اجرتیں کمپنیوں کی لاگت بڑھاتی ہیں → کمپنیاں قیمتیں بڑھاتی ہیں → واپس قدم 1 پر۔", rm: "Ujrat-qeemat spiral androoni inflation ke peechhe tareeqa-kaar hai. Yeh khud mazboot hai: aali qeematen → mazdoor aali ujraten maangten hain → aali ujraten companies ki lagat barhati hain → companies qeematen barhati hain → waapis qadam 1 par." },
    },
    {
      question: { en: "Why is raising interest rates NOT always the right response to inflation?", ur: "شرح سود بڑھانا افراط زر کا ہمیشہ درست جواب کیوں نہیں ہے؟", rm: "Shar-e-sood barhana inflation ka hamesha durust jawaab kyun nahin hai?" },
      options: [
        { en: "Because higher rates always cause hyperinflation", ur: "کیونکہ اعلی شرحیں ہمیشہ ہائپر افراط زر کا باعث بنتی ہیں", rm: "Kyunke aali sharhein hamesha hyper inflation ka baais banti hain" },
        { en: "Because rate hikes reduce demand, but can't fix cost-push or imported inflation which are supply-side problems", ur: "کیونکہ شرح اضافے طلب کم کرتے ہیں، لیکن لاگت-دھکیل یا درآمدی افراط زر کو ٹھیک نہیں کر سکتے جو سپلائی-سائیڈ مسائل ہیں", rm: "Kyunke shar izaafey talab kam karte hain, lekin lagat-dhakail ya daraamdaati inflation ko theek nahin kar sakte jo supply-side masaail hain" },
        { en: "Because central banks don't control interest rates", ur: "کیونکہ مرکزی بینک شرح سود کنٹرول نہیں کرتے", rm: "Kyunke markazi bank shar-e-sood control nahin karte" },
        { en: "Because inflation always falls automatically without intervention", ur: "کیونکہ افراط زر ہمیشہ مداخلت کے بغیر خودبخود گرتا ہے", rm: "Kyunke inflation hamesha mudaakhalat ke baghair khud-ba-khud girta hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Interest rate hikes work by reducing demand (making borrowing more expensive, so businesses invest less and consumers spend less). This helps with demand-pull inflation. But cost-push inflation (from rising energy costs) or imported inflation (from currency depreciation) are supply-side problems — reducing demand doesn't fix expensive global oil or a weak currency. It just causes a recession without curing the inflation.", ur: "شرح سود اضافے طلب کم کرکے کام کرتے ہیں۔ یہ طلب-کشش افراط زر میں مدد کرتا ہے۔ لیکن لاگت-دھکیل افراط زر (بڑھتی توانائی لاگت سے) یا درآمدی افراط زر (کرنسی کمزوری سے) سپلائی-سائیڈ مسائل ہیں — طلب کم کرنا مہنگے عالمی تیل یا کمزور کرنسی کو ٹھیک نہیں کرتا۔ یہ صرف کساد بازاری کا باعث بنتا ہے۔", rm: "Shar-e-sood izaafey talab kam karke kaam karte hain. Yeh talab-kashish inflation mein madad karta hai. Lekin lagat-dhakail inflation (barhti tawanaayi lagat se) ya daraamdaati inflation (currency kamzori se) supply-side masaail hain — talab kam karna mahange aalami tel ya kamzor currency ko theek nahin karta. Yeh sirf kasaad-baazaari ka baais banta hai." },
    },
  ],
  faq: [
    {
      question: { en: "Can a country have high inflation and recession at the same time?", ur: "کیا کوئی ملک ایک ہی وقت میں اعلی افراط زر اور کساد بازاری رکھ سکتا ہے؟", rm: "Kya koi mulk ek hi waqt mein aali inflation aur kasaad-baazaari rakh sakta hai?" },
      answer: { en: "Yes — this is called stagflation (stagnation + inflation). It typically happens when cost-push inflation hits an economy that is already weak. The 1970s US stagflation is the textbook case (oil embargo). Pakistan experienced stagflation in 2022-24: inflation peaked at 38% while GDP growth slowed sharply and the economy contracted in some quarters. The tragedy of stagflation is that the usual cures conflict: to fight inflation you raise rates (slowing growth further); to fight recession you cut rates (worsening inflation). Structural reforms — fixing supply-side problems (energy sector, productivity) — are the real solution.", ur: "ہاں — اسے سٹیگ فلیشن کہتے ہیں (جمود + افراط زر)۔ یہ عام طور پر اس وقت ہوتا ہے جب لاگت-دھکیل افراط زر پہلے سے کمزور معیشت سے ٹکراتا ہے۔ پاکستان نے 2022-24 میں سٹیگ فلیشن کا تجربہ کیا۔ سٹیگ فلیشن کی سانحہ یہ ہے کہ عام علاج متصادم ہیں: افراط زر سے لڑنے کے لیے آپ شرحیں بڑھاتے ہیں؛ کساد بازاری سے لڑنے کے لیے آپ شرحیں کم کرتے ہیں۔", rm: "Haan — ise stagflation kehte hain (jamood + inflation). Yeh umuman us waqt hota hai jab lagat-dhakail inflation pehle se kamzor muaashat se takkarata hai. Pakistan ne 2022-24 mein stagflation ka tajruba kiya. Stagflation ki saanihaa yeh hai ke aam ilaaj mutassaadim hain: inflation se larne ke liye aap sharhein barhate hain; kasaad-baazaari se larne ke liye aap sharhein kam karte hain." },
    },
  ],
};
