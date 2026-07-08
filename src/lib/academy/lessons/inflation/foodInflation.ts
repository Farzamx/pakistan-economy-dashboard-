import type { Lesson } from "@/lib/academy/types";

export const foodInflationLesson: Lesson = {
  slug: "food-inflation",
  category: "inflation",
  title: { en: "Food Inflation: Why Groceries Hurt Most", ur: "خوراک افراط زر: گروسری سب سے زیادہ کیوں تکلیف دیتی ہے", rm: "Khuraak Inflation: Grocery Sab Se Zyada Kyun Takleef Deti Hai" },
  subtitle: {
    en: "Why food prices are the most visible and politically explosive component of inflation in Pakistan",
    ur: "خوراک کی قیمتیں پاکستان میں افراط زر کا سب سے واضح اور سیاسی طور پر دھماکہ خیز جزو کیوں ہیں",
    rm: "Khuraak ki qeematen Pakistan mein inflation ka sab se waazeh aur siyaasi tor par dhamaka-khez juzu kyun hain",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan", "spi-weekly"],
  relatedLessonSlugs: ["cost-push", "types-of-inflation", "spi-weekly"],
  content: {
    overview: {
      en: "Food inflation measures how fast the prices of food items — wheat, vegetables, meat, cooking oil, pulses — are rising. In Pakistan, food carries a huge weight (~34.6%) in the CPI basket because poor and middle-income households spend a disproportionate share of their income on food. This makes food inflation the most politically sensitive economic indicator — a 20% rise in the overall CPI feels abstract, but a 50% rise in the price of onions or wheat flour is felt immediately and viscerally by every household, especially poorer ones who spend 50%+ of income on food.",
      ur: "خوراک افراط زر یہ ناپتا ہے کہ خوراک کی اشیاء — گندم، سبزیاں، گوشت، کھانا پکانے کا تیل، دالیں — کی قیمتیں کتنی تیزی سے بڑھ رہی ہیں۔ پاکستان میں، خوراک CPI ٹوکری میں بہت زیادہ وزن (~34.6٪) رکھتی ہے کیونکہ غریب اور درمیانی آمدنی والے گھرانے اپنی آمدنی کا غیر متناسب حصہ خوراک پر خرچ کرتے ہیں۔",
      rm: "Khuraak inflation yeh naapata hai ke khuraak ki ashaaya — gandum, sabziyan, gosht, khaana pakaane ka tel, daalein — ki qeematen kitni tezi se barh rahi hain. Pakistan mein, khuraak CPI tokri mein bahut zyada wazan (~34.6%) rakhti hai kyunke ghareeb aur darmiyana aamdani wale ghraane apni aamdani ka ghair mutanaasib hissa khuraak par kharch karte hain.",
    },
    whyItMatters: {
      en: "Food inflation drives poverty. When food prices rise faster than incomes, poor households must either eat less, eat lower-quality food, or cut spending on health/education to afford food. Pakistan's food inflation has repeatedly outpaced overall CPI — hitting 48%+ during the 2022-23 crisis. Understanding food inflation's drivers (weather, input costs, supply chain, government procurement policy) is essential for anyone tracking Pakistan's poverty and social stability, since food price spikes have historically triggered political unrest in Pakistan (flour riots, sugar crisis protests).",
      ur: "خوراک افراط زر غربت کو چلاتا ہے۔ جب خوراک کی قیمتیں آمدنی سے تیز بڑھتی ہیں، غریب گھرانوں کو یا تو کم کھانا پڑتا ہے، کم معیار کا کھانا کھانا پڑتا ہے، یا صحت/تعلیم پر خرچ کم کرنا پڑتا ہے۔ پاکستان کی خوراک افراط زر نے بار بار مجموعی CPI کو پیچھے چھوڑ دیا ہے — 2022-23 بحران کے دوران 48٪+ تک پہنچی۔",
      rm: "Khuraak inflation ghurbat ko chalata hai. Jab khuraak ki qeematen aamdani se tez barhti hain, ghareeb ghraanon ko ya to kam khaana parta hai, kam miyaar ka khaana khaana parta hai, ya sehat/taleem par kharch kam karna parta hai. Pakistan ki khuraak inflation ne baar baar majmooee CPI ko peechhe chhoad diya hai — 2022-23 bohran ke dauran 48%+ tak pohunchi.",
    },
    explanation: {
      en: `**Why food inflation is distinct from general inflation:**

**1. Weight in the CPI basket:** Food and non-alcoholic beverages carry ~34.6% weight in Pakistan's CPI — far higher than in developed countries (typically 10-15%). This means food price swings have an outsized effect on headline inflation.

**2. Volatility drivers unique to food:**
- Weather shocks: floods (2022 floods destroyed crops worth billions), droughts, heatwaves reduce crop yields
- Seasonal patterns: vegetable and fruit prices swing sharply between harvest and off-season
- Input costs: fertiliser, seeds, diesel for tractors/irrigation — when these rise (as during 2022-23 energy crisis), food production costs rise
- Government procurement policy: wheat support prices set by provincial governments affect flour prices; export bans/allowances on onions, sugar affect domestic supply
- Global commodity prices: Pakistan imports palm oil, some pulses, and is exposed to global wheat/edible oil price swings (worsened by the 2022 Russia-Ukraine war disrupting global grain markets)

**3. Political sensitivity:** Because food spending is visible and immediate, food price spikes generate faster political backlash than general inflation. Governments often respond with (often counterproductive) price controls, subsidies, or export bans — creating the market failures covered in other lessons.

**4. Regressive impact:** Poorer households spend 40-50%+ of income on food; wealthier households spend 15-20%. Food inflation is inherently regressive — hitting the poor hardest — which is why food-specific relief (like the Ramzan Package or targeted food subsidies) is often prioritised over general fiscal relief.

**Pakistan's Sensitive Price Indicator (SPI):** The PBS tracks a weekly SPI covering 51 essential items specifically to monitor food and essential goods affordability for lower-income households — a more granular, faster-updating measure than the monthly CPI.`,
      ur: `**خوراک افراط زر عمومی افراط زر سے کیوں الگ ہے:**

**1. CPI ٹوکری میں وزن:** خوراک پاکستان کے CPI میں ~34.6٪ وزن رکھتی ہے — ترقی یافتہ ممالک سے کہیں زیادہ۔

**2. خوراک کے لیے مخصوص اتار چڑھاؤ کے محرکات:**
- موسمی جھٹکے: سیلاب، خشک سالی فصل کی پیداوار کم کرتے ہیں
- موسمی پیٹرن: سبزیوں اور پھلوں کی قیمتیں فصل اور غیر موسم کے درمیان تیزی سے بدلتی ہیں
- آدان لاگت: کھاد، بیج، ٹریکٹر کے لیے ڈیزل
- سرکاری خریداری پالیسی: گندم سپورٹ قیمتیں آٹے کی قیمتوں کو متاثر کرتی ہیں

**3. سیاسی حساسیت:** خوراک قیمت اضافے عمومی افراط زر سے زیادہ تیز سیاسی ردعمل پیدا کرتے ہیں۔

**4. تنزلی اثر:** غریب گھرانے آمدنی کا 40-50٪+ خوراک پر خرچ کرتے ہیں۔`,
      rm: `**Khuraak inflation amoomi inflation se kyun alag hai:**

**1. CPI tokri mein wazan:** Khuraak Pakistan ke CPI mein ~34.6% wazan rakhti hai — taraqqi yaafta mumaalik se kahin zyada.

**2. Khuraak ke liye makhsoos utaar-charhaao ke muharrikaat:**
- Mausami jhatke: sailaab, khushk saali fasal ki paidawar kam karte hain
- Mausami pattern: sabziyon aur phalon ki qeematen fasal aur ghair mausam ke darmiyan tezi se badalti hain
- Aadaan lagat: khaad, beej, tractor ke liye diesel
- Sarkari khareedari policy: gandum support qeematen aate ki qeematon ko mutaassir karti hain

**3. Siyaasi hasaasiyat:** Khuraak qeemat izaafe amoomi inflation se zyada tez siyaasi rad-e-amal paida karte hain.

**4. Tanazzuli asar:** Ghareeb ghraane aamdani ka 40-50%+ khuraak par kharch karte hain.`,
    },
    misconceptions: {
      en: `**Myth 1: Food inflation is caused only by traders hoarding goods.** While hoarding and speculation do occur (and are often blamed publicly), the primary drivers are usually weather shocks, input cost inflation, and supply chain issues — structural factors, not just middlemen greed. Hoarding often follows, rather than causes, initial price signals.

**Myth 2: Banning exports of food items always helps domestic consumers.** Export bans (e.g., on onions, wheat) can reduce domestic prices short-term but discourage farmers from planting more next season (since they can't profit from export prices), potentially worsening future shortages.

**Myth 3: Food inflation is purely a supply-side problem.** Demand factors matter too — cash transfer programmes (like BISP), remittance inflows during Ramzan/Eid, and seasonal demand spikes (weddings, festivals) also drive food price increases.`,
      ur: `**غلط فہمی 1: خوراک افراط زر صرف تاجروں کی ذخیرہ اندوزی کی وجہ سے ہے۔** ذخیرہ اندوزی ہوتی ہے، لیکن اہم محرکات عام طور پر موسمی جھٹکے، آدان لاگت افراط زر ہیں۔

**غلط فہمی 2: خوراک کی اشیاء کی برآمدات پر پابندی ہمیشہ ملکی صارفین کی مدد کرتی ہے۔** برآمدی پابندیاں قلیل مدتی ملکی قیمتیں کم کر سکتی ہیں لیکن کسانوں کو اگلے سیزن میں زیادہ لگانے سے حوصلہ شکنی کرتی ہیں۔

**غلط فہمی 3: خوراک افراط زر خالصتاً سپلائی سائیڈ مسئلہ ہے۔** طلب کے عوامل بھی اہم ہیں۔`,
      rm: `**Ghalat fehmi 1: Khuraak inflation sirf taajiron ki zakheera-andozi ki wajah se hai.** Zakheera-andozi hoti hai, lekin ahem muharrikaat aam tor par mausami jhatke, aadaan lagat inflation hain.

**Ghalat fehmi 2: Khuraak ki ashaaya ki baraamdaat par paabandi hamesha mulki saraafeen ki madad karti hai.** Baraamdaati paabandiyan qaleel muddat ki mulki qeematen kam kar sakti hain lekin kissaanon ko agle sezon mein zyada lagane se hausla-shikni karti hain.

**Ghalat fehmi 3: Khuraak inflation khaalistan supply side masla hai.** Talab ke awaamil bhi ahem hain.`,
    },
    pakistanExample: {
      en: `**The 2022 floods and food inflation:** Pakistan's catastrophic 2022 floods submerged 1/3 of the country, destroying an estimated $3.7 billion worth of agricultural output — including major damage to cotton, rice, and vegetable crops. Onion prices spiked over 500% in some markets within weeks. Tomato prices hit Rs400+/kg in parts of the country. This was a pure weather-driven supply shock feeding directly into food CPI, which hit 48.7% year-on-year in some months of FY2023 — well above the headline CPI of 38%. This illustrates how climate shocks are becoming a growing driver of Pakistan's food inflation volatility.`,
      ur: `**2022 کے سیلاب اور خوراک افراط زر:** پاکستان کے تباہ کن 2022 سیلاب نے ملک کا 1/3 حصہ ڈبو دیا، تخمیناً $3.7 ارب کی زرعی پیداوار تباہ کی۔ پیاز کی قیمتیں کچھ بازاروں میں ہفتوں کے اندر 500٪ سے زیادہ بڑھیں۔ ٹماٹر کی قیمتیں ملک کے بعض حصوں میں Rs400+/کلو تک پہنچیں۔`,
      rm: `**2022 ke sailaab aur khuraak inflation:** Pakistan ke tabaah-kun 2022 sailaab ne mulk ka 1/3 hissa dubo diya, takhmeenaṃ $3.7 arab ki ziraati paidawar tabaah ki. Pyaaz ki qeematen kuch baazaaron mein haftoN ke andar 500% se zyada barhin. Tamatar ki qeematen mulk ke baaz hisson mein Rs400+/kilo tak pohunchin.`,
    },
    realWorld: {
      en: "The 2007-08 Global Food Price Crisis showed food inflation's power to trigger social unrest across dozens of countries. Global wheat and rice prices doubled within a year due to biofuel demand diverting crops, drought in Australia, and export restrictions by major producers (panic hoarding at the national level). Food riots erupted in Haiti, Egypt, Bangladesh, and over 30 other countries. Several governments fell or faced severe destabilisation. The crisis taught policymakers globally that food security and food price stability are not just economic issues but matters of political and social stability — a lesson very relevant to Pakistan given its history of flour and sugar crises.",
      ur: "2007-08 عالمی خوراک قیمت بحران نے سماجی بدامنی پیدا کرنے کی خوراک افراط زر کی طاقت دکھائی۔ عالمی گندم اور چاول کی قیمتیں ایک سال کے اندر دوگنی ہو گئیں۔ ہیٹی، مصر، بنگلہ دیش، اور 30 سے زیادہ دیگر ممالک میں خوراک کے فسادات پھوٹ پڑے۔",
      rm: "2007-08 aalami khuraak qeemat bohran ne samaaji bad-amni paida karne ki khuraak inflation ki taaqat dikhaai. Aalami gandum aur chawal ki qeematen ek saal ke andar dugni ho gain. Haiti, Misr, Bangladesh, aur 30 se zyada doosre mumaalik mein khuraak ke fasaadaat phoot pare.",
    },
    summary: {
      en: "• Food inflation: rate of change in food prices — carries ~34.6% weight in Pakistan's CPI\n• Drivers: weather shocks, seasonal cycles, input costs, government procurement policy, global commodity prices\n• Regressive: hurts poor households far more (40-50%+ of income on food) than wealthier ones\n• Politically explosive: food price spikes trigger faster public backlash than general inflation\n• 2022 floods: destroyed $3.7bn in crops, pushed food CPI to 48.7% — well above headline 38%\n• PBS SPI: weekly indicator tracking 51 essential items for faster affordability monitoring",
      ur: "• خوراک افراط زر: خوراک قیمتوں میں تبدیلی کی شرح — پاکستان کے CPI میں ~34.6٪ وزن\n• محرکات: موسمی جھٹکے، موسمی چکر، آدان لاگت، سرکاری خریداری پالیسی\n• تنزلی: غریب گھرانوں کو زیادہ نقصان دیتا ہے\n• سیاسی طور پر دھماکہ خیز: خوراک قیمت اضافے تیز سیاسی ردعمل پیدا کرتے ہیں\n• 2022 کے سیلاب: $3.7 ارب فصل تباہ کی، خوراک CPI کو 48.7٪ تک بڑھایا\n• PBS SPI: 51 ضروری اشیاء کو ٹریک کرنے والا ہفتہ وار اشاریہ",
      rm: "• Khuraak inflation: khuraak qeematon mein tabdeeli ki shar — Pakistan ke CPI mein ~34.6% wazan\n• Muharrikaat: mausami jhatke, mausami chakar, aadaan lagat, sarkari khareedari policy\n• Tanazzuli: ghareeb ghraanon ko zyada nuqsaan deta hai\n• Siyaasi tor par dhamaka-khez: khuraak qeemat izaafe tez siyaasi rad-e-amal paida karte hain\n• 2022 ke sailaab: $3.7 arab fasal tabaah ki, khuraak CPI ko 48.7% tak barhaaya\n• PBS SPI: 51 zaroori ashaaya ko track karne wala haftawaar ishaariya",
    },
  },
  quiz: [
    {
      question: { en: "Why does food inflation matter more to poorer households than to wealthier ones?", ur: "خوراک افراط زر غریب گھرانوں کے لیے امیر گھرانوں سے زیادہ کیوں اہم ہے؟", rm: "Khuraak inflation ghareeb ghraanon ke liye ameer ghraanon se zyada kyun ahem hai?" },
      options: [
        { en: "Poor households don't buy food at all", ur: "غریب گھرانے بالکل خوراک نہیں خریدتے", rm: "Ghareeb ghraane bilkul khuraak nahin khareedte" },
        { en: "Poor households spend 40-50%+ of income on food, while wealthier households spend only 15-20%", ur: "غریب گھرانے آمدنی کا 40-50٪+ خوراک پر خرچ کرتے ہیں، جبکہ امیر گھرانے صرف 15-20٪ خرچ کرتے ہیں", rm: "Ghareeb ghraane aamdani ka 40-50%+ khuraak par kharch karte hain, jabke ameer ghraane sirf 15-20% kharch karte hain" },
        { en: "Food prices only rise for poor households", ur: "خوراک کی قیمتیں صرف غریب گھرانوں کے لیے بڑھتی ہیں", rm: "Khuraak ki qeematen sirf ghareeb ghraanon ke liye barhti hain" },
        { en: "There is no difference between the groups", ur: "گروپوں کے درمیان کوئی فرق نہیں ہے", rm: "Groups ke darmiyan koi faraq nahin hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Because food is a much larger share of the spending basket for poor households, the same percentage rise in food prices consumes far more of their income than a wealthy household's. This makes food inflation inherently 'regressive' — hitting those least able to absorb it the hardest.", ur: "چونکہ خوراک غریب گھرانوں کے خرچ ٹوکری کا بہت بڑا حصہ ہے، خوراک قیمتوں میں ایک ہی فیصد اضافہ ان کی آمدنی کا امیر گھرانے سے کہیں زیادہ کھپت کرتا ہے۔", rm: "Chunke khuraak ghareeb ghraanon ke kharch tokri ka bahut bara hissa hai, khuraak qeematon mein ek hi fisad izaafa un ki aamdani ka ameer ghraane se kahin zyada khapat karta hai." },
    },
    {
      question: { en: "What caused Pakistan's food CPI to spike to 48.7% during parts of FY2023, above the headline 38% inflation rate?", ur: "کیا وجہ تھی کہ پاکستان کا خوراک CPI FY2023 کے کچھ حصوں میں 38٪ کی مجموعی افراط زر شرح سے اوپر 48.7٪ تک پہنچا؟", rm: "Kya wajah thi ke Pakistan ka khuraak CPI FY2023 ke kuch hisson mein 38% ki majmooee inflation shar se uupar 48.7% tak pohuncha?" },
      options: [
        { en: "Increased consumer preference for expensive imported food", ur: "مہنگی درآمدی خوراک کے لیے بڑھتی صارف ترجیح", rm: "Mahangi daraamdaati khuraak ke liye barhti saraaf tarjeeh" },
        { en: "The 2022 floods destroying an estimated $3.7 billion in agricultural output", ur: "2022 کے سیلاب نے تخمیناً $3.7 ارب زرعی پیداوار تباہ کی", rm: "2022 ke sailaab ne takhmeenaṃ $3.7 arab ziraati paidawar tabaah ki" },
        { en: "A global shortage of rice specifically affecting Pakistan", ur: "خاص طور پر پاکستان کو متاثر کرنے والی چاول کی عالمی قلت", rm: "Khaas tor par Pakistan ko mutaassir karne wali chawal ki aalami qillat" },
        { en: "Pakistan banned all food imports in 2022", ur: "پاکستان نے 2022 میں تمام خوراک درآمدات پر پابندی لگائی", rm: "Pakistan ne 2022 mein tamam khuraak daraamdaat par paabandi lagaai" },
      ],
      correctIndex: 1,
      explanation: { en: "The catastrophic 2022 floods submerged a third of Pakistan, destroying billions in agricultural output including cotton, rice, and vegetable crops. This supply shock directly drove food prices sharply higher — onion prices spiked over 500% in some markets — pushing food CPI well above the already-elevated headline inflation rate.", ur: "2022 کے تباہ کن سیلاب نے پاکستان کا ایک تہائی حصہ ڈبو دیا، اربوں کی زرعی پیداوار تباہ کی۔ اس سپلائی جھٹکے نے براہ راست خوراک قیمتوں کو تیزی سے بڑھایا — پیاز کی قیمتیں کچھ بازاروں میں 500٪ سے زیادہ بڑھیں۔", rm: "2022 ke tabaah-kun sailaab ne Pakistan ka ek tihaai hissa dubo diya, arbon ki ziraati paidawar tabaah ki. Is supply jhatke ne baraah-e-raast khuraak qeematon ko tezi se barhaaya — pyaaz ki qeematen kuch baazaaron mein 500% se zyada barhin." },
    },
    {
      question: { en: "Why does the Pakistan Bureau of Statistics track a separate weekly Sensitive Price Indicator (SPI) alongside the monthly CPI?", ur: "پاکستان بیورو آف اسٹیٹسٹکس ماہانہ CPI کے ساتھ الگ ہفتہ وار حساس قیمت اشاریہ (SPI) کیوں ٹریک کرتا ہے؟", rm: "Pakistan Bureau of Statistics maahana CPI ke saath alag haftawaar Sensitive Price Indicator (SPI) kyun track karta hai?" },
      options: [
        { en: "Because CPI is not accurate at all", ur: "کیونکہ CPI بالکل درست نہیں ہے", rm: "Kyunke CPI bilkul durust nahin hai" },
        { en: "To provide faster, more granular tracking of essential goods affordability for lower-income households", ur: "کم آمدنی والے گھرانوں کے لیے ضروری اشیاء کی سستی کی تیز، زیادہ تفصیلی ٹریکنگ فراہم کرنے کے لیے", rm: "Kam aamdani wale ghraanon ke liye zaroori ashaaya ki sasti ki tez, zyada tafseeli tracking faraahim karne ke liye" },
        { en: "SPI only tracks stock market prices", ur: "SPI صرف اسٹاک مارکیٹ قیمتیں ٹریک کرتا ہے", rm: "SPI sirf stock market qeematen track karta hai" },
        { en: "SPI replaced CPI entirely in 2020", ur: "SPI نے 2020 میں مکمل طور پر CPI کی جگہ لے لی", rm: "SPI ne 2020 mein mukammal tor par CPI ki jagah le li" },
      ],
      correctIndex: 1,
      explanation: { en: "The SPI tracks 51 essential items on a weekly basis (versus the CPI's monthly cycle covering ~356 items), specifically to give faster, more responsive visibility into how prices affecting lower and middle-income households are moving — critical for both policymakers and the public to monitor cost-of-living pressures in near-real-time.", ur: "SPI ہفتہ وار بنیاد پر 51 ضروری اشیاء ٹریک کرتا ہے، خاص طور پر یہ ظاہر کرنے کے لیے کہ کم اور درمیانی آمدنی والے گھرانوں کو متاثر کرنے والی قیمتیں کیسے حرکت کر رہی ہیں۔", rm: "SPI haftawaar bunyaad par 51 zaroori ashaaya track karta hai, khaas tor par yeh zaahir karne ke liye ke kam aur darmiyana aamdani wale ghraanon ko mutaassir karne wali qeematen kaise harkat kar rahi hain." },
    },
    {
      question: { en: "Why can banning food exports (e.g., onions) backfire in the long run?", ur: "خوراک کی برآمدات (مثلاً پیاز) پر پابندی طویل مدت میں کیوں الٹا اثر ڈال سکتی ہے؟", rm: "Khuraak ki baraamdaat (maslan pyaaz) par paabandi taweel muddat mein kyun ulta asar daal sakti hai?" },
      options: [
        { en: "It has no long-run effects at all", ur: "اس کا طویل مدتی کوئی اثر نہیں ہوتا", rm: "Is ka taweel muddat koi asar nahin hota" },
        { en: "It discourages farmers from planting more next season since they lose access to higher export prices, potentially worsening future domestic shortages", ur: "یہ کسانوں کو اگلے سیزن میں زیادہ لگانے سے حوصلہ شکنی کرتا ہے کیونکہ وہ اعلی برآمدی قیمتوں تک رسائی کھو دیتے ہیں", rm: "Yeh kissaanon ko agle sezon mein zyada lagane se hausla-shikni karta hai kyunke woh aali baraamdaati qeematon tak rasaai kho dete hain" },
        { en: "Export bans always increase domestic supply permanently", ur: "برآمدی پابندیاں ہمیشہ مستقل طور پر ملکی سپلائی بڑھاتی ہیں", rm: "Baraamdaati paabandiyan hamesha mustaqil tor par mulki supply barhati hain" },
        { en: "Export bans have no impact on farmer behaviour", ur: "برآمدی پابندیوں کا کسان کے رویے پر کوئی اثر نہیں ہوتا", rm: "Baraamdaati paabandiyon ka kissaan ke rawayye par koi asar nahin hota" },
      ],
      correctIndex: 1,
      explanation: { en: "Export bans can lower domestic prices in the short term by keeping more supply at home, but they remove farmers' access to higher (export) prices — reducing their incentive to plant more of that crop next season. This can lead to reduced future planting and worse shortages down the line, illustrating the price signal distortion covered in the price-signals lesson.", ur: "برآمدی پابندیاں گھر میں زیادہ سپلائی رکھ کر قلیل مدتی ملکی قیمتیں کم کر سکتی ہیں، لیکن وہ کسانوں کی اعلی (برآمدی) قیمتوں تک رسائی ختم کرتی ہیں — اگلے سیزن میں اس فصل کو زیادہ لگانے کی ترغیب کم کرتی ہیں۔", rm: "Baraamdaati paabandiyan ghar mein zyada supply rakh kar qaleel muddat ki mulki qeematen kam kar sakti hain, lekin woh kissaanon ki aali (baraamdaati) qeematon tak rasaai khatam karti hain — agle sezon mein is fasal ko zyada lagane ki targhib kam karti hain." },
    },
  ],
  faq: [
    {
      question: { en: "What can be done to protect poor households from food inflation without distorting markets?", ur: "بازاروں کو مسخ کیے بغیر غریب گھرانوں کو خوراک افراط زر سے کیسے بچایا جا سکتا ہے؟", rm: "Baazaaron ko masakh kiye baghair ghareeb ghraanon ko khuraak inflation se kaise bachaaya ja sakta hai?" },
      answer: { en: "The most effective approach, favoured by most economists, is targeted cash transfers rather than blanket price controls or subsidies. Programmes like BISP (Benazir Income Support Programme) give cash directly to the poorest households, letting them buy food at market prices while still receiving support — this preserves price signals (farmers still see true market prices and plant accordingly) while directly addressing the affordability problem for those who need it most. Blanket subsidies (like flour or fuel subsidies) are more expensive, benefit wealthy consumers disproportionately (since they consume more in absolute terms), and distort production incentives. Pakistan has increasingly shifted toward targeted cash transfer models, though implementation and targeting accuracy remain challenges.", ur: "زیادہ تر ماہرین اقتصادیات کی طرف سے پسندیدہ سب سے مؤثر نقطہ نظر ہدف بند نقد ٹرانسفر ہے نہ کہ عام قیمت کنٹرول یا سبسڈی۔ BISP جیسے پروگرام غریب ترین گھرانوں کو براہ راست نقد دیتے ہیں، جس سے وہ بازار کی قیمتوں پر خوراک خرید سکیں جبکہ اب بھی مدد حاصل کریں۔", rm: "Zyada tar maahireen iqtisaadiyaat ki taraf se pasandeeda sab se moassir nuqta-e-nazar hadaf-band naqad transfer hai na ke aam qeemat control ya subsidy. BISP jaise programme ghareeb tareen ghraanon ko baraah-e-raast naqad dete hain, jis se woh baazaar ki qeematon par khuraak khareed saken jabke ab bhi madad haasil karen." },
    },
  ],
};
