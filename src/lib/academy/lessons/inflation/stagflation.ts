import type { Lesson } from "@/lib/academy/types";

export const stagflationLesson: Lesson = {
  slug: "stagflation",
  category: "inflation",
  title: { en: "Stagflation: Pakistan's 2022-24 Dilemma", ur: "سٹیگ فلیشن: پاکستان کا 2022-24 مخمصہ", rm: "Stagflation: Pakistan ka 2022-24 Mukhama" },
  subtitle: {
    en: "When high inflation and economic stagnation strike together, leaving no easy policy fix",
    ur: "جب اعلی افراط زر اور معاشی جمود ایک ساتھ آئیں، کوئی آسان پالیسی حل نہیں چھوڑتے",
    rm: "Jab aali inflation aur muaashi jamood ek saath aayen, koi aasaan policy hal nahin chhaadte",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan", "gdp-pakistan"],
  relatedLessonSlugs: ["cost-push", "types-of-inflation", "economic-cycles"],
  content: {
    overview: {
      en: "Stagflation combines the worst of both worlds: stagnant (or shrinking) economic growth alongside high inflation. Normally, economists expect a trade-off — either the economy grows and prices rise (boom), or the economy contracts and prices fall or stay stable (recession). Stagflation breaks this pattern: unemployment rises, growth stalls, AND prices keep rising. It's most often caused by cost-push shocks (like the 1970s oil crisis) that simultaneously raise costs (inflation) and reduce output (stagnation). Pakistan lived through classic stagflation in 2022-24: GDP growth near zero while CPI inflation hit 38%.",
      ur: "سٹیگ فلیشن دونوں جہانوں کا بدترین یکجا کرتا ہے: جمود (یا سکڑتی) معاشی نمو کے ساتھ اعلی افراط زر۔ عام طور پر، ماہرین اقتصادیات ایک تبادلے کی توقع کرتے ہیں — یا تو معیشت بڑھتی ہے اور قیمتیں بڑھتی ہیں، یا معیشت سکڑتی ہے اور قیمتیں گرتی ہیں۔ سٹیگ فلیشن اس پیٹرن کو توڑتا ہے۔ پاکستان نے 2022-24 میں کلاسک سٹیگ فلیشن کا تجربہ کیا: GDP نمو تقریباً صفر جبکہ CPI افراط زر 38٪ تک پہنچا۔",
      rm: "Stagflation dono jahanon ka badtareen yek-ja karta hai: jamood (ya sikaRti) muaashi numa ke saath aali inflation. Aam tor par, maahireen iqtisaadiyaat ek tabaadle ki tawaqqu karte hain — ya to muaashat barhti hai aur qeematen barhti hain, ya muaashat sikaRti hai aur qeematen girti hain. Stagflation is pattern ko toDta hai. Pakistan ne 2022-24 mein classic stagflation ka tajruba kiya: GDP numa taqreeban sifar jabke CPI inflation 38% tak pohuncha.",
    },
    whyItMatters: {
      en: "Stagflation is the hardest economic condition to fix with conventional tools. To fight inflation, the SBP should raise rates — but this deepens the recession (unemployment). To fight the recession, the SBP should cut rates — but this worsens inflation. Every policy tool involves worsening one problem to fix the other. Understanding this trade-off explains why Pakistan's 2023 IMF programme was so painful: there was no way to simultaneously fix inflation and revive growth using standard demand-management tools. The only real solutions are structural — fixing the supply-side causes (energy costs, agricultural productivity, exchange rate stability).",
      ur: "سٹیگ فلیشن روایتی آلات سے ٹھیک کرنے کے لیے سب سے مشکل معاشی حالت ہے۔ افراط زر سے لڑنے کے لیے، SBP کو شرحیں بڑھانی چاہئیں — لیکن یہ کساد بازاری کو گہرا کرتا ہے۔ کساد بازاری سے لڑنے کے لیے، SBP کو شرحیں کم کرنی چاہئیں — لیکن یہ افراط زر کو بدتر بناتا ہے۔",
      rm: "Stagflation rawaayati aalaat se theek karne ke liye sab se mushkil muaashi haalat hai. Inflation se larne ke liye, SBP ko sharhein barhaani chahiye — lekin yeh kasaad-baazaari ko gehra karta hai. Kasaad-baazaari se larne ke liye, SBP ko sharhein kam karni chahiye — lekin yeh inflation ko badtar banata hai.",
    },
    explanation: {
      en: `**Why stagflation happens:**

Stagflation typically arises from a supply shock — a sudden increase in production costs that simultaneously:
1. Raises prices (inflation) as firms pass costs to consumers
2. Reduces output (stagnation) as firms produce less at the new higher cost structure

**The 1970s origin story:** Before the 1970s, mainstream economics (the Phillips Curve) suggested a stable trade-off between inflation and unemployment — you could always choose lower unemployment at the cost of higher inflation, or vice versa. The 1973 oil shock broke this assumption: oil-importing economies got BOTH high inflation AND high unemployment simultaneously, proving the simple trade-off wrong.

**Why standard policy tools fail:**
- Monetary policy (rate hikes/cuts): Effective against demand-driven inflation or recession, but stagflation isn't purely demand-driven — it has a supply-side cost component that rates can't fix
- Fiscal policy (spending/tax changes): Similarly limited — more government spending could boost growth but would worsen inflation; less spending could ease inflation but would worsen the recession

**Pakistan's 2022-24 case, dissected:**
- Supply shock: Energy price deregulation (removing circular debt subsidies), forced by IMF conditions and unsustainable losses
- Currency shock: PKR depreciation (200→300) from forex reserve crisis, raising all import costs
- Result: Production costs surged across every sector → inflation (CPI hit 38%) while output simultaneously contracted (GDP growth near 0%, some sectors like large-scale manufacturing in outright decline)
- SBP's dilemma: Raised rates to 22% (fighting inflation and defending the currency) knowing this would further slow growth — accepting the "stagnation" side of stagflation as an unavoidable cost of fighting inflation and currency collapse

**Breaking stagflation requires structural fixes, not just demand management:** energy sector reform, agricultural productivity gains, exchange rate stabilisation, and fiscal consolidation — none of which work quickly.`,
      ur: `**سٹیگ فلیشن کیوں ہوتی ہے:**

سٹیگ فلیشن عام طور پر سپلائی جھٹکے سے پیدا ہوتی ہے — پیداواری لاگت میں اچانک اضافہ جو بیک وقت:
1. قیمتیں بڑھاتا ہے (افراط زر)
2. پیداوار کم کرتا ہے (جمود)

**1970s کی اصل کہانی:** 1970s سے پہلے، مرکزی دھارے کی معاشیات نے افراط زر اور بے روزگاری کے درمیان مستحکم تبادلے کا مشورہ دیا۔ 1973 کے تیل جھٹکے نے یہ مفروضہ توڑا۔

**پاکستان کا 2022-24 کیس:**
- سپلائی جھٹکا: توانائی قیمت ضابطہ بندی
- کرنسی جھٹکا: PKR کی کمزوری (200→300)
- نتیجہ: پیداواری لاگت ہر شعبے میں بڑھی → افراط زر جبکہ پیداوار بیک وقت سکڑی
- SBP کا مخمصہ: شرحیں 22٪ تک بڑھائیں جانتے ہوئے کہ یہ نمو کو مزید سست کرے گا`,
      rm: `**Stagflation kyun hoti hai:**

Stagflation aam tor par supply jhatke se paida hoti hai — paidawaari lagat mein achanak izaafa jo bayak waqt:
1. Qeematen barhata hai (inflation)
2. Paidawar kam karta hai (jamood)

**1970s ki asal kahani:** 1970s se pehle, markazi dhaare ki muaashiyaat ne inflation aur be-rozgaari ke darmiyan mustahkam tabaadle ka mashwarah diya. 1973 ke tel jhatke ne yeh mafrooza tora.

**Pakistan ka 2022-24 case:**
- Supply jhatka: Tawanaayi qeemat zaabita-bandi
- Currency jhatka: PKR ki kamzori (200→300)
- Nateeja: Paidawaari lagat har shube mein barhi → inflation jabke paidawar bayak waqt sikaRi
- SBP ka mukhama: Sharhein 22% tak barhaaein jaante hue ke yeh numa ko mazeed sust karega`,
    },
    misconceptions: {
      en: `**Myth 1: Stagflation is impossible according to economic theory.** Before the 1970s, this was the mainstream belief (Phillips Curve trade-off). The 1970s oil shocks and Pakistan's own 2022-24 experience prove stagflation can and does happen from supply shocks.

**Myth 2: There is an easy fix for stagflation.** There isn't — this is precisely what makes stagflation so painful and prolonged. Any single policy tool trades off one problem for the other. Real solutions require years of structural reform.

**Myth 3: Stagflation always requires the same severity of response as the 1970s (Volcker shock).** Paul Volcker's brutal 20% interest rates and deliberate deep recession broke 1970s-80s stagflation, but caused a severe recession. Some economists argue for gentler, more gradual approaches combined with faster supply-side reform to reduce the pain — Pakistan's approach has been closer to gradual with IMF support.`,
      ur: `**غلط فہمی 1: معاشی نظریے کے مطابق سٹیگ فلیشن ناممکن ہے۔** 1970s سے پہلے، یہ مرکزی دھارے کا عقیدہ تھا۔ 1970s کے تیل جھٹکوں اور پاکستان کے اپنے 2022-24 تجربے نے ثابت کیا کہ سٹیگ فلیشن ہو سکتی ہے۔

**غلط فہمی 2: سٹیگ فلیشن کا آسان حل ہے۔** نہیں ہے — یہی وہ ہے جو سٹیگ فلیشن کو اتنا تکلیف دہ اور طویل بناتا ہے۔

**غلط فہمی 3: سٹیگ فلیشن کو ہمیشہ 1970s جیسے شدید ردعمل کی ضرورت ہے۔** پال وولکر کی سخت 20٪ شرح سود نے 1970s-80s سٹیگ فلیشن توڑی، لیکن شدید کساد بازاری کا باعث بنی۔`,
      rm: `**Ghalat fehmi 1: Muaashi nazriye ke mutaabiq stagflation na-mumkin hai.** 1970s se pehle, yeh markazi dhaare ka aqeeda tha. 1970s ke tel jhatkon aur Pakistan ke apne 2022-24 tajrube ne saabit kiya ke stagflation ho sakti hai.

**Ghalat fehmi 2: Stagflation ka aasaan hal hai.** Nahin hai — yahi woh hai jo stagflation ko itna takleef deh aur taweel banata hai.

**Ghalat fehmi 3: Stagflation ko hamesha 1970s jaise shadeed rad-e-amal ki zaroorat hai.** Paul Volcker ki sakht 20% shar-e-sood ne 1970s-80s stagflation todi, lekin shadeed kasaad-baazaari ka baais bani.`,
    },
    pakistanExample: {
      en: `**Pakistan's stagflation numbers (FY2023):** GDP growth: 0.29% (near-zero, effectively stagnant given ~2.5% population growth means per-capita income fell). CPI inflation: peaked at 38% (May 2023), averaged ~29% for the fiscal year. Large-scale manufacturing (LSM) output contracted by over 10% year-on-year. Unemployment and underemployment rose as textile mills and other export industries cut shifts due to high energy costs and weak export demand. This combination — near-zero growth with high double-digit inflation — is a clean stagflation case, driven primarily by the energy cost shock and currency crisis rather than excess demand.`,
      ur: `**پاکستان کے سٹیگ فلیشن اعداد (FY2023):** GDP نمو: 0.29٪ (تقریباً صفر)۔ CPI افراط زر: مئی 2023 میں 38٪ عروج، مالی سال کے لیے اوسطاً ~29٪۔ بڑے پیمانے پر مینوفیکچرنگ (LSM) کی پیداوار سالانہ 10٪ سے زیادہ سکڑی۔ ٹیکسٹائل ملوں نے اعلی توانائی لاگت کی وجہ سے شفٹیں کم کیں۔`,
      rm: `**Pakistan ke stagflation adaad (FY2023):** GDP numa: 0.29% (taqreeban sifar). CPI inflation: May 2023 mein 38% uroj, maali saal ke liye ausatan ~29%. Bare paimane par manufacturing (LSM) ki paidawar saalaana 10% se zyada sikaRi. Textile milon ne aali tawanaayi lagat ki wajah se shifts kam kin.`,
    },
    realWorld: {
      en: "The US 1970s stagflation era remains the textbook case. Unemployment reached 9% (1975) while CPI inflation hit 12%+ — both numbers considered crisis-level individually, occurring simultaneously. Fed Chairman Arthur Burns tried gentle, gradual policy — fearing recession — and inflation kept rising through the decade. His successor, Paul Volcker, took the opposite approach in 1979: raised the federal funds rate to nearly 20%, deliberately triggering the worst recession since the Great Depression (unemployment hit 10.8% in 1982). This broke inflation expectations and ended stagflation, but at enormous short-term economic pain — a lesson in the brutal trade-offs stagflation forces upon policymakers.",
      ur: "امریکہ کا 1970s سٹیگ فلیشن دور نصابی کتاب کیس ہے۔ بے روزگاری 9٪ (1975) تک پہنچی جبکہ CPI افراط زر 12٪+ تک پہنچا۔ فیڈ چیئرمین آرتھر برنز نے نرم پالیسی آزمائی — کساد بازاری کے خوف سے۔ ان کے جانشین پال وولکر نے 1979 میں مخالف نقطہ نظر اختیار کیا۔",
      rm: "America ka 1970s stagflation daur nisaabi kitaab case hai. Be-rozgaari 9% (1975) tak pohunchi jabke CPI inflation 12%+ tak pohuncha. Fed Chairman Arthur Burns ne narm policy aazmaai — kasaad-baazaari ke khauf se. Un ke jaanasheen Paul Volcker ne 1979 mein mukhaalif nuqta-e-nazar ikhtiyaar kiya.",
    },
    summary: {
      en: "• Stagflation: high inflation + stagnant/shrinking growth simultaneously — breaks the normal trade-off\n• Caused by supply shocks: cost increases that raise prices while reducing output\n• 1970s oil crisis: first major modern case, broke the Phillips Curve assumption\n• No easy policy fix: rate hikes fight inflation but worsen recession; rate cuts fight recession but worsen inflation\n• Pakistan's 2022-24: near-zero GDP growth + 38% peak CPI = textbook stagflation\n• Real solution: structural supply-side reform (energy, productivity), not just demand management",
      ur: "• سٹیگ فلیشن: اعلی افراط زر + جمود/سکڑتی نمو بیک وقت — عام تبادلے کو توڑتا ہے\n• سپلائی جھٹکوں سے پیدا: لاگت اضافہ جو قیمتیں بڑھاتا اور پیداوار کم کرتا ہے\n• 1970s تیل بحران: پہلا بڑا جدید کیس\n• کوئی آسان پالیسی حل نہیں\n• پاکستان کا 2022-24: تقریباً صفر GDP نمو + 38٪ عروج CPI = نصابی کتاب سٹیگ فلیشن\n• حقیقی حل: ساختی سپلائی سائیڈ اصلاح",
      rm: "• Stagflation: aali inflation + jamood/sikaRti numa bayak waqt — aam tabaadle ko toDta hai\n• Supply jhatkon se paida: lagat izaafa jo qeematen barhata aur paidawar kam karta hai\n• 1970s tel bohran: pehla bara jadeed case\n• Koi aasaan policy hal nahin\n• Pakistan ka 2022-24: taqreeban sifar GDP numa + 38% uroj CPI = nisaabi kitaab stagflation\n• Haqeeqi hal: saakhti supply side islaah",
    },
  },
  quiz: [
    {
      question: { en: "What defines stagflation?", ur: "سٹیگ فلیشن کی تعریف کیا ہے؟", rm: "Stagflation ki tareef kya hai?" },
      options: [
        { en: "High growth with high inflation", ur: "اعلی افراط زر کے ساتھ اعلی نمو", rm: "Aali inflation ke saath aali numa" },
        { en: "Stagnant/shrinking economic growth occurring simultaneously with high inflation", ur: "اعلی افراط زر کے ساتھ بیک وقت جمود/سکڑتی معاشی نمو", rm: "Aali inflation ke saath bayak waqt jamood/sikaRti muaashi numa" },
        { en: "Low growth with low inflation", ur: "کم افراط زر کے ساتھ کم نمو", rm: "Kam inflation ke saath kam numa" },
        { en: "Deflation combined with high unemployment", ur: "اعلی بے روزگاری کے ساتھ افلاس زر", rm: "Aali be-rozgaari ke saath iflaas-e-zer" },
      ],
      correctIndex: 1,
      explanation: { en: "Stagflation combines stagnant or negative growth with persistently high inflation — a combination that traditional economic theory (Phillips Curve) suggested shouldn't happen simultaneously. It typically results from supply-side shocks like the 1970s oil crisis or Pakistan's 2022-23 energy price deregulation and currency crisis.", ur: "سٹیگ فلیشن مستقل اعلی افراط زر کے ساتھ جمود یا منفی نمو یکجا کرتا ہے۔ یہ عام طور پر 1970s تیل بحران یا پاکستان کے 2022-23 توانائی قیمت ضابطہ بندی جیسے سپلائی سائیڈ جھٹکوں سے پیدا ہوتا ہے۔", rm: "Stagflation mustaqil aali inflation ke saath jamood ya manfi numa yek-ja karta hai. Yeh aam tor par 1970s tel bohran ya Pakistan ke 2022-23 tawanaayi qeemat zaabita-bandi jaise supply side jhatkon se paida hota hai." },
    },
    {
      question: { en: "Why is stagflation so difficult for central banks to fix?", ur: "مرکزی بینکوں کے لیے سٹیگ فلیشن کو ٹھیک کرنا اتنا مشکل کیوں ہے؟", rm: "Markazi bankon ke liye stagflation ko theek karna itna mushkil kyun hai?" },
      options: [
        { en: "Central banks don't have any tools to use at all", ur: "مرکزی بینکوں کے پاس استعمال کرنے کے لیے کوئی آلات نہیں ہیں", rm: "Markazi bankon ke paas istemal karne ke liye koi aalaat nahin hain" },
        { en: "Fighting inflation (raising rates) worsens the recession; fighting recession (cutting rates) worsens inflation — every tool trades off one problem for the other", ur: "افراط زر سے لڑنا (شرحیں بڑھانا) کساد بازاری کو بدتر کرتا ہے؛ کساد بازاری سے لڑنا (شرحیں کم کرنا) افراط زر کو بدتر کرتا ہے", rm: "Inflation se larna (sharhein barhana) kasaad-baazaari ko badtar karta hai; kasaad-baazaari se larna (sharhein kam karna) inflation ko badtar karta hai" },
        { en: "Because stagflation only lasts one week", ur: "کیونکہ سٹیگ فلیشن صرف ایک ہفتہ چلتی ہے", rm: "Kyunke stagflation sirf ek hafta chalti hai" },
        { en: "Because governments always ignore stagflation", ur: "کیونکہ حکومتیں ہمیشہ سٹیگ فلیشن کو نظرانداز کرتی ہیں", rm: "Kyunke hukoomaten hamesha stagflation ko nazarandaaz karti hain" },
      ],
      correctIndex: 1,
      explanation: { en: "Standard monetary policy assumes inflation and recession move in opposite directions — you can fix one by worsening the other, and that's usually a fine trade to make. In stagflation, both problems exist simultaneously, so any policy choice worsens one problem while addressing the other. This is why stagflation requires supply-side structural fixes, not just demand management.", ur: "معیاری مالیاتی پالیسی فرض کرتی ہے کہ افراط زر اور کساد بازاری مخالف سمتوں میں حرکت کرتے ہیں۔ سٹیگ فلیشن میں، دونوں مسائل بیک وقت موجود ہیں، اس لیے کوئی بھی پالیسی انتخاب ایک مسئلے کو حل کرتے ہوئے دوسرے کو بدتر بناتا ہے۔", rm: "Mayaari maaliyaati policy farz karti hai ke inflation aur kasaad-baazaari mukhaalif samton mein harkat karte hain. Stagflation mein, dono masaail bayak waqt maujood hain, is liye koi bhi policy intikhab ek masle ko hal karte hue doosre ko badtar banata hai." },
    },
    {
      question: { en: "What was the primary cause of Pakistan's 2022-24 stagflation?", ur: "پاکستان کے 2022-24 سٹیگ فلیشن کی اہم وجہ کیا تھی؟", rm: "Pakistan ke 2022-24 stagflation ki ahem wajah kya thi?" },
      options: [
        { en: "Excessive consumer demand for luxury goods", ur: "لگژری اشیاء کے لیے زائد صارف طلب", rm: "Luxury ashaaya ke liye zaaid saraaf talab" },
        { en: "Energy price deregulation and currency depreciation raising costs while contracting output", ur: "توانائی قیمت ضابطہ بندی اور کرنسی کی کمزوری نے پیداوار سکڑتے ہوئے لاگت بڑھائی", rm: "Tawanaayi qeemat zaabita-bandi aur currency ki kamzori ne paidawar sikaRte hue lagat barhaai" },
        { en: "A sudden boom in exports", ur: "برآمدات میں اچانک ابھار", rm: "Baraamdaat mein achanak ubhaar" },
        { en: "Very low interest rates causing overheating", ur: "بہت کم شرح سود سے زیادہ گرمی", rm: "Bahut kam shar-e-sood se zyada garmi" },
      ],
      correctIndex: 1,
      explanation: { en: "Pakistan's removal of energy subsidies (under IMF pressure to fix circular debt) and simultaneous PKR depreciation (from a forex crisis) raised production costs across the economy — pushing inflation up to 38% while simultaneously causing large-scale manufacturing to contract and overall GDP growth to stall near zero.", ur: "پاکستان کی توانائی سبسڈیوں کا خاتمہ اور بیک وقت PKR کی کمزوری نے پوری معیشت میں پیداواری لاگت بڑھائی — افراط زر کو 38٪ تک بڑھایا جبکہ بیک وقت بڑے پیمانے پر مینوفیکچرنگ سکڑی اور مجموعی GDP نمو تقریباً صفر ہو گئی۔", rm: "Pakistan ki tawanaayi subsidiyon ka khaatima aur bayak waqt PKR ki kamzori ne poori muaashat mein paidawaari lagat barhaai — inflation ko 38% tak barhaya jabke bayak waqt bare paimane par manufacturing sikaRi aur majmooee GDP numa taqreeban sifar ho gayi." },
    },
    {
      question: { en: "How did Paul Volcker eventually break 1970s-80s US stagflation?", ur: "پال وولکر نے آخرکار 1970s-80s امریکی سٹیگ فلیشن کو کیسے توڑا؟", rm: "Paul Volcker ne bilaakhir 1970s-80s Amreeki stagflation ko kaise tora?" },
      options: [
        { en: "By cutting interest rates to zero", ur: "شرح سود کو صفر تک کم کر کے", rm: "Shar-e-sood ko sifar tak kam kar ke" },
        { en: "By raising interest rates to nearly 20%, deliberately causing a severe recession to break inflation expectations", ur: "شرح سود کو تقریباً 20٪ تک بڑھا کر، جان بوجھ کر افراط زر کی توقعات کو توڑنے کے لیے شدید کساد بازاری پیدا کی", rm: "Shar-e-sood ko taqreeban 20% tak barha kar, jaanboojhkar inflation ki tawaqquaat ko toRne ke liye shadeed kasaad-baazaari paida ki" },
        { en: "By printing more money to stimulate the economy", ur: "معیشت کو تحریک دینے کے لیے مزید پیسہ چھاپ کر", rm: "Muaashat ko tehreek dene ke liye mazeed paisa chhaap kar" },
        { en: "By imposing strict price controls on all goods", ur: "تمام اشیاء پر سخت قیمت کنٹرول لگا کر", rm: "Tamam ashaaya par sakht qeemat control laga kar" },
      ],
      correctIndex: 1,
      explanation: { en: "Volcker's approach was brutal but effective: by raising rates to nearly 20%, he deliberately triggered a severe recession (unemployment hit 10.8% in 1982) to break the wage-price spiral and reset inflation expectations. This shows that ending entrenched stagflation often requires accepting severe short-term pain — there's no painless fix.", ur: "وولکر کا نقطہ نظر ظالمانہ لیکن مؤثر تھا: شرحوں کو تقریباً 20٪ تک بڑھا کر، اس نے جان بوجھ کر اجرت-قیمت سرپل کو توڑنے کے لیے شدید کساد بازاری پیدا کی۔", rm: "Volcker ka nuqta-e-nazar zaalimana lekin moassir tha: sharhon ko taqreeban 20% tak barha kar, is ne jaanboojhkar ujrat-qeemat spiral ko toRne ke liye shadeed kasaad-baazaari paida ki." },
    },
  ],
  faq: [
    {
      question: { en: "Is Pakistan still in stagflation now, or has it recovered?", ur: "کیا پاکستان اب بھی سٹیگ فلیشن میں ہے، یا یہ ٹھیک ہو گیا ہے؟", rm: "Kya Pakistan ab bhi stagflation mein hai, ya yeh theek ho gaya hai?" },
      answer: { en: "By late 2023 into 2024, Pakistan's inflation began easing from its 38% peak as base effects (comparing against the already-high prior year) kicked in and the SBP's tight monetary policy took hold, alongside some currency stabilisation. However, GDP growth remained modest and well below Pakistan's historical trend rate — meaning the 'stagnation' component partially persisted even as inflation eased. Full recovery from a stagflation episode typically takes several years, as structural issues (energy sector viability, tax base, productivity) require sustained reform beyond just monetary tightening. Check the current CPI and GDP growth indicators on this dashboard for the latest data.", ur: "2023 کے آخر سے 2024 تک، پاکستان کا افراط زر اپنے 38٪ عروج سے کم ہونا شروع ہوا کیونکہ بنیادی اثرات اور SBP کی سخت مالیاتی پالیسی نے اثر ڈالا۔ تاہم، GDP نمو معتدل رہی اور پاکستان کی تاریخی رجحان شرح سے کافی نیچے۔", rm: "2023 ke aakhir se 2024 tak, Pakistan ka inflation apne 38% uroj se kam hona shuroo hua kyunke bunyaadi asraat aur SBP ki sakht maaliyaati policy ne asar daala. Tahum, GDP numa mutadil rahi aur Pakistan ki taareekhi rujhaan shar se kaafi neeche." },
    },
  ],
};
