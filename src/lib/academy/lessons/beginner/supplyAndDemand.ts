import type { Lesson } from "@/lib/academy/types";

export const supplyAndDemandLesson: Lesson = {
  slug: "supply-and-demand",
  category: "beginner",
  title: { en: "Supply and Demand", ur: "طلب اور رسد", rm: "Talab aur Rasad" },
  subtitle: {
    en: "The most fundamental force in every market — why prices rise, fall, and change",
    ur: "ہر بازار میں سب سے بنیادی قوت — قیمتیں کیوں بڑھتی، گرتی اور بدلتی ہیں",
    rm: "Har baazaar mein sab se bunyaadi quwwat — qeematen kyun barhti, girti aur badlti hain",
  },
  level: "beginner",
  readMinutes: 8,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-inflation-pakistan", "weekly-inflation-pakistan"],
  relatedLessonSlugs: ["inflation", "market-types", "price-signals"],
  content: {
    overview: {
      en: "Supply and demand is the engine of every market. Demand is how much of something buyers want; supply is how much sellers offer. When demand rises or supply falls, prices go up — and vice versa. Understanding this explains almost everything about why prices change.",
      ur: "طلب اور رسد ہر بازار کا انجن ہے۔ طلب یہ ہے کہ خریدار کتنا چاہتے ہیں؛ رسد یہ ہے کہ بیچنے والے کتنا پیش کرتے ہیں۔ جب طلب بڑھتی ہے یا رسد کم ہوتی ہے، قیمتیں بڑھتی ہیں — اور اس کے برعکس۔",
      rm: "Talab aur rasad har baazaar ka engine hai. Talab yeh hai ke khareedar kitna chahte hain; rasad yeh hai ke bechne wale kitna pesh karte hain. Jab talab barhti hai ya rasad kam hoti hai, qeematen barhti hain — aur is ke baraks.",
    },
    whyItMatters: {
      en: "Every price you see — petrol, onions, mobile data — is set by supply and demand. When floods destroy onion crops, supply falls and onion prices spike. When a new mobile company enters Pakistan, supply of data rises and prices drop. This mechanism allocates scarce resources across society without any central authority deciding who gets what.",
      ur: "آپ جو ہر قیمت دیکھتے ہیں — پیٹرول، پیاز، موبائل ڈیٹا — طلب اور رسد سے طے ہوتی ہے۔ جب سیلاب پیاز کی فصل تباہ کرتا ہے، رسد کم ہوتی ہے اور پیاز کی قیمتیں اچھلتی ہیں۔",
      rm: "Aap jo har qeemat dekhte hain — petrol, pyaaz, mobile data — talab aur rasad se tay hoti hai. Jab sailaab pyaaz ki fasal tabah karta hai, rasad kam hoti hai aur pyaaz ki qeematen uchhalti hain.",
    },
    explanation: {
      en: `**The Law of Demand:** When the price of something rises, people buy less of it — they switch to cheaper alternatives or simply go without. When prices fall, they buy more. This is why petrol demand falls when prices spike: people carpool, use public transport, or travel less.

**The Law of Supply:** When the price of something rises, sellers produce more of it — higher profit motivates them. When prices fall, they produce less. This is why Pakistan's cotton farmers plant more cotton when cotton prices are high globally.

**Equilibrium:** The price where the amount buyers want to buy exactly equals the amount sellers want to sell is called the equilibrium price. Markets tend to move toward this balance. If there's a surplus (too much supply), sellers cut prices to clear stock. If there's a shortage (too little supply), buyers compete and prices rise until the market clears.`,
      ur: `**طلب کا اصول:** جب کسی چیز کی قیمت بڑھتی ہے، لوگ اسے کم خریدتے ہیں۔ جب قیمتیں گرتی ہیں، وہ زیادہ خریدتے ہیں۔

**رسد کا اصول:** جب کسی چیز کی قیمت بڑھتی ہے، فروخت کنندگان زیادہ پیدا کرتے ہیں — زیادہ منافع انہیں ترغیب دیتا ہے۔

**توازن:** وہ قیمت جہاں خریداروں کی خواہش اور فروخت کنندگان کی پیشکش برابر ہو توازن قیمت کہلاتی ہے۔`,
      rm: `**Talab ka usool:** Jab kisi cheez ki qeemat barhti hai, log use kam khareedtey hain. Jab qeematen girti hain, woh zyada khareedtey hain.

**Rasad ka usool:** Jab kisi cheez ki qeemat barhti hai, farokht kunandagaan zyada paida karte hain — zyada munaafa unhen targheeb deta hai.

**Tawazun:** Woh qeemat jahan khareedaroon ki khwahish aur farokht kunandagaan ki peshkash barabar ho tawazun qeemat kehlaati hai.`,
    },
    misconceptions: {
      en: `**Myth 1: Higher prices are always bad.** Rising prices signal scarcity and motivate more production — eventually restoring supply. Without price signals, no one knows where resources are most needed.

**Myth 2: If demand rises, supply always matches instantly.** Supply takes time to respond (farmers can't plant and harvest overnight). Short-run price spikes during shortages are normal.

**Myth 3: Government price caps solve shortages.** Setting a maximum price below equilibrium kills the profit motive for producers, reducing supply further and worsening the shortage. Pakistan's flour price controls have repeatedly caused hoarding.`,
      ur: `**غلط فہمی 1: زیادہ قیمتیں ہمیشہ بری ہیں۔** بڑھتی قیمتیں قلت کا اشارہ دیتی ہیں اور زیادہ پیداوار کی ترغیب دیتی ہیں۔

**غلط فہمی 2: اگر طلب بڑھے، رسد فوری مماثل ہوتی ہے۔** رسد کو جواب دینے میں وقت لگتا ہے۔

**غلط فہمی 3: حکومتی قیمت حد کمی حل کرتی ہے۔** زیادہ سے زیادہ قیمت مقرر کرنا پیداوار کا منافع ختم کرتا ہے، رسد کم کرتا ہے اور کمی کو بدتر بناتا ہے۔`,
      rm: `**Ghalat fehmi 1: Zyada qeematen hamesha buri hain.** Barhti qeematen qillat ka ishara deti hain aur zyada paidawar ki targheeb deti hain.

**Ghalat fehmi 2: Agar talab barhe, rasad fori mumaasil hoti hai.** Rasad ko jawaab dene mein waqt lagta hai.

**Ghalat fehmi 3: Hukoomati qeemat hadd kami hal karti hai.** Zyada se zyada qeemat muqarrar karna paidawar ka munaafa khatam karta hai.`,
    },
    pakistanExample: {
      en: `**Onion crisis 2019:** After heavy rains damaged Sindh's onion crop, supply collapsed. With demand unchanged, onion prices shot from Rs 40/kg to over Rs 300/kg within weeks — a textbook supply shock. The government eventually imported onions from Iran and India, restoring supply and crashing prices.

**Petrol pricing:** When global crude oil prices rise, Pakistan's imported petrol cost rises, reducing supply at the old price. OGRA adjusts retail prices upward to reflect this — demand then softens as people drive less.`,
      ur: `**پیاز بحران 2019:** سیلاب کے بعد سندھ کی پیاز کی فصل تباہ ہوئی، رسد گر گئی۔ طلب وہی رہی، پیاز کی قیمت 40 روپے/کلو سے 300 روپے سے تجاوز کر گئی۔ حکومت نے ایران اور ہندوستان سے پیاز درآمد کیا، رسد بحال ہوئی اور قیمتیں گریں۔`,
      rm: `**Pyaaz bohran 2019:** Sailaab ke baad Sindh ki pyaaz ki fasal tabah hui, rasad gir gayi. Talab wahi rahi, pyaaz ki qeemat 40 rupay/kilo se 300 rupay se tajaaoz kar gayi. Hukoomat ne Iran aur Hindustan se pyaaz daraamd kiya, rasad baahal hui aur qeematen gireen.`,
    },
    realWorld: {
      en: "In 2021, a global chip shortage hit the auto industry. Car manufacturers couldn't get semiconductors (supply shock) but demand for cars remained high. New car prices spiked by 20–30% in many markets. This shows supply-demand at work across global supply chains — not just local markets.",
      ur: "2021 میں، عالمی چپ کی کمی نے آٹو صنعت کو متاثر کیا۔ کار بنانے والے سیمی کنڈکٹر نہیں حاصل کر سکے لیکن کاروں کی طلب زیادہ رہی۔ نئی کاروں کی قیمتیں بہت سی منڈیوں میں 20–30٪ بڑھ گئیں۔",
      rm: "2021 mein, aalami chip ki kami ne auto industry ko mutaassir kiya. Kar banane wale semiconductor nahi haasil kar sake lekin karon ki talab zyada rahi. Nayi karon ki qeematen bahut si mandiyon mein 20–30% barh gayin.",
    },
    summary: {
      en: "• Demand: buyers want more at lower prices, less at higher prices\n• Supply: sellers offer more at higher prices, less at lower prices\n• Equilibrium: where supply meets demand determines the price\n• Shortage → prices rise → more supply, less demand → balance restored\n• Surplus → prices fall → less supply, more demand → balance restored\n• Price controls (like flour subsidies) can backfire by reducing supply",
      ur: "• طلب: کم قیمت پر زیادہ خریداری، زیادہ قیمت پر کم\n• رسد: زیادہ قیمت پر زیادہ فروخت، کم قیمت پر کم\n• توازن: جہاں طلب اور رسد ملیں وہ قیمت طے ہوتی ہے\n• قلت → قیمت بڑھے → زیادہ رسد، کم طلب → توازن\n• قیمت پٹی (جیسے آٹے کی سبسڈی) رسد کم کر سکتی ہے",
      rm: "• Talab: kam qeemat par zyada kharidaari, zyada qeemat par kam\n• Rasad: zyada qeemat par zyada farokht, kam qeemat par kam\n• Tawazun: jahan talab aur rasad milein woh qeemat tay hoti hai\n• Qillat → qeemat barhe → zyada rasad, kam talab → tawazun\n• Qeemat patti (jaise aate ki subsidy) rasad kam kar sakti hai",
    },
  },
  quiz: [
    {
      question: { en: "If wheat supply falls due to a drought, what happens to wheat prices?", ur: "اگر خشک سالی سے گندم کی رسد کم ہو، گندم کی قیمتوں پر کیا اثر پڑتا ہے؟", rm: "Agar khushk saali se gandum ki rasad kam ho, gandum ki qeematon par kya asar parta hai?" },
      options: [
        { en: "Prices fall", ur: "قیمتیں گرتی ہیں", rm: "Qeematen girti hain" },
        { en: "Prices rise", ur: "قیمتیں بڑھتی ہیں", rm: "Qeematen barhti hain" },
        { en: "Prices stay the same", ur: "قیمتیں وہی رہتی ہیں", rm: "Qeematen wahi rahti hain" },
        { en: "Demand falls automatically", ur: "طلب خود بخود کم ہو جاتی ہے", rm: "Talab khud-ba-khud kam ho jaati hai" },
      ],
      correctIndex: 1,
      explanation: { en: "When supply falls with demand unchanged, there's a shortage, causing prices to rise until the market reaches a new equilibrium.", ur: "جب رسد کم ہو اور طلب وہی رہے، قلت پیدا ہوتی ہے اور قیمتیں بڑھتی ہیں۔", rm: "Jab rasad kam ho aur talab wahi rahe, qillat paida hoti hai aur qeematen barhti hain." },
    },
    {
      question: { en: "What is the 'equilibrium price' in a market?", ur: "بازار میں 'توازن قیمت' کیا ہے؟", rm: "Baazaar mein 'tawazun qeemat' kya hai?" },
      options: [
        { en: "The highest price sellers want", ur: "وہ قیمت جو بیچنے والے چاہتے ہیں", rm: "Woh qeemat jo bechne wale chahte hain" },
        { en: "The price set by government", ur: "حکومت کی مقررہ قیمت", rm: "Hukoomat ki muqarrara qeemat" },
        { en: "The price where quantity supplied equals quantity demanded", ur: "وہ قیمت جہاں رسد اور طلب برابر ہو", rm: "Woh qeemat jahan rasad aur talab barabar ho" },
        { en: "The average price over 10 years", ur: "10 سال کی اوسط قیمت", rm: "10 saal ki ausat qeemat" },
      ],
      correctIndex: 2,
      explanation: { en: "Equilibrium is where the market 'clears' — exactly as much is produced as is demanded, with no surplus or shortage.", ur: "توازن وہ ہے جہاں بازار 'صاف' ہوتا ہے — جتنا پیدا ہوتا ہے اتنا ہی خریدا جاتا ہے۔", rm: "Tawazun woh hai jahan baazaar 'saaf' hota hai — jitna paida hota hai utna hi kharida jaata hai." },
    },
    {
      question: { en: "Why do government price caps (maksimum price controls) sometimes cause shortages?", ur: "حکومتی زیادہ سے زیادہ قیمت پٹی کبھی کبھی قلت کیوں پیدا کرتی ہے؟", rm: "Hukomaati zyada se zyada qeemat patti kabhi kabhi qillat kyun paida karti hai?" },
      options: [
        { en: "They reduce demand too much", ur: "وہ طلب بہت زیادہ کم کر دیتی ہیں", rm: "Woh talab bahut zyada kam kar deti hain" },
        { en: "They discourage production, reducing supply", ur: "وہ پیداوار کی حوصلہ شکنی کرتی ہیں، رسد کم کرتی ہیں", rm: "Woh paidawar ki hosla shikani karti hain, rasad kam karti hain" },
        { en: "They attract too many foreign imports", ur: "وہ بہت زیادہ غیر ملکی درآمدات کو راغب کرتی ہیں", rm: "Woh bahut zyada ghair mulki daraamdaat ko raghib karti hain" },
        { en: "They always work perfectly", ur: "وہ ہمیشہ بالکل کام کرتی ہیں", rm: "Woh hamesha bilkul kaam karti hain" },
      ],
      correctIndex: 1,
      explanation: { en: "When price is forced below equilibrium, producers can't cover costs — they reduce production or exit the market, creating shortages.", ur: "جب قیمت توازن سے کم کی جائے، پیداوار کنندگان لاگت پوری نہیں کر سکتے — وہ پیداوار کم کرتے یا بازار چھوڑ دیتے ہیں۔", rm: "Jab qeemat tawazun se kam ki jaaye, paidawar kunandagaan lagat poori nahi kar sakte — woh paidawar kam karte ya baazaar chhod dete hain." },
    },
    {
      question: { en: "When a new mobile company enters Pakistan and offers data plans, what should happen to data prices?", ur: "جب ایک نئی موبائل کمپنی پاکستان میں داخل ہو اور ڈیٹا پلان پیش کرے، ڈیٹا قیمتوں پر کیا ہونا چاہیے؟", rm: "Jab ek nayi mobile company Pakistan mein daakhil ho aur data plan pesh kare, data qeematon par kya hona chahiye?" },
      options: [
        { en: "Prices should rise", ur: "قیمتیں بڑھنی چاہیے", rm: "Qeematen barhni chahiye" },
        { en: "Prices should fall", ur: "قیمتیں گرنی چاہیے", rm: "Qeematen girni chahiye" },
        { en: "Prices stay the same", ur: "قیمتیں وہی رہیں", rm: "Qeematen wahi rahein" },
        { en: "Demand for data falls", ur: "ڈیٹا کی طلب کم ہو", rm: "Data ki talab kam ho" },
      ],
      correctIndex: 1,
      explanation: { en: "A new entrant increases supply of data services. With more competition, supply increases and prices fall — benefiting consumers.", ur: "نئے داخل ہونے والے سے ڈیٹا خدمات کی رسد بڑھتی ہے۔ زیادہ مقابلے سے رسد بڑھتی ہے اور قیمتیں گرتی ہیں۔", rm: "Naye daakhil hone wale se data khadamaat ki rasad barhti hai. Zyada muqablay se rasad barhti hai aur qeematen girti hain." },
    },
  ],
  faq: [
    {
      question: { en: "Does supply and demand apply to labour (jobs) too?", ur: "کیا طلب اور رسد محنت (ملازمتوں) پر بھی لاگو ہوتی ہے؟", rm: "Kya talab aur rasad mehnat (mulazimaton) par bhi laagu hoti hai?" },
      answer: { en: "Yes. Wages are the 'price' of labour. When demand for a skill rises (e.g. software engineers) and supply is limited, wages rise. When too many workers compete for few jobs, wages are low. Pakistan's surplus of unskilled labour vs. shortage of STEM professionals reflects this.", ur: "ہاں۔ اجرتیں محنت کی 'قیمت' ہیں۔ جب کسی مہارت کی طلب بڑھے اور رسد محدود ہو، اجرتیں بڑھتی ہیں۔", rm: "Haan. Ujraten mehnat ki 'qeemat' hain. Jab kisi maharat ki talab barhe aur rasad mahdood ho, ujraten barhti hain." },
    },
    {
      question: { en: "Can supply and demand fail?", ur: "کیا طلب اور رسد ناکام ہو سکتی ہے؟", rm: "Kya talab aur rasad naakaam ho sakti hai?" },
      answer: { en: "Yes — economists call this 'market failure.' It happens with public goods (nobody can be excluded, like clean air), monopolies (one seller controls prices), or externalities (like pollution costs not reflected in prices). In these cases, government intervention can be justified.", ur: "ہاں — ماہرین اقتصادیات اسے 'بازار کی ناکامی' کہتے ہیں۔ یہ عوامی اشیاء، اجارہ داری، یا بیرونی اثرات کے ساتھ ہوتا ہے۔", rm: "Haan — maahireen iqtisadiyaat ise 'baazaar ki naakamyabi' kehte hain. Yeh awami cheezein, ijaara daari, ya baeruni asaraat ke saath hota hai." },
    },
    {
      question: { en: "Why do onion prices spike so much in Pakistan every few years?", ur: "پاکستان میں ہر چند سالوں میں پیاز کی قیمتیں اتنی کیوں اچھلتی ہیں؟", rm: "Pakistan mein har chand saalon mein pyaaz ki qeematen itni kyun uchhalti hain?" },
      answer: { en: "Pakistan's onion supply is highly weather-sensitive — heavy rains or droughts destroy crops suddenly. Storage infrastructure is poor, so surpluses can't be held smoothly. And demand for onions is inelastic (people still need them for cooking). This combination of volatile supply + inelastic demand = dramatic price swings.", ur: "پاکستان کی پیاز کی رسد موسم کے لحاظ سے بہت حساس ہے۔ ذخیرہ کاری کا بنیادی ڈھانچہ کمزور ہے۔ اور پیاز کی طلب بے لچک ہے۔", rm: "Pakistan ki pyaaz ki rasad mausam ke lihaaz se bahut hassaas hai. Zakheera kaari ka bunyaadi dhaancha kamzor hai. Aur pyaaz ki talab be-lachak hai." },
    },
  ],
};
