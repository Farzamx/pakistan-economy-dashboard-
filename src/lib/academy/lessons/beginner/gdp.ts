import type { Lesson } from "@/lib/academy/types";

export const gdpLesson: Lesson = {
  slug: "gdp",
  category: "beginner",
  title: { en: "Gross Domestic Product (GDP)", ur: "مجموعی ملکی پیداوار (GDP)", rm: "Majmoo'i Mulki Paidawar (GDP)" },
  subtitle: {
    en: "The single number that tries to measure the size of an entire economy",
    ur: "وہ واحد عدد جو پوری معیشت کا حجم ناپنے کی کوشش کرتا ہے",
    rm: "Woh wahid adad jo poori maashiyat ka hajam naapne ki koshish karta hai",
  },
  level: "beginner",
  readMinutes: 9,
  isPremium: false,
  relatedIndicatorSlugs: ["pakistan-gdp-growth", "pakistan-gdp-per-capita"],
  relatedLessonSlugs: ["inflation", "policy-rate", "cpi"],
  content: {
    overview: {
      en: "GDP (Gross Domestic Product) measures the total value of all goods and services produced in a country during a year. It is the most widely used single indicator of economic size and health. This lesson explains what GDP is, how Pakistan calculates it, what growth really means, and why GDP alone does not tell the whole story.",
      ur: "GDP (مجموعی ملکی پیداوار) ایک سال میں کسی ملک میں تیار کی گئی تمام اشیاء اور خدمات کی کل قدر ماپتا ہے۔ یہ معاشی حجم اور صحت کا سب سے زیادہ استعمال ہونے والا واحد اشاریہ ہے۔",
      rm: "GDP (Majmoo'i Mulki Paidawar) ek saal mein kisi mulk mein tayyar ki gayi tamam cheezein aur khadamaat ki kul qemat mapata hai. Yeh maashi hajam aur sehat ka sab se zyada istemal hone wala wahid ashaariya hai.",
    },
    whyItMatters: {
      en: `GDP growth tells you whether an economy is expanding or contracting — and at what speed. When GDP grows faster than the population, per-capita income rises and living standards can improve. When GDP shrinks, jobs are lost, incomes fall, and governments collect less tax revenue.

For Pakistan, the difference between 3% and 6% GDP growth is enormous: at 3%, the economy barely keeps up with population growth (~2%); at 6%, real per-capita income doubles roughly every 12 years, lifting millions out of poverty.

Investors, central banks, and the IMF all track Pakistan's GDP closely. It determines the country's borrowing capacity, credit ratings, and the sustainability of its fiscal deficit.`,
      ur: `GDP نمو آپ کو بتاتی ہے کہ آیا معیشت پھیل رہی ہے یا سکڑ رہی ہے۔ جب GDP آبادی سے تیز بڑھتی ہے، فی کس آمدنی بڑھتی ہے۔ جب GDP سکڑتی ہے، روزگار کھو جاتے ہیں۔

پاکستان کے لیے، 3٪ اور 6٪ GDP نمو کے درمیان فرق بہت بڑا ہے: 3٪ پر، معیشت بمشکل آبادی کی نمو کے ساتھ چل پاتی ہے؛ 6٪ پر، حقیقی فی کس آمدنی تقریباً 12 سالوں میں دوگنی ہو جاتی ہے۔`,
      rm: `GDP numa aapko batati hai ke aaya maashiyat phail rahi hai ya sikar rahi hai. Jab GDP aabadi se tez barhti hai, fi kas aamdani barhti hai. Jab GDP sikurti hai, rozgaar kho jaate hain.

Pakistan ke liye, 3% aur 6% GDP numa ke darmiyan farq bahut bara hai: 3% par, maashiyat bamushkil aabadi ki numa ke saath chal paati hai; 6% par, haqeeqi fi kas aamdani taqreeban 12 saalon mein dogni ho jaati hai.`,
    },
    explanation: {
      en: `GDP is the total market value of all final goods and services produced within a country's borders in a year.

**The three ways to measure GDP:**
1. **Expenditure approach:** GDP = C + I + G + (X − M)
   - C = Consumer spending
   - I = Business investment
   - G = Government spending
   - X − M = Exports minus Imports (net exports)

2. **Income approach:** Sum of all incomes earned — wages, profits, rents, interest

3. **Production/Value-added approach:** Sum of value added at each stage of production (avoids double-counting)

**Nominal vs. Real GDP:**
Nominal GDP is measured in current prices. If prices rose 20% and production didn't change, nominal GDP rises 20% — misleading. *Real GDP* adjusts for inflation using a base year, showing the actual change in output.

**GDP growth rate:** The year-on-year percentage change in real GDP. Pakistan's GDP growth averaged ~4% in the 2010s before a series of shocks (COVID, energy crisis, floods, IMF program) pushed it negative in FY2023.

**Pakistan's GDP composition:**
- Services: ~60% (trade, transport, finance, government)
- Industry: ~20% (manufacturing, construction)
- Agriculture: ~20% (wheat, cotton, rice, sugarcane — highly weather-dependent)`,
      ur: `GDP ایک سال میں کسی ملک کی حدود میں تیار کی گئی تمام حتمی اشیاء اور خدمات کی کل بازاری قدر ہے۔

**GDP ماپنے کے تین طریقے:**
1. **اخراجات کا طریقہ:** GDP = C + I + G + (X − M)
   - C = صارفین کا خرچ، I = کاروباری سرمایہ کاری، G = حکومتی خرچ، X − M = برآمدات منفی درآمدات

2. **آمدنی کا طریقہ:** تمام آمدنیوں کا مجموعہ — اجرتیں، منافع، کرایہ، سود

3. **پیداوار/قدر اضافی کا طریقہ:** پیداوار کے ہر مرحلے پر اضافی قدر کا مجموعہ

**برائے نام بنام حقیقی GDP:**
برائے نام GDP موجودہ قیمتوں میں ماپی جاتی ہے۔ حقیقی GDP افراطِ زر کے لیے ایڈجسٹ کی جاتی ہے۔

**پاکستان کی GDP ساخت:**
- خدمات: تقریباً 60٪، صنعت: تقریباً 20٪، زراعت: تقریباً 20٪`,
      rm: `GDP ek saal mein kisi mulk ki hudood mein tayyar ki gayi tamam hattmi cheezein aur khadamaat ki kul baaziyanai qemat hai.

**GDP maapne ke teen tareeqe:**
1. **Ikhraajaat ka tareeqa:** GDP = C + I + G + (X − M)
   - C = Consumers ka kharch, I = Karobaari sarmaya kaari, G = Hukoomar kharch, X − M = Baraamdaat manus daraamdaat

2. **Aamdani ka tareeqa:** Tamam aamdaniyon ka majmoo'a — ujraten, munaafa, kiraya, sood

3. **Paidawar/Qemat izaafi ka tareeqa:** Paidawar ke har marhalay par izaafi qemat ka majmoo'a

**Pakistan ki GDP saakht:**
- Khadamaat: taqreeban 60%, Sana'at: taqreeban 20%, Ziraaat: taqreeban 20%`,
    },
    misconceptions: {
      en: `**Myth 1: Higher GDP means people are better off.**
GDP measures total output, not distribution. A country can have high GDP growth while inequality widens and the poor see no gains. Pakistan's top 20% capture a disproportionate share of income.

**Myth 2: GDP captures everything of value.**
Unpaid work (household labour, childcare), environmental damage, and natural resource depletion are not counted. A country that clears its forests raises its GDP while destroying wealth.

**Myth 3: Pakistan's GDP is "too small."**
Pakistan is the 5th most populous country but roughly 45th by GDP — pointing to a structural productivity gap, not just size. Per-capita GDP matters more than total GDP for living standards.

**Myth 4: Negative GDP growth = recession.**
Technically, a recession is *two consecutive quarters* of negative GDP growth. One bad quarter is a contraction but not a recession. Pakistan's FY2023 full-year GDP was slightly negative, making it a recession by some definitions.

**Myth 5: GDP growth = jobs.**
Not always. "Jobless growth" occurs when productivity gains replace workers. Pakistan's agriculture sector often shows this: output rises with better seeds and irrigation while agricultural employment stays flat.`,
      ur: `**غلط فہمی 1: زیادہ GDP کا مطلب لوگ بہتر ہیں۔**
GDP کل پیداوار ماپتا ہے، تقسیم نہیں۔

**غلط فہمی 2: GDP ہر قیمتی چیز شامل کرتا ہے۔**
غیر ادا شدہ کام، ماحولیاتی نقصان، اور قدرتی وسائل کی کمی شامل نہیں۔

**غلط فہمی 3: پاکستان کی GDP "بہت چھوٹی" ہے۔**
پاکستان 5ویں سب سے زیادہ آبادی والا ملک ہے لیکن GDP میں تقریباً 45ویں۔

**غلط فہمی 4: منفی GDP نمو = کساد بازاری۔**
تکنیکی طور پر کساد بازاری منفی GDP نمو کی *دو مسلسل سہ ماہیاں* ہیں۔

**غلط فہمی 5: GDP نمو = روزگار۔**
ہمیشہ نہیں۔ "روزگار کے بغیر نمو" اس وقت ہوتی ہے جب پیداواری صلاحیت میں اضافہ کارکنوں کی جگہ لے لیتا ہے۔`,
      rm: `**Ghalat fehmi 1: Zyada GDP ka matlab log behtar hain.**
GDP kul paidawar mapata hai, taqseem nahi.

**Ghalat fehmi 2: GDP har qeemati cheez shamil karta hai.**
Ghair ada shuda kaam, maaholiyaati nuqsaan, aur qudrati wasaa'il ki kami shamil nahi.

**Ghalat fehmi 3: Pakistan ki GDP "bahut choti" hai.**
Pakistan 5wan sab se zyada aabadi wala mulk hai lekin GDP mein taqreeban 45wan.

**Ghalat fehmi 4: Manfi GDP numa = Kasaad Baazaari.**
Takniki tor par kasaad baazaari manfi GDP numa ki *do musalsal seh maahiyan* hain.

**Ghalat fehmi 5: GDP numa = rozgaar.**
Hamesha nahi. "Rozgaar ke baghair numa" us waqt hoti hai jab paidawaari salahiyat mein izaafa kaarkuno ki jagah le leta hai.`,
    },
    pakistanExample: {
      en: `Pakistan's GDP told very different stories across the last few years:

**FY2021 (COVID recovery):** GDP grew ~5.7% — stronger than expected as agriculture bounced back and construction expanded.

**FY2022 (Pre-crisis peak):** GDP grew ~6.1% — one of the best readings in a decade, driven by consumer demand and imports. But the current account deficit exploded to $17 billion, planting the seeds of the crisis.

**FY2023 (Crisis year):** GDP contracted by ~0.2% — the first negative reading since the 1950s. Floods destroyed crops, the IMF program forced austerity, and businesses couldn't access imported inputs due to import restrictions.

**FY2024 (Stabilisation):** GDP recovered to ~2.4% growth. The IMF program restored macroeconomic stability, but growth remained below the population growth rate (~2%), meaning per-capita incomes fell in real terms.

**Pakistan's structural challenge:** Growth above 5% historically triggers a balance-of-payments crisis because the economy imports heavily when it grows (energy, machinery, raw materials) but doesn't export enough to pay for it. Breaking this cycle requires industrial export capacity — which is why economic reform is so difficult.`,
      ur: `پاکستان کی GDP نے گزشتہ چند سالوں میں بہت مختلف کہانیاں بیان کیں:

**مالی سال 2022 (بحران سے پہلے کی چوٹی):** GDP میں ~6.1٪ نمو — ایک دہائی میں بہترین۔ لیکن کرنٹ اکاؤنٹ خسارہ 17 بلین ڈالر پر پھٹ گیا۔

**مالی سال 2023 (بحران کا سال):** GDP ~0.2٪ سکڑی — 1950ء کی دہائی کے بعد پہلی منفی ریڈنگ۔

**پاکستان کا ڈھانچاگت چیلنج:** 5٪ سے زیادہ نمو تاریخی طور پر ادائیگیوں کا توازن بحران پیدا کرتی ہے کیونکہ معیشت بڑھنے پر زیادہ درآمد کرتی ہے لیکن اس کی ادائیگی کے لیے کافی برآمد نہیں کرتی۔`,
      rm: `Pakistan ki GDP ne guzashta chand saalon mein bahut mukhtalif kahaniyaan bayaan ki:

**Maali Saal 2022 (Bohran se pehle ki choti):** GDP mein ~6.1% numa — ek dahai mein behtareen. Lekin current account khassara 17 billion dollar par phat gaya.

**Maali Saal 2023 (Bohran ka saal):** GDP ~0.2% sikurti — 1950 ki dahai ke baad pehli manfi reading.

**Pakistan ka dhaanchaagat challenge:** 5% se zyada numa taarikhi tor par adaaigiyon ka tawazun bohran paida karti hai kyunke maashiyat barhne par zyada daraamad karti hai lekin is ki adaaigi ke liye kaafi baraamdaat nahi.`,
    },
    realWorld: {
      en: `**China's GDP miracle:** China grew at ~10% per year for over 30 years — one of the fastest sustained expansions in history. This was driven by manufacturing exports, massive infrastructure investment, and urbanisation. China moved 800 million people out of poverty, demonstrating how sustained GDP growth can transform living standards.

**The GDP vs. wellbeing debate:** After the 2008 financial crisis, France commissioned the Stiglitz-Sen-Fitoussi report, which proposed supplementing GDP with broader wellbeing measures (health, education, inequality, environment). Bhutan famously uses "Gross National Happiness" instead. The point: GDP is indispensable but incomplete.

**India's leap:** India overtook the UK to become the world's 5th largest economy by nominal GDP in 2022, driven by IT services, manufacturing growth, and a young population. For Pakistan, India's IT export success ($250 billion+ industry) is a benchmark for the structural transformation that could help Pakistan escape its balance-of-payments trap.`,
      ur: `**چین کا GDP معجزہ:** چین نے 30 سال سے زیادہ عرصے تک سالانہ تقریباً 10٪ نمو کی — تاریخ کی تیز ترین مستقل توسیع میں سے ایک۔ چین نے 80 کروڑ لوگوں کو غربت سے نکالا۔

**GDP بنام خوشحالی بحث:** 2008 کے مالی بحران کے بعد، فرانس نے اسٹگلٹز-سین-فِٹوسی رپورٹ کا حکم دیا، جس نے GDP کو وسیع تر بہبود کے اقدامات سے ضم کرنے کی تجویز دی۔

**بھارت کی چھلانگ:** بھارت نے 2022 میں برطانیہ کو پیچھے چھوڑ کر دنیا کی پانچویں بڑی معیشت بن گئی۔`,
      rm: `**China ka GDP mujzah:** China ne 30 saal se zyada arse tak saalana taqreeban 10% numa ki. China ne 80 crore logon ko ghurbat se nikala.

**GDP banam khushhaali bahas:** 2008 ke maali bohran ke baad, France ne Stiglitz-Sen-Fitoussi report ka hukam diya, jis ne GDP ko wasee tar behbood ke iqdaamaat se zariya karne ki tajweez di.

**Bharat ki chhalaang:** Bharat ne 2022 mein Britain ko peechhe chhor kar duniya ki panchwin bari maashiyat ban gayi.`,
    },
    summary: {
      en: `**Key takeaways:**
• GDP = total value of goods and services produced in a country in a year
• Three measurement approaches: expenditure (C+I+G+NX), income, production
• Real GDP adjusts for inflation; always compare real, not nominal, growth
• Pakistan's GDP: ~60% services, ~20% industry, ~20% agriculture
• Growth above 5% historically triggers Pakistan's balance-of-payments crisis — a structural trap
• FY2023: GDP contracted ~0.2%, the first negative reading since the 1950s
• GDP is essential but incomplete: doesn't capture inequality, environment, or unpaid work`,
      ur: `**اہم نکات:**
• GDP = ایک ملک میں ایک سال میں تیار کردہ اشیاء اور خدمات کی کل قدر
• تین پیمائش کے طریقے: اخراجات (C+I+G+NX)، آمدنی، پیداوار
• حقیقی GDP افراطِ زر کے لیے ایڈجسٹ کی جاتی ہے؛ ہمیشہ حقیقی، نہ کہ برائے نام نمو کا موازنہ کریں
• پاکستان کی GDP: تقریباً 60٪ خدمات، 20٪ صنعت، 20٪ زراعت
• مالی سال 2023: GDP تقریباً 0.2٪ سکڑی — 1950ء کی دہائی کے بعد پہلی منفی ریڈنگ`,
      rm: `**Aham nuktaat:**
• GDP = ek mulk mein ek saal mein tayyar karda cheezein aur khadamaat ki kul qemat
• Teen paimaaish ke tareeqe: ikhraajaat (C+I+G+NX), aamdani, paidawar
• Haqeeqi GDP inflation ke liye adjust ki jaati hai; hamesha haqeeqi, na ke baraey naam, numa ka muwaazina karein
• Pakistan ki GDP: taqreeban 60% khadamaat, 20% sana'at, 20% ziraaat
• Maali Saal 2023: GDP taqreeban 0.2% sikurti — 1950 ki dahai ke baad pehli manfi reading`,
    },
  },
  quiz: [
    {
      question: {
        en: "In the expenditure approach to GDP, what does the 'I' stand for?",
        ur: "GDP کے اخراجات کے طریقے میں، 'I' کا مطلب کیا ہے؟",
        rm: "GDP ke ikhraajaat ke tareeqe mein, 'I' ka matlab kya hai?",
      },
      options: [
        { en: "Imports", ur: "درآمدات", rm: "Daraamdaat" },
        { en: "Income", ur: "آمدنی", rm: "Aamdani" },
        { en: "Business Investment", ur: "کاروباری سرمایہ کاری", rm: "Karobaari Sarmaya Kaari" },
        { en: "Interest payments", ur: "سود کی ادائیگیاں", rm: "Sood ki Adaaigiyan" },
      ],
      correctIndex: 2,
      explanation: {
        en: "In GDP = C + I + G + (X − M), 'I' stands for gross business investment — spending by firms on new equipment, buildings, and software. Imports are in the (X − M) term.",
        ur: "GDP = C + I + G + (X − M) میں، 'I' سے مراد مجموعی کاروباری سرمایہ کاری ہے — نئے آلات، عمارات اور سافٹ ویئر پر اداروں کا خرچ۔ درآمدات (X − M) کی اصطلاح میں ہیں۔",
        rm: "GDP = C + I + G + (X − M) mein, 'I' se muraad majmoo'i karobaari sarmaya kaari hai — naye aalaat, imaarat aur software par idaron ka kharch. Daraamdaat (X − M) ki istilaah mein hain.",
      },
    },
    {
      question: {
        en: "Why is Real GDP more useful than Nominal GDP for comparing growth across years?",
        ur: "سالوں میں نمو کا موازنہ کرنے کے لیے حقیقی GDP برائے نام GDP سے زیادہ مفید کیوں ہے؟",
        rm: "Saalon mein numa ka muwaazina karne ke liye haqeeqi GDP baraey naam GDP se zyada mufeed kyun hai?",
      },
      options: [
        { en: "Real GDP is always higher", ur: "حقیقی GDP ہمیشہ زیادہ ہوتی ہے", rm: "Haqeeqi GDP hamesha zyada hoti hai" },
        { en: "Real GDP removes the effect of price changes", ur: "حقیقی GDP قیمتوں میں تبدیلی کا اثر ختم کرتی ہے", rm: "Haqeeqi GDP qeematon mein tabdeeli ka asar khatam karti hai" },
        { en: "Nominal GDP ignores services", ur: "برائے نام GDP خدمات کو نظرانداز کرتا ہے", rm: "Baraey naam GDP khadamaat ko nazarandaaz karta hai" },
        { en: "Real GDP counts government spending twice", ur: "حقیقی GDP حکومتی خرچ دو بار شمار کرتی ہے", rm: "Haqeeqi GDP hukoomati kharch do baar shumaar karti hai" },
      ],
      correctIndex: 1,
      explanation: {
        en: "Real GDP is adjusted for inflation using a base year, so it reflects actual changes in output volume. Nominal GDP can rise purely because prices rose, not because production grew.",
        ur: "حقیقی GDP ایک بنیادی سال استعمال کرتے ہوئے افراطِ زر کے لیے ایڈجسٹ کی جاتی ہے، لہذا یہ پیداوار کے حجم میں حقیقی تبدیلیاں ظاہر کرتی ہے۔",
        rm: "Haqeeqi GDP ek bunyaadi saal istemal karte hue inflation ke liye adjust ki jaati hai, is liye yeh paidawar ke hajam mein haqeeqi tabdeeliyan zahir karti hai.",
      },
    },
    {
      question: {
        en: "Approximately what share of Pakistan's GDP comes from the services sector?",
        ur: "پاکستان کی GDP کا تقریباً کتنا حصہ خدمات کے شعبے سے آتا ہے؟",
        rm: "Pakistan ki GDP ka taqreeban kitna hissa khadamaat ke sho'bay se aata hai?",
      },
      options: [
        { en: "20%", ur: "20٪", rm: "20%" },
        { en: "40%", ur: "40٪", rm: "40%" },
        { en: "~60%", ur: "تقریباً 60٪", rm: "Taqreeban 60%" },
        { en: "80%", ur: "80٪", rm: "80%" },
      ],
      correctIndex: 2,
      explanation: {
        en: "Pakistan's services sector (trade, transport, finance, government) accounts for roughly 60% of GDP. Industry and agriculture each account for ~20%.",
        ur: "پاکستان کا خدمات کا شعبہ (تجارت، نقل و حمل، مالیات، حکومت) GDP کا تقریباً 60٪ ہے۔ صنعت اور زراعت ہر ایک تقریباً 20٪ ہے۔",
        rm: "Pakistan ka khadamaat ka sho'ba (tijaarat, naql-o-hamal, maaliyaat, hukoomat) GDP ka taqreeban 60% hai. Sana'at aur ziraaat har ek taqreeban 20% hai.",
      },
    },
    {
      question: {
        en: "Pakistan's GDP contracted (went negative) in which fiscal year?",
        ur: "پاکستان کی GDP کس مالی سال میں منفی ہوئی؟",
        rm: "Pakistan ki GDP kis maali saal mein manfi hui?",
      },
      options: [
        { en: "FY2020", ur: "مالی سال 2020", rm: "Maali Saal 2020" },
        { en: "FY2021", ur: "مالی سال 2021", rm: "Maali Saal 2021" },
        { en: "FY2022", ur: "مالی سال 2022", rm: "Maali Saal 2022" },
        { en: "FY2023", ur: "مالی سال 2023", rm: "Maali Saal 2023" },
      ],
      correctIndex: 3,
      explanation: {
        en: "Pakistan's GDP contracted by ~0.2% in FY2023 — the first negative reading since the 1950s — due to devastating floods, IMF-mandated austerity, and import restrictions that starved factories of inputs.",
        ur: "پاکستان کی GDP مالی سال 2023 میں تقریباً 0.2٪ سکڑی — 1950ء کی دہائی کے بعد پہلی منفی ریڈنگ — تباہ کن سیلاب، IMF کے حکم سے کفایت شعاری، اور درآمدی پابندیوں کی وجہ سے۔",
        rm: "Pakistan ki GDP Maali Saal 2023 mein taqreeban 0.2% sikurti — 1950 ki dahai ke baad pehli manfi reading — tabah kun sailaab, IMF ke hukam se kifaayat sha'aari, aur daraamdi paabandiyoon ki wajah se.",
      },
    },
  ],
  faq: [
    {
      question: {
        en: "What is the difference between GDP and GNP?",
        ur: "GDP اور GNP میں کیا فرق ہے؟",
        rm: "GDP aur GNP mein kya farq hai?",
      },
      answer: {
        en: "GDP measures output produced *within* a country's borders, regardless of who produces it. GNP (Gross National Product) measures output produced *by* a country's residents, wherever they are located. For Pakistan, GNP is higher than GDP because Pakistani workers abroad (especially in the Gulf) send remittances home — their income is counted in Pakistan's GNP but not in GDP (which only counts what is produced in Pakistan).",
        ur: "GDP ایک ملک کی حدود *کے اندر* پیدا کردہ پیداوار ماپتا ہے۔ GNP ایک ملک کے باشندوں *کی طرف سے* پیدا کردہ پیداوار ماپتا ہے۔ پاکستان کے لیے، GNP GDP سے زیادہ ہے کیونکہ بیرون ملک پاکستانی کارکنان ترسیلات بھیجتے ہیں۔",
        rm: "GDP ek mulk ki hudood *ke andar* paida karda paidawar mapata hai. GNP ek mulk ke baashindoon *ki taraf se* paida karda paidawar mapata hai. Pakistan ke liye, GNP GDP se zyada hai kyunke baeron mulk Pakistani kaarkun taraselaat bhejte hain.",
      },
    },
    {
      question: {
        en: "Why does strong GDP growth sometimes worsen Pakistan's balance of payments?",
        ur: "مضبوط GDP نمو کبھی کبھی پاکستان کے ادائیگیوں کے توازن کو خراب کیوں کرتی ہے؟",
        rm: "Mazboot GDP numa kabhi kabhi Pakistan ke adaaigiyon ke tawazun ko kharaab kyun karti hai?",
      },
      answer: {
        en: "Pakistan's economy is import-intensive: when growth accelerates, businesses and consumers import more energy, machinery, raw materials, and consumer goods. But Pakistan's export base is narrow (mostly textiles), so export revenues don't grow as fast as imports. The trade and current account deficits widen, requiring foreign borrowing to finance them. This is Pakistan's structural growth trap — which can only be resolved by building a diversified, high-value export sector.",
        ur: "پاکستان کی معیشت درآمد پر زیادہ انحصار کرتی ہے: جب نمو تیز ہوتی ہے، کاروبار اور صارفین زیادہ توانائی، مشینری، خام مال درآمد کرتے ہیں۔ لیکن پاکستان کی برآمدی بنیاد تنگ ہے (زیادہ تر ٹیکسٹائل)۔",
        rm: "Pakistan ki maashiyat daraamad par zyada inhisaar karti hai: jab numa tez hoti hai, karobaar aur consumers zyada energy, mashinary, kham maal daraamd karte hain. Lekin Pakistan ki baraaamdi bunyaad tang hai (zyada tar textile).",
      },
    },
  ],
};
