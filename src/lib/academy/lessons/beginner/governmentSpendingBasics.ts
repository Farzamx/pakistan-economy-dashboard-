import type { Lesson } from "@/lib/academy/types";

export const governmentSpendingBasicsLesson: Lesson = {
  slug: "government-spending-basics",
  category: "beginner",
  title: { en: "Government Spending: Where Public Money Goes", ur: "حکومتی اخراجات: عوامی پیسہ کہاں جاتا ہے", rm: "Hukomaati Ikhraajahat: Awami Paisa Kahan Jaata Hai" },
  subtitle: {
    en: "How government budgets work, what Pakistan spends money on, and why debt servicing crowds out everything else",
    ur: "حکومتی بجٹ کیسے کام کرتے ہیں، پاکستان پیسہ کہاں خرچ کرتا ہے، اور قرضے کی خدمت باقی سب کیوں نکال دیتی ہے",
    rm: "Hukomaati budget kaise kaam karte hain, Pakistan paisa kahan kharch karta hai, aur qarzay ki khidmat baqi sab kyun nikaal deti hai",
  },
  level: "beginner",
  readMinutes: 7,
  isPremium: false,
  relatedIndicatorSlugs: ["fiscal-deficit-pakistan", "government-debt-pakistan"],
  relatedLessonSlugs: ["taxes-intro", "fiscal-vs-monetary", "pakistan-fiscal-deficit"],
  content: {
    overview: {
      en: "Government spending is how the state allocates resources across the economy — paying for defence, education, health, infrastructure, subsidies, and debt interest. In Pakistan, the federal government spends around Rs 14-18 trillion annually. The problem: it only collects Rs 9-10 trillion in taxes. The Rs 5-8 trillion gap is financed by debt — making debt servicing Pakistan's single largest expenditure item, consuming over 50% of revenue.",
      ur: "حکومتی اخراجات یہ ہے کہ ریاست معیشت میں وسائل کیسے تقسیم کرتی ہے — دفاع، تعلیم، صحت، بنیادی ڈھانچہ، سبسڈی اور قرضے کا سود ادا کرنا۔ پاکستان میں، وفاقی حکومت سالانہ تقریباً 14-18 ٹریلین روپے خرچ کرتی ہے لیکن صرف 9-10 ٹریلین جمع کرتی ہے۔",
      rm: "Hukomaati ikhraajahat yeh hai ke riyaasat muaashat mein wasail kaise taqseem karti hai — difaa, taaleem, sehat, bunyaadi dhaancha, subsidy aur qarzay ka sood ada karna. Pakistan mein, wafaaqi hukoomat saalaana taqreeban 14-18 trillion rupay kharch karti hai lekin sirf 9-10 trillion jama karti hai.",
    },
    whyItMatters: {
      en: "Government spending choices determine what kind of society Pakistan becomes. A government that spends 50% on debt interest has little left for schools, hospitals, or roads. Pakistan's public education spending (~1.7% of GDP) and health spending (~1.2% of GDP) are among the world's lowest — a direct consequence of the fiscal squeeze. When debt crowds out development, the poorest suffer most.",
      ur: "حکومتی اخراجات کے انتخاب طے کرتے ہیں کہ پاکستان کیسا معاشرہ بنتا ہے۔ جو حکومت 50% قرضے کے سود پر خرچ کرتی ہے اس کے پاس اسکولوں، ہسپتالوں، یا سڑکوں کے لیے کم بچتا ہے۔",
      rm: "Hukomaati ikhraajahat ke intikhab tay karte hain ke Pakistan kaisa muaashara banta hai. Jo hukoomat 50% qarzay ke sood par kharch karti hai us ke paas iskoolon, haspraalon, ya sardoon ke liye kam bachta hai.",
    },
    explanation: {
      en: `**Pakistan's federal budget spending breakdown (approximate):**

- **Debt servicing (interest payments):** ~40-50% of federal expenditure — Pakistan's single largest item, paid on domestic (PIBs, T-bills) and foreign debt
- **Defence:** ~15-18% of federal expenditure
- **Provincial transfers:** ~20-25% under the National Finance Commission (NFC) Award — shared with provinces
- **Development (PSDP):** ~5-10% — infrastructure, dams, roads, social programmes
- **Civil service salaries and pensions:** ~10%
- **Subsidies:** energy, fertiliser, and food subsidies

**The debt trap:** High debt → high interest payments → fiscal deficit → more borrowing → more debt → higher interest → repeat. Pakistan's total public debt is now over 75% of GDP. The interest bill alone is larger than the entire education + health + PSDP budget combined.

**Fiscal deficit = revenues − expenditures.** When negative (spending > revenue), it adds to debt. Pakistan's fiscal deficit has averaged 6-8% of GDP in recent years — well above the IMF's recommended 3%.`,
      ur: `**پاکستان کے وفاقی بجٹ اخراجات کی تقسیم (تقریباً):**

- **قرضے کی خدمت:** ~40-50% وفاقی اخراجات — سب سے بڑا مد
- **دفاع:** ~15-18%
- **صوبائی منتقلی:** NFC ایوارڈ کے تحت ~20-25%
- **ترقی (PSDP):** ~5-10%
- **سول سروس تنخواہیں اور پنشن:** ~10%
- **سبسڈیز:** توانائی، کھاد، خوراک

**قرض کا جال:** زیادہ قرض → زیادہ سود → مالی خسارہ → زیادہ قرض → دہرائیں۔`,
      rm: `**Pakistan ke wafaaqi budget ikhraajahat ki taqseem (taqreeban):**

- **Qarzay ki khidmat:** ~40-50% wafaaqi ikhraajahat — sab se bara mad
- **Difaa:** ~15-18%
- **Subaai muntaqili:** NFC award ke tahat ~20-25%
- **Taraqqi (PSDP):** ~5-10%
- **Civil service tankhaahein aur pension:** ~10%
- **Subsidies:** tawanaayi, khaad, khuuraak

**Qarz ka jaal:** Zyada qarz → zyada sood → maali khisaara → zyada qarz → dohraaein.`,
    },
    misconceptions: {
      en: `**Myth 1: More government spending always helps the economy.** Productive spending (infrastructure, education) raises long-term output. But wasteful spending (bloated bureaucracy, poorly targeted subsidies) can crowd out private investment and fuel inflation without adding real value.

**Myth 2: Defence spending is wasteful.** Defence provides security — which allows economic activity to happen. But Pakistan's defence spending (as % of GDP) is far higher than comparable economies, crowding out social investment.

**Myth 3: Pakistan can always borrow more.** Debt has limits. Once debt-to-GDP passes ~80-90%, markets and lenders demand higher interest rates, and roll-over risk becomes severe. Pakistan is approaching these limits, explaining the recurring IMF crises.`,
      ur: `**غلط فہمی 1: زیادہ حکومتی اخراجات ہمیشہ معیشت میں مدد کرتے ہیں۔** نتیجہ خیز اخراجات طویل مدتی پیداوار بڑھاتے ہیں۔ لیکن فضول اخراجات نجی سرمایہ کاری ہٹا سکتے ہیں۔

**غلط فہمی 2: دفاعی اخراجات فضول ہیں۔** دفاع سلامتی فراہم کرتا ہے۔ لیکن پاکستان کے دفاعی اخراجات سماجی سرمایہ کاری کو محدود کرتے ہیں۔

**غلط فہمی 3: پاکستان ہمیشہ زیادہ قرض لے سکتا ہے۔** قرض کی حد ہوتی ہے۔ پاکستان ان حدود کے قریب ہے۔`,
      rm: `**Ghalat fehmi 1: Zyada hukomaati ikhraajahat hamesha muaashat mein madad karte hain.** Nateeja khaiz ikhraajahat taweel muddat paidawar barhate hain. Lekin fazool ikhraajahat naaji sarmaaya kaari hata sakte hain.

**Ghalat fehmi 2: Difaai ikhraajahat fazool hain.** Difaa salaamati faraahim karta hai. Lekin Pakistan ke difaai ikhraajahat samaji sarmaaya kaari ko mahdood karte hain.

**Ghalat fehmi 3: Pakistan hamesha zyada qarz le sakta hai.** Qarz ki hadd hoti hai. Pakistan in hududdon ke qareeb hai.`,
    },
    pakistanExample: {
      en: `**Pakistan FY2024 budget reality:** In FY2024, the federal government allocated approximately: Rs 7.3 trillion for debt interest payments (the single largest item), ~Rs 1.8 trillion for defence, ~Rs 1.4 trillion for PSDP (development), and the rest for administration, subsidies, and grants. Education and health barely register at the federal level — most social spending is devolved to provinces, which also face fiscal constraints. The crushing debt servicing is why Pakistan cannot escape the IMF cycle without structural fiscal reform.`,
      ur: `**پاکستان FY2024 بجٹ کی حقیقت:** FY2024 میں وفاقی حکومت نے تقریباً مختص کیا: قرضے کے سود کی ادائیگی کے لیے 7.3 ٹریلین روپے (سب سے بڑا مد)، ~1.8 ٹریلین روپے دفاع، ~1.4 ٹریلین روپے PSDP۔ تعلیم اور صحت وفاقی سطح پر شاید ہی نظر آتی ہیں — زیادہ تر سماجی اخراجات صوبوں کو دیے گئے ہیں۔`,
      rm: `**Pakistan FY2024 budget ki haqeeqat:** FY2024 mein wafaaqi hukoomat ne taqreeban mukhtas kiya: qarzay ke sood ki adaaigi ke liye 7.3 trillion rupay (sab se bara mad), ~1.8 trillion rupay difaa, ~1.4 trillion rupay PSDP. Taaleem aur sehat wafaaqi satah par shayad hi nazar aati hain — zyada tar samaji ikhraajahat subaon ko diye gaye hain.`,
    },
    realWorld: {
      en: "Japan has the world's highest government debt-to-GDP ratio (~260%) yet hasn't faced a debt crisis — because its debt is almost entirely owed to domestic savers (Japanese citizens buying government bonds) in yen. Pakistan's situation is different: significant external debt in foreign currency, low domestic savings, and high current account deficits make its debt much riskier. Debt sustainability depends on who holds it and in what currency — not just the total amount.",
      ur: "جاپان میں دنیا کی سب سے اونچی حکومتی قرض سے GDP تناسب (~260%) ہے لیکن قرض کا بحران نہیں آیا — کیونکہ اس کا قرض تقریباً مکمل طور پر گھریلو بچت کنندگان کا ہے۔ پاکستان کی صورتحال مختلف ہے: غیر ملکی کرنسی میں اہم بیرونی قرض۔",
      rm: "Japan mein duniya ki sab se oonchi hukomaati qarz se GDP tanaasub (~260%) hai lekin qarz ka bohran nahi aaya — kyunke is ka qarz taqreeban mukammal tor par ghareluu bachat kunandagaan ka hai. Pakistan ki soorathaal mukhtalif hai: ghair mulki currency mein ahem baeruni qarz.",
    },
    summary: {
      en: "• Pakistan federal spending ~Rs 14-18 trillion/year vs ~Rs 9-10 trillion revenue\n• Largest expenditure: debt servicing (40-50% of revenue)\n• Defence: ~15-18%; Development (PSDP): ~5-10%\n• Low education and health spending = direct cost of the debt burden\n• Fiscal deficit: spending exceeds revenue → adds to debt\n• Pakistan's debt trap: high debt → high interest → deficit → more debt",
      ur: "• پاکستان وفاقی اخراجات ~14-18 ٹریلین روپے/سال بمقابلہ ~9-10 ٹریلین آمدنی\n• سب سے بڑا اخراجات: قرضے کی خدمت (آمدنی کا 40-50%)\n• دفاع: ~15-18%؛ ترقی (PSDP): ~5-10%\n• کم تعلیم اور صحت اخراجات = قرض کے بوجھ کی براہ راست قیمت\n• مالی خسارہ: اخراجات آمدنی سے زیادہ → قرض بڑھتا ہے",
      rm: "• Pakistan wafaaqi ikhraajahat ~Rs 14-18 trillion/saal bamuqaabla ~Rs 9-10 trillion aamdani\n• Sab se bara ikhraajahat: qarzay ki khidmat (aamdani ka 40-50%)\n• Difaa: ~15-18%; Taraqqi (PSDP): ~5-10%\n• Kam taaleem aur sehat ikhraajahat = qarz ke bojh ki baraah-e-raast qeemat\n• Maali khisaara: ikhraajahat aamdani se zyada → qarz barhta hai",
    },
  },
  quiz: [
    {
      question: { en: "What is Pakistan's single largest federal expenditure item?", ur: "پاکستان کا سب سے بڑا وفاقی اخراجات کا مد کیا ہے؟", rm: "Pakistan ka sab se bara wafaaqi ikhraajahat ka mad kya hai?" },
      options: [
        { en: "Education spending", ur: "تعلیمی اخراجات", rm: "Taaleemi ikhraajahat" },
        { en: "Defence budget", ur: "دفاعی بجٹ", rm: "Difaai budget" },
        { en: "Debt servicing (interest payments)", ur: "قرضے کی خدمت (سود کی ادائیگی)", rm: "Qarzay ki khidmat (sood ki adaaigi)" },
        { en: "Infrastructure development", ur: "بنیادی ڈھانچے کی ترقی", rm: "Bunyaadi dhaanche ki taraqqi" },
      ],
      correctIndex: 2,
      explanation: { en: "Pakistan spends over Rs 7 trillion annually on debt interest payments — more than 40% of tax revenue. This crowds out spending on education, health, and development.", ur: "پاکستان سالانہ قرضے کے سود پر 7 ٹریلین روپے سے زیادہ خرچ کرتا ہے — ٹیکس آمدنی کا 40% سے زیادہ۔ یہ تعلیم، صحت اور ترقی پر اخراجات ہٹا دیتا ہے۔", rm: "Pakistan saalaana qarzay ke sood par 7 trillion rupay se zyada kharch karta hai — tax aamdani ka 40% se zyada. Yeh taaleem, sehat aur taraqqi par ikhraajahat hata deta hai." },
    },
    {
      question: { en: "Pakistan collects Rs 9 trillion in taxes but spends Rs 14 trillion. What is the Rs 5 trillion gap called?", ur: "پاکستان ٹیکس میں 9 ٹریلین روپے جمع کرتا ہے لیکن 14 ٹریلین روپے خرچ کرتا ہے۔ 5 ٹریلین روپے کے فرق کو کیا کہتے ہیں؟", rm: "Pakistan tax mein 9 trillion rupay jama karta hai lekin 14 trillion rupay kharch karta hai. 5 trillion rupay ke farq ko kya kehte hain?" },
      options: [
        { en: "Trade deficit", ur: "تجارتی خسارہ", rm: "Tijarati khisaara" },
        { en: "Fiscal deficit", ur: "مالی خسارہ", rm: "Maali khisaara" },
        { en: "Current account surplus", ur: "جاری کھاتے کا فاضل", rm: "Jaari khaate ka faazil" },
        { en: "Revenue shortfall tax", ur: "آمدنی کمی ٹیکس", rm: "Aamdani kami tax" },
      ],
      correctIndex: 1,
      explanation: { en: "The fiscal deficit is the gap between government revenues and expenditures. Pakistan's fiscal deficit must be financed by borrowing — adding to national debt.", ur: "مالی خسارہ حکومتی آمدنی اور اخراجات کے درمیان فرق ہے۔ پاکستان کا مالی خسارہ قرض لینے سے پورا کرنا پڑتا ہے — قومی قرض بڑھاتا ہے۔", rm: "Maali khisaara hukomaati aamdani aur ikhraajahat ke darmiyan farq hai. Pakistan ka maali khisaara qarz lene se poora karna parta hai — qoumi qarz barhata hai." },
    },
    {
      question: { en: "Why is Pakistan's education spending so low despite being a priority?", ur: "ترجیح ہونے کے باوجود پاکستان کی تعلیمی اخراجات اتنی کم کیوں ہے؟", rm: "Tarjeeh hone ke baawajood Pakistan ki taaleemi ikhraajahat itni kam kyun hai?" },
      options: [
        { en: "Education is not valued in Pakistan", ur: "پاکستان میں تعلیم کی قدر نہیں", rm: "Pakistan mein taaleem ki qadar nahi" },
        { en: "Debt servicing consumes most revenue, leaving little for development", ur: "قرضے کی خدمت زیادہ تر آمدنی جذب کر لیتی ہے، ترقی کے لیے کم بچتا ہے", rm: "Qarzay ki khidmat zyada tar aamdani jazab kar leti hai, taraqqi ke liye kam bachta hai" },
        { en: "The IMF prohibits education spending", ur: "IMF تعلیمی اخراجات سے منع کرتا ہے", rm: "IMF taaleemi ikhraajahat se mana karta hai" },
        { en: "Education is funded entirely by provincial governments", ur: "تعلیم مکمل طور پر صوبائی حکومتوں کی طرف سے فنڈ ہے", rm: "Taaleem mukammal tor par subaai hukoomaton ki taraf se fund hai" },
      ],
      correctIndex: 1,
      explanation: { en: "With over Rs 7 trillion committed to debt interest payments, Pakistan's fiscal space for education, health, and development is severely constrained. This is the direct human cost of accumulated debt.", ur: "قرضے کے سود کی ادائیگی میں 7 ٹریلین روپے سے زیادہ مختص ہونے کے ساتھ، پاکستان کی تعلیم، صحت اور ترقی کے لیے مالی گنجائش بہت محدود ہے۔", rm: "Qarzay ke sood ki adaaigi mein 7 trillion rupay se zyada mukhtas hone ke saath, Pakistan ki taaleem, sehat aur taraqqi ke liye maali gunjaish bahut mahdood hai." },
    },
    {
      question: { en: "What happens when a government consistently spends more than it earns (fiscal deficit)?", ur: "جب حکومت مسلسل کماتی سے زیادہ خرچ کرتی ہے (مالی خسارہ)، تو کیا ہوتا ہے؟", rm: "Jab hukoomat musalsal kamati se zyada kharch karti hai (maali khisaara), toh kya hota hai?" },
      options: [
        { en: "The economy automatically balances itself", ur: "معیشت خودبخود خود کو متوازن کرتی ہے", rm: "Muaashat khud-ba-khud khud ko mutawazin karti hai" },
        { en: "Government debt increases, raising future interest payments", ur: "حکومتی قرض بڑھتا ہے، مستقبل میں سود کی ادائیگی بڑھتی ہے", rm: "Hukomaati qarz barhta hai, mustaqbil mein sood ki adaaigi barhti hai" },
        { en: "Taxes automatically rise to cover the gap", ur: "ٹیکس خودبخود بڑھتے ہیں خلاء پورا کرنے کے لیے", rm: "Tax khud-ba-khud barhte hain khalaao poora karne ke liye" },
        { en: "Nothing — deficits don't matter", ur: "کچھ نہیں — خساروں سے فرق نہیں پڑتا", rm: "Kuch nahi — khisaaron se farq nahi parta" },
      ],
      correctIndex: 1,
      explanation: { en: "Each year's deficit adds to accumulated debt. More debt means more interest payments next year, which increases the deficit, which adds more debt — a compounding debt trap that is very difficult to escape.", ur: "ہر سال کا خسارہ جمع شدہ قرض میں اضافہ کرتا ہے۔ زیادہ قرض کا مطلب اگلے سال زیادہ سود کی ادائیگی، جو خسارہ بڑھاتا ہے، جو مزید قرض شامل کرتا ہے۔", rm: "Har saal ka khisaara jama shuda qarz mein izaafa karta hai. Zyada qarz ka matlab agli saal zyada sood ki adaaigi, jo khisaara barhata hai, jo mazeed qarz shaamil karta hai." },
    },
  ],
  faq: [
    {
      question: { en: "What is Pakistan's PSDP and why does it keep getting cut?", ur: "پاکستان کا PSDP کیا ہے اور اسے بار بار کیوں کاٹا جاتا ہے؟", rm: "Pakistan ka PSDP kya hai aur ise baar baar kyun kaata jaata hai?" },
      answer: { en: "PSDP (Public Sector Development Programme) is Pakistan's annual federal development budget — for dams, motorways, hospitals, universities, and social programs. It's typically Rs 900 billion–1.5 trillion. But whenever Pakistan faces a fiscal squeeze (IMF conditions, revenue shortfall), PSDP is the first item cut because it's 'non-essential' and contracts can be paused. Defence, debt servicing, and salaries are politically harder to cut. This procyclical cutting of development spending worsens long-term growth.", ur: "PSDP (پبلک سیکٹر ڈیولپمنٹ پروگرام) پاکستان کا سالانہ وفاقی ترقیاتی بجٹ ہے — بندوں، موٹرویز، ہسپتالوں، یونیورسٹیوں کے لیے۔ یہ عام طور پر 900 ارب–1.5 ٹریلین روپے ہے۔ لیکن جب بھی مالی سختی ہو، PSDP پہلا کٹنے والا مد ہے۔", rm: "PSDP Pakistan ka saalaana wafaaqi taraqqi budget hai — bandon, motorways, haspraalon, universities ke liye. Yeh aam tor par 900 arab–1.5 trillion rupay hai. Lekin jab bhi maali sakht aaye, PSDP pehla katne wala mad hai." },
    },
  ],
};
