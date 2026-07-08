import type { Lesson } from "@/lib/academy/types";

export const costPushLesson: Lesson = {
  slug: "cost-push",
  category: "inflation",
  title: { en: "Cost-Push Inflation: When Supply Costs Rise", ur: "لاگت-دھکیل افراط زر: جب سپلائی لاگت بڑھے", rm: "Lagat-Dhakail Inflation: Jab Supply Lagat Barhe" },
  subtitle: {
    en: "How rising energy prices, supply disruptions, and input costs push prices up across the economy",
    ur: "بڑھتی توانائی قیمتیں، سپلائی میں خلل، اور آدان لاگت معیشت میں قیمتیں کیسے اوپر دھکیلتی ہیں",
    rm: "Barhti tawanaayi qeematen, supply mein khalal, aur aadaan lagat muaashat mein qeematen kaise uupar dhakailti hain",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan"],
  relatedLessonSlugs: ["types-of-inflation", "demand-pull", "energy-inflation", "imported-inflation"],
  content: {
    overview: {
      en: "Cost-push inflation occurs when businesses face higher production costs — energy, raw materials, wages, import inputs — and pass these costs to consumers through higher prices. Unlike demand-pull (caused by too much spending), cost-push comes from the supply side: the same demand now faces more expensive production. This makes it harder to treat — raising interest rates reduces demand but doesn't make energy cheaper. Pakistan's energy sector deregulation (2022-23) is the defining cost-push inflation case in recent Pakistani economic history.",
      ur: "لاگت-دھکیل افراط زر اس وقت ہوتا ہے جب کاروباروں کو اعلی پیداواری لاگت — توانائی، خام مال، اجرتیں، درآمد آدانات — کا سامنا ہو اور وہ اعلی قیمتوں کے ذریعے یہ لاگتیں صارفین کو منتقل کریں۔ طلب-کشش کے برعکس (بہت زیادہ خرچ کی وجہ سے)، لاگت-دھکیل سپلائی سائیڈ سے آتا ہے۔ پاکستان کی توانائی شعبے کی ضابطہ بندی (2022-23) حالیہ پاکستانی معاشی تاریخ میں لاگت-دھکیل افراط زر کا حتمی کیس ہے۔",
      rm: "Lagat-dhakail inflation us waqt hota hai jab kaarobaaron ko aali paidawaari lagat — tawanaayi, khaam maal, ujraten, daraamd aadaan — ka saamna ho aur woh aali qeematon ke zariye yeh lagaten saraafeen ko muntaqil karen. Talab-kashish ke baraks (bahut zyada kharch ki wajah se), lagat-dhakail supply side se aata hai. Pakistan ki tawanaayi shube ki zaabita-bandi (2022-23) haaliya Pakistani muaashi taareekh mein lagat-dhakail inflation ka hatami case hai.",
    },
    whyItMatters: {
      en: "Cost-push inflation is stagflationary — it raises prices while simultaneously contracting output (firms produce less when costs are higher). Pakistan's circular debt crisis meant the power sector was chronically loss-making, forcing eventual tariff hikes of 100%+. This single policy change (removing electricity subsidies) pushed energy costs for industries, agriculture, and households to unsustainable levels — raising production costs throughout the economy. Understanding cost-push explains why the SBP's rate hikes alone couldn't fix 2022-23 inflation.",
      ur: "لاگت-دھکیل افراط زر سٹیگ فلیشنری ہے — یہ قیمتیں بڑھاتا ہے جبکہ بیک وقت پیداوار سکڑتی ہے (کمپنیاں جب لاگت زیادہ ہو کم پیدا کرتی ہیں)۔ پاکستان کے گردشی قرضے کے بحران کا مطلب تھا کہ بجلی کا شعبہ دائمی طور پر خسارے میں تھا، جس نے ٹیرف اضافے کو مجبور کیا۔ اس واحد پالیسی تبدیلی نے پوری معیشت میں پیداواری لاگت بڑھائی۔",
      rm: "Lagat-dhakail inflation stagflationary hai — yeh qeematen barhata hai jabke bayak waqt paidawar sikarti hai. Pakistan ke gardishi qarzay ke bohran ka matlab tha ke bijli ka shuba daemi tor par khasaare mein tha, jis ne tariff izaafe ko majboor kiya. Is waahid policy tabdeeli ne poori muaashat mein paidawaari lagat barhaai.",
    },
    explanation: {
      en: `**Common causes of cost-push inflation:**

**1. Energy price shocks:** Oil, gas, and electricity price increases raise costs for every business that uses energy — factories, farmers, retailers, transporters. Energy is an input to almost everything, so energy price spikes cascade through the economy.

**2. Raw material price spikes:** Global commodity price surges (wheat, cotton, iron ore, semiconductors) raise input costs for manufacturers.

**3. Currency depreciation:** When PKR weakens, imported inputs (machinery spare parts, chemicals, petroleum, fertiliser) cost more in rupees — cost-push from the exchange rate. (Note: this overlaps with imported inflation.)

**4. Supply chain disruptions:** COVID disrupted global shipping; factory closures created input shortages. Even with stable demand, reduced supply drives up costs for remaining producers.

**5. Wage increases beyond productivity:** When wages rise faster than worker productivity, unit labour costs rise — a cost-push factor.

**Why cost-push is harder to treat:**
- Demand-pull inflation: reduce demand via rate hikes → works
- Cost-push inflation: reduce demand via rate hikes → demand falls AND output falls further (stagflation risk). The underlying supply cost is unchanged.
- Better treatment: Address the supply-side cause directly (invest in domestic energy, improve supply chains, increase agricultural productivity).

**Pakistan's energy cost cascade:** Electricity tariff × 2 → textile mills face 40% higher production costs → textile prices rise → Pakistan's textile exports become less competitive globally → lost orders → further output contraction while prices rose.`,
      ur: `**لاگت-دھکیل افراط زر کی عام وجوہات:**

**1. توانائی قیمت جھٹکے:** تیل، گیس اور بجلی کی قیمتوں میں اضافہ ہر اس کاروبار کی لاگت بڑھاتا ہے جو توانائی استعمال کرتا ہے۔

**2. خام مال قیمت اضافہ:** عالمی اجناس قیمت ابھار مینوفیکچررز کے لیے آدان لاگت بڑھاتا ہے۔

**3. کرنسی کی کمزوری:** جب PKR کمزور ہوتا ہے، درآمدی آدانات روپوں میں زیادہ قیمت پڑتے ہیں۔

**4. سپلائی چین میں خلل:** COVID نے عالمی ترسیل میں خلل ڈالا؛ فیکٹری بندش نے آدان کی قلت پیدا کی۔

**5. پیداواریت سے آگے اجرت اضافہ:** جب اجرتیں مزدور پیداواریت سے تیز بڑھتی ہیں، اکائی محنت لاگت بڑھتی ہے۔

**لاگت-دھکیل کا علاج کرنا کیوں مشکل ہے:**
- شرح اضافے طلب گراتے ہیں اور پیداوار بھی — سٹیگ فلیشن خطرہ۔ بنیادی سپلائی لاگت تبدیل نہیں ہوتی۔`,
      rm: `**Lagat-dhakail inflation ki aam wajoohaatein:**

**1. Tawanaayi qeemat jhatke:** Tel, gas aur bijli ki qeematon mein izaafa har us kaarobaar ki lagat barhata hai jo tawanaayi istemal karta hai.

**2. Khaam maal qeemat izaafa:** Aalami ajnaas qeemat ubhaar manufacturers ke liye aadaan lagat barhata hai.

**3. Currency ki kamzori:** Jab PKR kamzor hota hai, daraamdaati aadaan rupon mein zyada qeemat parte hain.

**4. Supply chain mein khalal:** COVID ne aalami tarseel mein khalal daala; factory bandi ne aadaan ki qillat paida ki.

**5. Paidaawariyat se aage ujrat izaafa:** Jab ujraten mazdoor paidaawariyat se tez barhti hain, ikaai mehnat lagat barhti hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Cost-push inflation is always transitory.** If energy prices stay high (chronic oil imports, permanent electricity deregulation), cost-push becomes persistent. Pakistan's energy sector restructuring meant sustained higher energy costs — not a temporary shock.

**Myth 2: Raising interest rates is always the answer.** Rate hikes hurt the demand side. For cost-push, they can cause a recession without fixing the supply problem. The SBP acknowledged this — rates were raised primarily to signal commitment to stabilisation and reduce the PKR depreciation (imported cost-push), not primarily to address energy deregulation.

**Myth 3: Firms can always absorb cost increases.** Profit margins allow some absorption, but sustained cost-push inflation eventually passes through entirely to consumer prices, especially for SMEs with thin margins.`,
      ur: `**غلط فہمی 1: لاگت-دھکیل افراط زر ہمیشہ عارضی ہے۔** اگر توانائی کی قیمتیں اعلی رہیں، لاگت-دھکیل مستقل ہو جاتی ہے۔ پاکستان کی توانائی شعبے کی تشکیل نو کا مطلب پائیدار اعلی توانائی لاگت تھا۔

**غلط فہمی 2: شرح سود بڑھانا ہمیشہ جواب ہے۔** شرح اضافے طلب سائیڈ کو نقصان دیتے ہیں۔ لاگت-دھکیل کے لیے، وہ سپلائی مسئلہ ٹھیک کیے بغیر کساد بازاری پیدا کر سکتے ہیں۔

**غلط فہمی 3: کمپنیاں ہمیشہ لاگت اضافے جذب کر سکتی ہیں۔** پائیدار لاگت-دھکیل افراط زر بالآخر مکمل طور پر صارف قیمتوں تک گزر جاتی ہے۔`,
      rm: `**Ghalat fehmi 1: Lagat-dhakail inflation hamesha aarazi hai.** Agar tawanaayi ki qeematen aali rahen, lagat-dhakail mustaqil ho jaati hai. Pakistan ki tawanaayi shube ki tashkeel-e-naw ka matlab paayidaar aali tawanaayi lagat tha.

**Ghalat fehmi 2: Shar-e-sood barhana hamesha jawaab hai.** Shar izaafey talab side ko nuqsaan dete hain. Lagat-dhakail ke liye, woh supply masla theek kiye baghair kasaad-baazaari paida kar sakte hain.

**Ghalat fehmi 3: Companies hamesha lagat izaafe jazb kar sakti hain.** Paayidaar lagat-dhakail inflation bil-aakhir mukammal tor par saraaf qeematon tak guzar jaati hai.`,
    },
    pakistanExample: {
      en: `**Pakistan's energy deregulation (2022-24):** Under IMF pressure, Pakistan removed electricity and gas subsidies that had accumulated as "circular debt" — Rs2.5 trillion in losses the government had been absorbing. Electricity tariffs went from Rs16-18/unit to Rs35-45/unit (a 150%+ increase). For a textile mill using 1 million kWh/month, this was an extra Rs19-27 million monthly — directly added to production costs. Firms raised product prices to survive. The agricultural sector faced similar fertiliser price increases (urea from Rs1,400 to Rs3,500/bag). The result: food prices rose 40%+ driven by agricultural cost-push inflation.`,
      ur: `**پاکستان کی توانائی ضابطہ بندی (2022-24):** IMF کے دباؤ کے تحت، پاکستان نے بجلی اور گیس سبسڈیاں ہٹائیں جو "گردشی قرضے" کے طور پر جمع ہو چکی تھیں۔ بجلی کے ٹیرف Rs16-18/یونٹ سے Rs35-45/یونٹ ہو گئے (150٪+ اضافہ)۔ ایک ٹیکسٹائل مل کے لیے 1 ملین kWh/ماہ استعمال کرنے پر، یہ ماہانہ اضافی Rs19-27 ملین تھا — براہ راست پیداواری لاگت میں شامل۔ کمپنیوں نے زندہ رہنے کے لیے مصنوعات کی قیمتیں بڑھائیں۔`,
      rm: `**Pakistan ki tawanaayi zaabita-bandi (2022-24):** IMF ke dabaao ke tehet, Pakistan ne bijli aur gas subsidiyaan hataaeen jo "gardishi qarzay" ke tor par jamaa ho chuki thin. Bijli ke tariff Rs16-18/unit se Rs35-45/unit ho gaye (150%+ izaafa). Ek textile mill ke liye 1 million kWh/maah istemal karne par, yeh maahana izaafi Rs19-27 million tha — baraah-e-raast paidawaari lagat mein shaamil. Companies ne zinda rehne ke liye masnoowaat ki qeematen barhaain.`,
    },
    realWorld: {
      en: "The 1973 OPEC oil embargo created the defining cost-push inflation episode globally. Arab members of OPEC cut off oil supplies to countries supporting Israel in the Yom Kippur War. Oil prices quadrupled in months. Since oil is an input to virtually everything — transport, manufacturing, heating — costs rose across all sectors simultaneously. This caused stagflation across Western economies (US CPI hit 12% with falling GDP). It demonstrated that cost-push inflation has no easy monetary policy fix — the supply shock must resolve or be addressed structurally.",
      ur: "1973 کی OPEC تیل پابندی نے عالمی سطح پر لاگت-دھکیل افراط زر کی حتمی قسط پیدا کی۔ تیل کی قیمتیں مہینوں میں چوگنی ہو گئیں۔ چونکہ تیل تقریباً ہر چیز کا آدان ہے، لاگت بیک وقت تمام شعبوں میں بڑھ گئی۔ اس نے مغربی معیشتوں میں سٹیگ فلیشن پیدا کیا — گرتی GDP کے ساتھ امریکی CPI 12٪ تک پہنچا۔",
      rm: "1973 ki OPEC tel paabandi ne aalami satah par lagat-dhakail inflation ki hatami qist paida ki. Tel ki qeematen maheenoN mein chaoguni ho gain. Chunke tel taqreeban har cheez ka aadaan hai, lagat bayak waqt tamam shubon mein barh gayi. Is ne maghribi muaashaton mein stagflation paida kiya — girti GDP ke saath Amreeki CPI 12% tak pohuncha.",
    },
    summary: {
      en: "• Cost-push: rising production costs → firms raise prices → inflation (without demand increasing)\n• Main causes: energy price shocks, raw material spikes, currency depreciation, supply disruptions\n• Stagflationary: causes prices to rise AND output to fall simultaneously\n• Hard to treat with interest rates alone — rate hikes worsen the output contraction\n• Best fix: address supply-side cause (domestic energy production, supply chain repair)\n• Pakistan's case: electricity tariff hike 150%+ in 2022-23 = textbook cost-push",
      ur: "• لاگت-دھکیل: بڑھتی پیداواری لاگت → کمپنیاں قیمتیں بڑھاتی ہیں → افراط زر (طلب بڑھے بغیر)\n• اہم وجوہات: توانائی قیمت جھٹکے، خام مال اضافہ، کرنسی کمزوری، سپلائی میں خلل\n• سٹیگ فلیشنری: بیک وقت قیمتیں بڑھاتا اور پیداوار گراتا ہے\n• صرف شرح سود سے علاج مشکل — شرح اضافے پیداوار سکڑنے کو بدتر بناتے ہیں\n• بہترین علاج: سپلائی سائیڈ کی وجہ دور کریں\n• پاکستان کا کیس: 2022-23 میں بجلی ٹیرف 150٪+ اضافہ = نصابی کتاب لاگت-دھکیل",
      rm: "• Lagat-dhakail: barhti paidawaari lagat → companies qeematen barhati hain → inflation (talab barhe baghair)\n• Ahem wajoohaatein: tawanaayi qeemat jhatke, khaam maal izaafa, currency kamzori, supply mein khalal\n• Stagflationary: bayak waqt qeematen barhata aur paidawar girata hai\n• Sirf shar-e-sood se ilaaj mushkil — shar izaafey paidawar sikaRne ko badtar banate hain\n• Behtareen ilaaj: supply side ki wajah door karein\n• Pakistan ka case: 2022-23 mein bijli tariff 150%+ izaafa = nisaabi kitaab lagat-dhakail",
    },
  },
  quiz: [
    {
      question: { en: "Pakistan's electricity tariffs doubled in 2022-23. What type of inflation did this primarily cause?", ur: "پاکستان کے بجلی ٹیرف 2022-23 میں دوگنے ہو گئے۔ اس نے بنیادی طور پر کس قسم کا افراط زر پیدا کیا؟", rm: "Pakistan ke bijli tariff 2022-23 mein dugne ho gaye. Is ne bunyaadi tor par kis qism ka inflation paida kiya?" },
      options: [
        { en: "Demand-pull — people demanded more electricity", ur: "طلب-کشش — لوگوں نے زیادہ بجلی مانگی", rm: "Talab-kashish — logon ne zyada bijli maangi" },
        { en: "Cost-push — higher energy costs raised production costs for all industries", ur: "لاگت-دھکیل — اعلی توانائی لاگت نے تمام صنعتوں کے لیے پیداواری لاگت بڑھائی", rm: "Lagat-dhakail — aali tawanaayi lagat ne tamam sanaaton ke liye paidawaari lagat barhaai" },
        { en: "Built-in — workers demanded wage hikes because of electricity bills", ur: "اندرونی — مزدوروں نے بجلی کے بلوں کی وجہ سے اجرت اضافے مانگے", rm: "Androoni — mazduron ne bijli ke bilon ki wajah se ujrat izaafey maange" },
        { en: "Imported inflation only", ur: "صرف درآمدی افراط زر", rm: "Sirf daraamdaati inflation" },
      ],
      correctIndex: 1,
      explanation: { en: "Higher electricity tariffs directly raised the cost of running every factory, farm, shop, and household in Pakistan. Industries passed these higher costs to consumers in product prices. This is cost-push: supply-side cost increases driving up prices without any increase in consumer demand.", ur: "اعلی بجلی ٹیرف نے براہ راست پاکستان میں ہر فیکٹری، فارم، دکان اور گھرانے چلانے کی لاگت بڑھائی۔ صنعتوں نے یہ اعلی لاگتیں مصنوعات کی قیمتوں میں صارفین کو منتقل کیں۔ یہ لاگت-دھکیل ہے: سپلائی-سائیڈ لاگت اضافے بغیر صارف طلب میں اضافے کے قیمتیں بڑھاتے ہیں۔", rm: "Aali bijli tariff ne baraah-e-raast Pakistan mein har factory, farm, dukaan aur ghraane chalane ki lagat barhaai. Sanaaton ne yeh aali lagaten masnoowaat ki qeematon mein saraafeen ko muntaqil kin. Yeh lagat-dhakail hai: supply-side lagat izaafey baghair saraaf talab mein izaafe ke qeematen barhate hain." },
    },
    {
      question: { en: "Why does cost-push inflation create a risk of stagflation?", ur: "لاگت-دھکیل افراط زر سٹیگ فلیشن کا خطرہ کیوں پیدا کرتا ہے؟", rm: "Lagat-dhakail inflation stagflation ka khatara kyun paida karta hai?" },
      options: [
        { en: "Because it always leads to hyperinflation", ur: "کیونکہ یہ ہمیشہ ہائپر افراط زر کا باعث بنتا ہے", rm: "Kyunke yeh hamesha hyper inflation ka baais banta hai" },
        { en: "Higher production costs → firms produce less (or close) AND raise prices → both recession and inflation occur simultaneously", ur: "اعلی پیداواری لاگت → کمپنیاں کم پیدا کرتی ہیں (یا بند ہوتی ہیں) اور قیمتیں بڑھاتی ہیں → بیک وقت کساد بازاری اور افراط زر دونوں ہوتے ہیں", rm: "Aali paidawaari lagat → companies kam paida karti hain (ya band hoti hain) aur qeematen barhati hain → bayak waqt kasaad-baazaari aur inflation dono hote hain" },
        { en: "Because the government always raises taxes during cost-push inflation", ur: "کیونکہ حکومت ہمیشہ لاگت-دھکیل افراط زر کے دوران ٹیکس بڑھاتی ہے", rm: "Kyunke hukoomat hamesha lagat-dhakail inflation ke dauran tax barhati hai" },
        { en: "Cost-push inflation actually prevents recessions", ur: "لاگت-دھکیل افراط زر دراصل کساد بازاری سے بچاتا ہے", rm: "Lagat-dhakail inflation darasal kasaad-baazaari se bachata hai" },
      ],
      correctIndex: 1,
      explanation: { en: "When input costs rise sharply, firms face a dilemma: raise prices (reducing sales volume) or reduce production (cutting costs). Both options lead to less output — economic contraction. Meanwhile, higher costs mean higher prices. Result: recession (falling output) + inflation (rising prices) simultaneously = stagflation. Pakistan's 2022-23 experience: GDP growth near zero while inflation hit 38%.", ur: "جب آدان لاگت تیزی سے بڑھتی ہے، کمپنیاں ایک مخمصے کا سامنا کرتی ہیں: قیمتیں بڑھائیں (فروخت حجم کم ہو) یا پیداوار کم کریں (لاگت کم کریں)۔ دونوں اختیارات کم پیداوار کا باعث بنتے ہیں — معاشی سکڑاو۔ اس دوران، اعلی لاگت کا مطلب اعلی قیمتیں ہیں۔ نتیجہ: کساد بازاری + افراط زر بیک وقت = سٹیگ فلیشن۔", rm: "Jab aadaan lagat tezi se barhti hai, companies ek mukhame ka saamna karti hain: qeematen barhaaein (farokht hajam kam ho) ya paidawar kam karen (lagat kam karen). Dono ikhtiyaaraat kam paidawar ka baais bante hain — muaashi sikaRao. Is dauraan, aali lagat ka matlab aali qeematen hain. Nateeja: kasaad-baazaari + inflation bayak waqt = stagflation." },
    },
    {
      question: { en: "If the main cause of Pakistan's inflation is rising energy costs (cost-push), what is the most effective long-term solution?", ur: "اگر پاکستان کے افراط زر کی اہم وجہ بڑھتی توانائی لاگت ہے (لاگت-دھکیل)، تو طویل مدتی سب سے مؤثر حل کیا ہے؟", rm: "Agar Pakistan ke inflation ki ahem wajah barhti tawanaayi lagat hai (lagat-dhakail), to taweel muddat ka sab se moassir hal kya hai?" },
      options: [
        { en: "Raise interest rates to 30%", ur: "شرح سود 30٪ تک بڑھائیں", rm: "Shar-e-sood 30% tak barhaaein" },
        { en: "Print more money to subsidise energy", ur: "توانائی کو سبسڈی دینے کے لیے مزید پیسہ چھاپیں", rm: "Tawanaayi ko subsidy dene ke liye mazeed paisa chhaapein" },
        { en: "Invest in domestic energy production (renewables, gas development) to reduce energy import dependence and costs", ur: "توانائی درآمد انحصار اور لاگت کم کرنے کے لیے ملکی توانائی پیداوار (قابل تجدید توانائی، گیس ترقی) میں سرمایہ کاری", rm: "Tawanaayi daraamd inhisaar aur lagat kam karne ke liye mulki tawanaayi paidawar (qaabil-e-tajdeed tawanaayi, gas taraqqi) mein sarmaaya kaari" },
        { en: "Import all goods from abroad to avoid domestic production costs", ur: "ملکی پیداواری لاگت سے بچنے کے لیے تمام اشیاء بیرون ملک سے درآمد کریں", rm: "Mulki paidawaari lagat se bachne ke liye tamam ashaaya bairun-e-mulk se daraamd karein" },
      ],
      correctIndex: 2,
      explanation: { en: "Cost-push inflation from energy requires structural supply-side solutions: domestic energy production reduces dependence on expensive imports; renewable energy (solar, wind) has near-zero marginal cost once installed. Pakistan's long-term solution is the Thar coal/CPEC power projects, LNG terminal capacity, and solar expansion — not just monetary tightening which only worsens economic contraction.", ur: "توانائی سے لاگت-دھکیل افراط زر کو ساختی سپلائی سائیڈ حلوں کی ضرورت ہے: ملکی توانائی پیداوار مہنگی درآمدات پر انحصار کم کرتی ہے؛ قابل تجدید توانائی (سورج، ہوا) ایک بار نصب ہونے پر تقریباً صفر مارجنل لاگت ہے۔ پاکستان کا طویل مدتی حل تھر کوئلہ/CPEC پاور منصوبے، LNG ٹرمینل صلاحیت، اور شمسی توانائی توسیع ہے۔", rm: "Tawanaayi se lagat-dhakail inflation ko saakhti supply side halon ki zaroorat hai: mulki tawanaayi paidawar mahange daraamdaat par inhisaar kam karti hai; qaabil-e-tajdeed tawanaayi (sooraj, hawa) ek baar nasb hone par taqreeban sifar marjinal lagat hai. Pakistan ka taweel muddat hal Thar koyla/CPEC power mansooby, LNG terminal salaaḥiyat, aur shamsi tawanaayi tausee hai." },
    },
    {
      question: { en: "Cost-push inflation differs from demand-pull inflation in which key way?", ur: "لاگت-دھکیل افراط زر طلب-کشش افراط زر سے کس اہم طریقے سے مختلف ہے؟", rm: "Lagat-dhakail inflation talab-kashish inflation se kis ahem tareeqe se mukhtalif hai?" },
      options: [
        { en: "Cost-push is always caused by the government; demand-pull by the private sector", ur: "لاگت-دھکیل ہمیشہ حکومت کی وجہ سے ہوتا ہے؛ طلب-کشش نجی شعبے کی وجہ سے", rm: "Lagat-dhakail hamesha hukoomat ki wajah se hota hai; talab-kashish niji shube ki wajah se" },
        { en: "Cost-push originates from supply-side rising costs; demand-pull from excess spending and demand", ur: "لاگت-دھکیل سپلائی سائیڈ سے بڑھتی لاگت سے شروع ہوتا ہے؛ طلب-کشش زائد خرچ اور طلب سے", rm: "Lagat-dhakail supply side se barhti lagat se shuroo hota hai; talab-kashish zaaid kharch aur talab se" },
        { en: "Demand-pull always leads to hyperinflation; cost-push never does", ur: "طلب-کشش ہمیشہ ہائپر افراط زر کا باعث بنتا ہے؛ لاگت-دھکیل کبھی نہیں", rm: "Talab-kashish hamesha hyper inflation ka baais banta hai; lagat-dhakail kabhi nahin" },
        { en: "They are identical and have the same treatment", ur: "وہ ایک جیسے ہیں اور ایک جیسا علاج رکھتے ہیں", rm: "Woh ek jaise hain aur ek jaisa ilaaj rakhte hain" },
      ],
      correctIndex: 1,
      explanation: { en: "Demand-pull: too much money chasing too few goods — originates from excess demand. Cost-push: production inputs become more expensive — originates from supply side. This distinction matters for policy: demand reduction (rate hikes) works for demand-pull but can cause stagflation if applied to cost-push inflation.", ur: "طلب-کشش: بہت کم اشیاء کے پیچھے بہت زیادہ پیسہ — زائد طلب سے شروع ہوتا ہے۔ لاگت-دھکیل: پیداواری آدانات زیادہ مہنگے ہو جاتے ہیں — سپلائی سائیڈ سے شروع ہوتا ہے۔ یہ فرق پالیسی کے لیے اہم ہے: طلب کمی (شرح اضافے) طلب-کشش کے لیے کام کرتی ہے لیکن لاگت-دھکیل افراط زر پر لاگو ہونے پر سٹیگ فلیشن پیدا کر سکتی ہے۔", rm: "Talab-kashish: bahut kam ashaaya ke peechhe bahut zyada paisa — zaaid talab se shuroo hota hai. Lagat-dhakail: paidawaari aadaan zyada mahange ho jaate hain — supply side se shuroo hota hai. Yeh faraq policy ke liye ahem hai: talab kami (shar izaafey) talab-kashish ke liye kaam karti hai lekin lagat-dhakail inflation par laagoo hone par stagflation paida kar sakti hai." },
    },
  ],
  faq: [
    {
      question: { en: "Is Pakistan's circular debt problem linked to cost-push inflation?", ur: "کیا پاکستان کا گردشی قرضے کا مسئلہ لاگت-دھکیل افراط زر سے جڑا ہے؟", rm: "Kya Pakistan ka gardishi qarzay ka masla lagat-dhakail inflation se jura hai?" },
      answer: { en: "Yes, directly. Pakistan's circular debt arose because the government kept electricity prices below cost-recovery levels for years — to keep inflation low (ironically). Electricity distributors (DISCOs) couldn't collect enough to pay power producers, power producers couldn't pay fuel suppliers, fuel suppliers stopped delivering — creating a chain of defaults (the 'circular' in circular debt). When the IMF forced Pakistan to unwind these subsidies and raise tariffs to cost-recovery levels, it triggered the cost-push inflation wave of 2022-24. The choice was: accept cost-push inflation now, or allow the power sector to collapse entirely later.", ur: "ہاں، براہ راست۔ پاکستان کا گردشی قرضہ اس وجہ سے پیدا ہوا کیونکہ حکومت نے سالوں تک بجلی کی قیمتیں لاگت بازیابی کی سطح سے نیچے رکھیں۔ جب IMF نے پاکستان کو یہ سبسڈیاں واپس لینے اور ٹیرف بڑھانے پر مجبور کیا، تو اس نے 2022-24 کی لاگت-دھکیل افراط زر لہر کو متحرک کیا۔", rm: "Haan, baraah-e-raast. Pakistan ka gardishi qarzay is wajah se paida hua kyunke hukoomat ne salon tak bijli ki qeematen lagat-baaziyaabi ki satah se neeche rakhin. Jab IMF ne Pakistan ko yeh subsidiyaan waapis lene aur tariff barhane par majboor kiya, to is ne 2022-24 ki lagat-dhakail inflation leher ko muhharrik kiya." },
    },
  ],
};
