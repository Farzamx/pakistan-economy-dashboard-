import type { Lesson } from "@/lib/academy/types";

export const priceSignalsLesson: Lesson = {
  slug: "price-signals",
  category: "beginner",
  title: { en: "Price Signals: How Markets Communicate", ur: "قیمت کے اشارے: بازار کیسے بات کرتے ہیں", rm: "Qeemat ke Ishaare: Baazaar kaise baat karte hain" },
  subtitle: {
    en: "Prices encode information — discover how they guide production, consumption, and resource allocation",
    ur: "قیمتیں معلومات کو انکوڈ کرتی ہیں — دریافت کریں کہ وہ پیداوار، استعمال اور وسائل مختص کرنے میں رہنمائی کیسے کرتی ہیں",
    rm: "Qeematen maaluumaat ko encode karti hain — daryaaft karein ke woh paidawar, istemal aur wasail mukhtas karne mein rahnumaai kaise karti hain",
  },
  level: "beginner",
  readMinutes: 5,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan"],
  relatedLessonSlugs: ["supply-and-demand", "market-types", "market-failure"],
  content: {
    overview: {
      en: "In a market economy, prices do more than just set the cost of things — they transmit information about scarcity, urgency, and value across millions of people without anyone being in charge. When onion prices spike in Pakistan, that signal tells farmers to plant more onions, encourages traders to import, and tells consumers to use less — all without a government office issuing instructions. This decentralised information processing is the core insight of market economics.",
      ur: "بازاری معیشت میں، قیمتیں صرف چیزوں کی قیمت مقرر کرنے سے زیادہ کام کرتی ہیں — وہ لاکھوں لوگوں میں قلت، فوریت اور قدر کے بارے میں معلومات پہنچاتی ہیں بغیر کسی کے انچارج ہوئے۔ جب پاکستان میں پیاز کی قیمتیں بڑھتی ہیں، وہ اشارہ کسانوں کو مزید پیاز لگانے کو کہتا ہے۔",
      rm: "Baazaari muaashat mein, qeematen sirf cheezain ki qeemat muqarrar karne se zyada kaam karti hain — woh laakhon logon mein qillat, foriyat aur qadr ke baare mein maaluumaat pohunchati hain baghair kisi ke in-charge hue. Jab Pakistan mein pyaaz ki qeematen barhti hain, woh ishaara kissanon ko mazeed pyaaz lagane ko kehta hai.",
    },
    whyItMatters: {
      en: "Price controls — when governments fix prices below market levels — create shortages. Pakistan has experienced this repeatedly: petrol price controls in 2022-23 led to long queues, wheat flour price controls led to black markets and hoarding. Understanding price signals explains why removing artificial controls (even if politically unpopular) often fixes shortages — and why price-based market reforms are central to IMF conditionality for Pakistan.",
      ur: "قیمت کنٹرول — جب حکومتیں بازار کی سطح سے نیچے قیمتیں طے کرتی ہیں — قلت پیدا کرتے ہیں۔ پاکستان نے اسے بار بار محسوس کیا ہے: 2022-23 میں پیٹرول قیمت کنٹرول نے لمبی قطاروں کا باعث بنایا، آٹے کی قیمت کنٹرول نے کالا بازار اور ذخیرہ اندوزی کا باعث بنایا۔",
      rm: "Qeemat control — jab hukoomaten baazaar ki satah se neeche qeematen tay karti hain — qillat paida karte hain. Pakistan ne ise baar baar mehsoos kiya hai: 2022-23 mein petrol qeemat control ne lambi qataaron ka baais banaya, aate ki qeemat control ne kaala baazaar aur zakheera-andozi ka baais banaya.",
    },
    explanation: {
      en: `**How price signals work:**

**Rising prices signal scarcity.** When a good becomes scarce (drought cuts wheat harvest), prices rise. This does three things simultaneously: (1) tells producers to produce more; (2) tells consumers to use less; (3) attracts imports from elsewhere. No central planner needed.

**Falling prices signal abundance.** When supply exceeds demand, prices fall, signalling to producers to cut production or shift to other goods, and to consumers that this is a good time to buy.

**Prices coordinate without coordination.** Friedrich Hayek's key insight: no single person knows enough to allocate all resources efficiently. Prices aggregate dispersed information (millions of individual decisions) into one number — the market price — that everyone can use.

**Distorted prices cause waste.** When governments set prices artificially low (subsidies) or high (price floors), the signal is corrupted. Too-cheap electricity encourages waste and discourages new energy investment. Too-cheap petrol encourages overconsumption and strains the government budget.

**Pakistan's petrol subsidy example:** In 2022, petrol was sold at Rs149/litre when market price was Rs250+. The distorted signal caused: massive demand (cheap petrol = more driving), shortages (supply couldn't keep up), fiscal bleeding (government spending billions on the gap), and a balance-of-payments crisis.`,
      ur: `**قیمت کے اشارے کیسے کام کرتے ہیں:**

**بڑھتی قیمتیں قلت کا اشارہ دیتی ہیں۔** جب کوئی چیز قلیل ہو جاتی ہے، قیمتیں بڑھتی ہیں۔ یہ بیک وقت تین کام کرتا ہے: (1) پروڈیوسرز کو مزید پیدا کرنے کو کہتا ہے؛ (2) صارفین کو کم استعمال کرنے کو کہتا ہے؛ (3) کہیں اور سے درآمدات کو راغب کرتا ہے۔

**گرتی قیمتیں فراوانی کا اشارہ دیتی ہیں۔** جب سپلائی طلب سے زیادہ ہو، قیمتیں گرتی ہیں۔

**قیمتیں رابطے کے بغیر ہم آہنگ کرتی ہیں۔** فریڈرک ہایک کی کلیدی بصیرت: کوئی ایک شخص تمام وسائل کو مؤثر طریقے سے مختص کرنے کے لیے کافی نہیں جانتا۔

**بگڑی قیمتیں ضیاع کا باعث بنتی ہیں۔** جب حکومتیں قیمتیں مصنوعی طور پر کم یا اعلی مقرر کرتی ہیں، اشارہ خراب ہو جاتا ہے۔`,
      rm: `**Qeemat ke ishaare kaise kaam karte hain:**

**Barhti qeematen qillat ka ishaara deti hain.** Jab koi cheez qaleel ho jaati hai, qeematen barhti hain. Yeh bayak waqt teen kaam karta hai: (1) producers ko mazeed paida karne ko kehta hai; (2) saraafeen ko kam istemal karne ko kehta hai; (3) kahin aur se daraamdaat ko raghib karta hai.

**Girti qeematen farawaani ka ishaara deti hain.** Jab supply talab se zyada ho, qeematen girti hain.

**Qeematen raabite ke baghair hum-aahang karti hain.** Friedrich Hayek ki kaleedi baseeerat: koi ek shakhs tamam wasail ko moassir tareeqe se mukhtas karne ke liye kaafi nahin jaanta.

**Bigdi qeematen ziya'a ka baais banti hain.** Jab hukoomaten qeematen masnooi tor par kam ya aali muqarrar karti hain, ishaara kharaab ho jaata hai.`,
    },
    misconceptions: {
      en: `**Myth 1: High prices are always unfair and should be controlled.** High prices during a shortage are actually solving the problem — rationing scarce supply to those who value it most and attracting more supply. Price controls feel fair but create black markets and shortages.

**Myth 2: Markets always get prices right.** Markets fail when there are externalities (pollution costs not reflected in price), public goods (national defence — can't exclude people), information asymmetry (used cars — seller knows defects, buyer doesn't), and monopoly power. These are legitimate reasons for government intervention.

**Myth 3: Removing a subsidy always hurts the poor.** Subsidies on general commodities (petrol, electricity, wheat) disproportionately benefit the rich who consume more. Targeted cash transfers (like BISP) are more effective at helping the poor than blanket price subsidies.`,
      ur: `**غلط فہمی 1: اعلی قیمتیں ہمیشہ ناانصافی ہیں اور کنٹرول ہونی چاہئیں۔** قلت کے دوران اعلی قیمتیں دراصل مسئلہ حل کر رہی ہیں۔ قیمت کنٹرول منصفانہ لگتا ہے لیکن کالا بازار اور قلت پیدا کرتا ہے۔

**غلط فہمی 2: بازار ہمیشہ قیمتیں درست کرتے ہیں۔** بازار بیرونیات، عوامی اشیاء، معلومات کے عدم توازن اور اجارہ داری کی طاقت سے ناکام ہو جاتے ہیں۔

**غلط فہمی 3: سبسڈی ہٹانا ہمیشہ غریبوں کو نقصان دیتا ہے۔** عام اجناس پر سبسڈی امیروں کو زیادہ فائدہ دیتی ہے جو زیادہ استعمال کرتے ہیں۔`,
      rm: `**Ghalat fehmi 1: Aali qeematen hamesha na-insaafi hain aur control honi chahiye.** Qillat ke dauran aali qeematen darasal masla hal kar rahi hain. Qeemat control munsifaana lagta hai lekin kaala baazaar aur qillat paida karta hai.

**Ghalat fehmi 2: Baazaar hamesha qeematen durust karte hain.** Baazaar bairooniyaat, amoomi ashaaya, maaluumaat ke adam-tawaazun aur ijaara daari ki taaqat se naakaam ho jaate hain.

**Ghalat fehmi 3: Subsidy hatana hamesha ghareebon ko nuqsaan deta hai.** Aam ajnaas par subsidy ameeron ko zyada faayda deti hai jo zyada istemal karte hain.`,
    },
    pakistanExample: {
      en: `**Pakistan's flour crisis (2023):** The government set official prices for wheat flour (atta) well below market levels and subsidised wheat to millers. The result: millers sold subsidised wheat in the black market at full price, flour disappeared from official channels, prices spiked anyway, and the government spent billions without helping consumers. When the subsidies were eventually withdrawn (under IMF pressure), prices normalised and supply returned to stores — confirming that the price signal distortion, not the underlying shortage, was the core problem.`,
      ur: `**پاکستان کا آٹا بحران (2023):** حکومت نے گندم کے آٹے کی سرکاری قیمتیں بازار کی سطح سے نیچے مقرر کیں اور ملوں کو گندم پر سبسڈی دی۔ نتیجہ: ملوں نے سبسڈی شدہ گندم کالے بازار میں پوری قیمت پر بیچی، آٹا سرکاری چینلز سے غائب ہو گیا، قیمتیں پھر بھی بڑھیں۔ جب سبسڈیاں بالآخر واپس لی گئیں، قیمتیں معمول پر آ گئیں — اس بات کی تصدیق کرتے ہوئے کہ قیمت کے اشارے کی خلل مرکزی مسئلہ تھی۔`,
      rm: `**Pakistan ka aata bohran (2023):** Hukoomat ne gandum ke aate ki sarkari qeematen baazaar ki satah se neeche muqarrar kin aur milon ko gandum par subsidy di. Nateeja: milon ne subsidy shuda gandum kaale baazaar mein poori qeemat par bechi, aata sarkari channels se ghaaib ho gaya, qeematen phir bhi barhin. Jab subsidiyaan bil-aakhir waapis li gain, qeematen maamool par aa gain — is baat ki tasdeeq karte hue ke qeemat ke ishaare ki khalal markazi masla thi.`,
    },
    realWorld: {
      en: "The Soviet Union's planned economy showed the limits of suppressing price signals. Soviet planners set all prices centrally and allocated resources by command — not by price. The result: chronic shortages of consumer goods (people waiting in bread lines), massive overproduction of items nobody wanted, and wasted resources across the economy. When prices couldn't signal scarcity, producers had no incentive to respond to what consumers actually needed. The USSR's collapse in 1991 was partly a collapse of the non-market information system.",
      ur: "سوویت یونین کی منصوبہ بند معیشت نے قیمت کے اشاروں کو دبانے کی حدود دکھائی۔ سوویت منصوبہ سازوں نے تمام قیمتیں مرکزی طور پر مقرر کیں اور وسائل کو حکم سے مختص کیا۔ نتیجہ: صارف اشیاء کی دائمی قلت، کوئی نہیں چاہتا تھا ایسی اشیاء کی بڑے پیمانے پر پیداوار۔ 1991 میں USSR کا خاتمہ جزوی طور پر غیر بازاری معلومات نظام کا خاتمہ تھا۔",
      rm: "Soviet Union ki mansoobaband muaashat ne qeemat ke ishaaron ko dabane ki hududat dikhaai. Soviet mansoobasaazon ne tamam qeematen markazi tor par muqarrar kin aur wasail ko hukum se mukhtas kiya. Nateeja: saraaf ashaaya ki daemi qillat, koi nahin chahta tha aisi ashaaya ki bare paimane par paidawar. 1991 mein USSR ka khaatima juz'wi tor par ghair-baazaari maaluumaat nizam ka khaatima tha.",
    },
    summary: {
      en: "• Prices transmit information about scarcity and value — no central planner needed\n• Rising prices: signal scarcity → attract supply, reduce demand\n• Falling prices: signal abundance → reduce supply, encourage demand\n• Price controls distort signals → black markets, shortages, waste\n• Market failures (externalities, public goods, info asymmetry) justify intervention\n• Pakistan's atta/petrol subsidy history: price distortions created worse outcomes than market prices",
      ur: "• قیمتیں قلت اور قدر کے بارے میں معلومات پہنچاتی ہیں\n• بڑھتی قیمتیں: قلت کا اشارہ → سپلائی راغب کریں، طلب کم کریں\n• گرتی قیمتیں: فراوانی کا اشارہ → سپلائی کم کریں، طلب کی حوصلہ افزائی کریں\n• قیمت کنٹرول اشاروں کو بگاڑتا ہے → کالا بازار، قلت، ضیاع\n• بازار کی ناکامیاں مداخلت کو جواز دیتی ہیں\n• پاکستان کا آٹا/پیٹرول سبسڈی تاریخ: قیمت کی خلل نے بدتر نتائج پیدا کیے",
      rm: "• Qeematen qillat aur qadr ke baare mein maaluumaat pohunchati hain\n• Barhti qeematen: qillat ka ishaara → supply raghib karein, talab kam karein\n• Girti qeematen: farawaani ka ishaara → supply kam karein, talab ki hausla afzaai karein\n• Qeemat control ishaaron ko bigaarta hai → kaala baazaar, qillat, ziya'a\n• Baazaar ki naakamiyan mudaakhalat ko jawaaz deti hain\n• Pakistan ka aata/petrol subsidy taareekh: qeemat ki khalal ne badtar nataayij paida kiye",
    },
  },
  quiz: [
    {
      question: { en: "When onion prices spike in Pakistan, what price signal does this send to farmers?", ur: "جب پاکستان میں پیاز کی قیمتیں بڑھتی ہیں، یہ کسانوں کو کیا قیمت کا اشارہ دیتا ہے؟", rm: "Jab Pakistan mein pyaaz ki qeematen barhti hain, yeh kissanon ko kya qeemat ka ishaara deta hai?" },
      options: [
        { en: "Plant fewer onions next season", ur: "اگلے سیزن میں کم پیاز لگائیں", rm: "Agle sezon mein kam pyaaz lagaein" },
        { en: "Plant more onions — scarcity makes it profitable", ur: "مزید پیاز لگائیں — قلت اسے منافع بخش بناتی ہے", rm: "Mazeed pyaaz lagaein — qillat ise munaafa bakhsh banati hai" },
        { en: "Switch to growing wheat instead", ur: "اس کے بجائے گندم اگانا شروع کریں", rm: "Is ki bajaaye gandum ugana shuroo karein" },
        { en: "Nothing — farmers ignore price signals", ur: "کچھ نہیں — کسان قیمت کے اشاروں کو نظرانداز کرتے ہیں", rm: "Kuch nahin — kissaan qeemat ke ishaaron ko nazarandaaz karte hain" },
      ],
      correctIndex: 1,
      explanation: { en: "Higher prices signal higher profits for producers. A rational farmer seeing onion prices spike will plant more onions next season to capture those profits. This is how price signals coordinate production decisions across thousands of farmers without any central planner.", ur: "اعلی قیمتیں پروڈیوسرز کے لیے اعلی منافع کا اشارہ دیتی ہیں۔ ایک عقلمند کسان جو پیاز کی قیمتیں بڑھتی دیکھے اگلے سیزن میں مزید پیاز لگائے گا۔ یہ اس طرح ہے کہ قیمت کے اشارے ہزاروں کسانوں کی پیداوار کے فیصلوں کو کسی مرکزی منصوبہ ساز کے بغیر ہم آہنگ کرتے ہیں۔", rm: "Aali qeematen producers ke liye aali munaafe ka ishaara deti hain. Ek aaqilmand kissaan jo pyaaz ki qeematen barhti dekhe agle sezon mein mazeed pyaaz lagayega. Yeh is tarah hai ke qeemat ke ishaare hazaron kissaanon ki paidawar ke faislon ko kisi markazi mansoobasaaz ke baghair hum-aahang karte hain." },
    },
    {
      question: { en: "Pakistan set petrol prices below market levels in 2022. What was the main consequence?", ur: "پاکستان نے 2022 میں پیٹرول کی قیمتیں بازار کی سطح سے نیچے مقرر کیں۔ اس کا اہم نتیجہ کیا تھا؟", rm: "Pakistan ne 2022 mein petrol ki qeematen baazaar ki satah se neeche muqarrar kin. Is ka ahem nateeja kya tha?" },
      options: [
        { en: "Consumers benefited and government saved money", ur: "صارفین کو فائدہ ہوا اور حکومت نے پیسہ بچایا", rm: "Saraafeen ko faayda hua aur hukoomat ne paisa bachaya" },
        { en: "Shortages, queues, and fiscal bleeding as demand surged beyond supply", ur: "قلت، قطاریں، اور مالی نقصان کیونکہ طلب سپلائی سے آگے بڑھ گئی", rm: "Qillat, qataaren, aur maali nuqsaan kyunke talab supply se aage barh gayi" },
        { en: "Oil production in Pakistan increased to meet demand", ur: "پاکستان میں تیل کی پیداوار طلب پوری کرنے کے لیے بڑھی", rm: "Pakistan mein tel ki paidawar talab poori karne ke liye barhi" },
        { en: "Exports of petrol increased as supply was abundant", ur: "پیٹرول کی برآمدات بڑھیں کیونکہ سپلائی وافر تھی", rm: "Petrol ki baraamdaat barhin kyunke supply waafir thi" },
      ],
      correctIndex: 1,
      explanation: { en: "Below-market petrol prices sent the wrong price signal: they told consumers petrol was cheap (encouraging overconsumption) while telling suppliers nothing extra was needed. The result: massive demand, limited supply, government paying billions in subsidy, and eventual crisis when the subsidy became unaffordable.", ur: "بازار سے نیچے پیٹرول قیمتوں نے غلط قیمت کا اشارہ بھیجا: انہوں نے صارفین کو بتایا کہ پیٹرول سستا ہے (زیادہ استعمال کی حوصلہ افزائی) جبکہ سپلائرز کو بتایا کہ کوئی اضافی ضرورت نہیں۔", rm: "Baazaar se neeche petrol qeematon ne ghalat qeemat ka ishaara bheja: unhon ne saraafeen ko bataya ke petrol sasta hai (zyada istemal ki hausla afzaai) jabke suppliers ko bataya ke koi izaafi zaroorat nahin." },
    },
    {
      question: { en: "What is a 'market failure'?", ur: "'بازار کی ناکامی' کیا ہے؟", rm: "'Baazaar ki naakamyi' kya hai?" },
      options: [
        { en: "When prices fall in a market", ur: "جب بازار میں قیمتیں گریں", rm: "Jab baazaar mein qeematen giren" },
        { en: "When a market shuts down entirely", ur: "جب بازار مکمل طور پر بند ہو جائے", rm: "Jab baazaar mukammal tor par band ho jaye" },
        { en: "When market prices fail to reflect true social costs or benefits (e.g., pollution, public goods)", ur: "جب بازار کی قیمتیں حقیقی سماجی لاگت یا فوائد کو ظاہر کرنے میں ناکام ہوں (مثلاً آلودگی، عوامی اشیاء)", rm: "Jab baazaar ki qeematen haqeeqi samaaji lagat ya fawaaید ko zaahir karne mein naakaam hon (maslan aaolodgi, amoomi ashaaya)" },
        { en: "When only large companies can operate in a market", ur: "جب صرف بڑی کمپنیاں بازار میں کام کر سکتی ہیں", rm: "Jab sirf bari companies baazaar mein kaam kar sakti hain" },
      ],
      correctIndex: 2,
      explanation: { en: "Market failure occurs when price signals don't capture all relevant costs and benefits. A factory polluting a river imposes costs on society (dirty water, health impacts) not reflected in its product price. This is an externality — a market failure that justifies government intervention like pollution taxes.", ur: "بازار کی ناکامی اس وقت ہوتی ہے جب قیمت کے اشارے تمام متعلقہ لاگتوں اور فوائد کو حاصل نہ کریں۔ ایک دریا کو آلودہ کرنے والی فیکٹری معاشرے پر لاگتیں عائد کرتی ہے جو اس کی مصنوعات کی قیمت میں ظاہر نہیں ہوتی۔ یہ ایک بیرونیت ہے۔", rm: "Baazaar ki naakamyi us waqt hoti hai jab qeemat ke ishaare tamam mutaalliqa lagaton aur fawaaید ko haasil na karen. Ek darya ko aalooda karne wali factory samaj par lagaten aaid karti hai jo is ki masnoowaat ki qeemat mein zaahir nahin hoti. Yeh ek baironiyat hai." },
    },
    {
      question: { en: "According to Hayek's insight, why can't a central planner allocate resources as well as markets?", ur: "ہایک کی بصیرت کے مطابق، مرکزی منصوبہ ساز بازاروں کی طرح وسائل مختص کیوں نہیں کر سکتا؟", rm: "Hayek ki baseeerat ke mutaabiq, markazi mansoobasaaz baazaaron ki tarah wasail mukhtas kyun nahin kar sakta?" },
      options: [
        { en: "Central planners are always corrupt", ur: "مرکزی منصوبہ ساز ہمیشہ بدعنوان ہوتے ہیں", rm: "Markazi mansoobasaaz hamesha badunwaan hote hain" },
        { en: "No single entity can know all the dispersed local information that millions of individual decisions encode into prices", ur: "کوئی بھی واحد ادارہ وہ تمام بکھری ہوئی مقامی معلومات نہیں جان سکتا جو لاکھوں انفرادی فیصلے قیمتوں میں انکوڈ کرتے ہیں", rm: "Koi bhi waahid idaara woh tamam bikhri hui maqaami maaluumaat nahin jaan sakta jo laakhon infiraadi faislay qeematon mein encode karte hain" },
        { en: "Planning is always slower than markets in terms of processing speed", ur: "منصوبہ بندی ہمیشہ پروسیسنگ رفتار کے لحاظ سے بازاروں سے سست ہے", rm: "Mansoobabadiی hamesha processing raftaar ke lihaaz se baazaaron se sust hai" },
        { en: "Markets have computers and planners do not", ur: "بازاروں کے پاس کمپیوٹر ہیں اور منصوبہ سازوں کے پاس نہیں", rm: "Baazaaron ke paas computers hain aur mansoobasaazon ke paas nahin" },
      ],
      correctIndex: 1,
      explanation: { en: "Hayek argued that economic knowledge is dispersed across millions of people — local farmers know their soil, local traders know their customers, individual families know their needs. Prices aggregate all this knowledge into a single signal. No central planner can collect and process all that local, tacit knowledge in real time.", ur: "ہایک نے استدلال کیا کہ معاشی علم لاکھوں لوگوں میں بکھرا ہوا ہے — مقامی کسان اپنی مٹی جانتے ہیں، مقامی تاجر اپنے گاہک جانتے ہیں، انفرادی خاندان اپنی ضروریات جانتے ہیں۔ قیمتیں اس تمام علم کو ایک اشارے میں جمع کرتی ہیں۔", rm: "Hayek ne istedlaal kiya ke muaashi ilm laakhon logon mein bikhra hua hai — maqaami kissaan apni mitti jaante hain, maqaami taajir apne gaahaak jaante hain, infiraadi khandaan apni zarooraten jaante hain. Qeematen is tamam ilm ko ek ishaare mein jamaa karti hain." },
    },
  ],
  faq: [
    {
      question: { en: "If price controls cause problems, why do governments use them?", ur: "اگر قیمت کنٹرول مسائل پیدا کرتے ہیں، تو حکومتیں انہیں کیوں استعمال کرتی ہیں؟", rm: "Agar qeemat control masaail paida karte hain, to hukoomaten unhen kyun istemal karti hain?" },
      answer: { en: "Because the short-term political benefits outweigh the long-term economic costs. A politician who raises petrol prices faces immediate anger — queues at petrol stations are visible and feel immediate. A politician who keeps prices low is popular today even if the subsidies cause a fiscal crisis next year. This political economy problem — politicians optimising for re-election rather than economic efficiency — explains most of Pakistan's subsidy and price control history. Reform happens when the fiscal pain becomes unavoidable (IMF programme, forex crisis, default risk).", ur: "کیونکہ قلیل مدتی سیاسی فوائد طویل مدتی معاشی لاگتوں سے زیادہ ہیں۔ ایک سیاستدان جو پیٹرول کی قیمتیں بڑھاتا ہے فوری غصے کا سامنا کرتا ہے۔ ایک سیاستدان جو قیمتیں کم رکھتا ہے آج مقبول ہے چاہے سبسڈیاں اگلے سال مالی بحران پیدا کریں۔", rm: "Kyunke qaleel muddat-i siyaasi fawaaید taweel muddat-i muaashi lagaton se zyada hain. Ek siyaasatdaan jo petrol ki qeematen barhata hai fori ghussay ka saamna karta hai. Ek siyaasatdaan jo qeematen kam rakhta hai aaj maqbool hai chahe subsidiyaan agle saal maali bohran paida karen." },
    },
  ],
};
