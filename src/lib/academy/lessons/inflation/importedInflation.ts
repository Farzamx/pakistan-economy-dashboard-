import type { Lesson } from "@/lib/academy/types";

export const importedInflationLesson: Lesson = {
  slug: "imported-inflation",
  category: "inflation",
  title: { en: "Imported Inflation: When the Rupee Falls", ur: "درآمدی افراط زر: جب روپیہ گرتا ہے", rm: "Daraamdaati Inflation: Jab Rupaya Girta Hai" },
  subtitle: {
    en: "How exchange rate depreciation transmits directly into Pakistan's domestic prices",
    ur: "شرح تبادلہ کی کمزوری براہ راست پاکستان کی ملکی قیمتوں میں کیسے منتقل ہوتی ہے",
    rm: "Shar-e-tabadla ki kamzori baraah-e-raast Pakistan ki mulki qeematon mein kaise muntaqil hoti hai",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: ["cpi-pakistan", "exchange-rate-pkr"],
  relatedLessonSlugs: ["exchange-rates-basics", "cost-push", "types-of-inflation"],
  content: {
    overview: {
      en: "Imported inflation occurs when a country's currency weakens, making imported goods and services more expensive in local currency terms — even if the international (dollar) price hasn't changed at all. Since Pakistan imports oil, gas, edible oil, wheat, machinery, chemicals, and pharmaceuticals, PKR depreciation directly raises the rupee cost of all these goods. When PKR fell from ~Rs178 to ~Rs300 against the dollar between 2021-2023 (a ~68% depreciation), every dollar-denominated import cost 68% more in rupee terms — a massive imported inflation shock layered on top of domestic cost pressures.",
      ur: "درآمدی افراط زر اس وقت ہوتا ہے جب کسی ملک کی کرنسی کمزور ہوتی ہے، درآمدی اشیاء اور خدمات کو ملکی کرنسی کے لحاظ سے زیادہ مہنگا بناتی ہے — چاہے بین الاقوامی (ڈالر) قیمت بالکل نہ بدلی ہو۔ جب PKR 2021-2023 کے درمیان ~Rs178 سے ~Rs300 ڈالر کے مقابلے میں گرا، ہر ڈالر میں شمار درآمد روپے کے لحاظ سے 68٪ زیادہ قیمت پڑی۔",
      rm: "Daraamdaati inflation us waqt hota hai jab kisi mulk ki currency kamzor hoti hai, daraamdaati ashaaya aur khadamaat ko mulki currency ke lihaaz se zyada mahanga banati hai — chahe bain-ul-aqwaami (dollar) qeemat bilkul na badli ho. Jab PKR 2021-2023 ke darmiyan ~Rs178 se ~Rs300 dollar ke muqaable mein gira, har dollar mein shumaar daraamd rupay ke lihaaz se 68% zyada qeemat pari.",
    },
    whyItMatters: {
      en: "Imported inflation explains why the SBP cares so much about currency stability, not just interest rates. A weak rupee doesn't just make foreign holidays and iPhones more expensive — it raises the cost of the wheat, cooking oil, and fertiliser that determine food prices, and the fuel that determines transport costs. Understanding imported inflation reveals why Pakistan's foreign exchange reserves crisis, IMF negotiations, and exchange rate policy are not separate from the inflation story — they are central to it.",
      ur: "درآمدی افراط زر اس بات کی وضاحت کرتا ہے کہ SBP صرف شرح سود نہیں بلکہ کرنسی استحکام کی اتنی پرواہ کیوں کرتا ہے۔ ایک کمزور روپیہ نہ صرف بیرون ملک تعطیلات اور آئی فون کو زیادہ مہنگا بناتا ہے — یہ گندم، کھانا پکانے کے تیل اور کھاد کی لاگت بڑھاتا ہے جو خوراک قیمتیں طے کرتی ہیں۔",
      rm: "Daraamdaati inflation is baat ki wazaahat karta hai ke SBP sirf shar-e-sood nahin balke currency istehkaam ki itni parwaah kyun karta hai. Ek kamzor rupaya na sirf bairun-e-mulk taatilaat aur iPhone ko zyada mahanga banata hai — yeh gandum, khaana pakaane ke tel aur khaad ki lagat barhata hai jo khuraak qeematen tay karti hain.",
    },
    explanation: {
      en: `**The mechanism of imported inflation:**

**Step 1:** PKR depreciates against USD (e.g., from Rs200/$ to Rs280/$, a 40% depreciation)
**Step 2:** Every good priced in dollars now costs 40% more in rupees — a barrel of oil priced at $80 costs Rs16,000 instead of Rs16,000 → wait, recalculate: at Rs200/$, $80 = Rs16,000; at Rs280/$, $80 = Rs22,400 — a Rs6,400 (40%) increase without any change in the global oil price
**Step 3:** This higher rupee cost of oil raises fuel prices, which raises transport and production costs across the economy
**Step 4:** Similarly, imported wheat, edible oil, fertiliser, pharmaceuticals, and industrial machinery all become more expensive in rupee terms
**Step 5:** These cost increases pass through to consumer prices with varying lags — fuel almost immediately, manufactured goods over weeks/months

**Why Pakistan is especially vulnerable to imported inflation:**
- High import dependency: Pakistan imports ~100% of its edible oil needs, significant wheat quantities during shortages, most of its crude oil and LNG, and industrial machinery
- Narrow export base: Pakistan's exports (mostly textiles) don't generate enough dollars to naturally support the rupee, making it prone to depreciation during external financing gaps
- Thin forex reserves: Pakistan's reserves have repeatedly fallen to critical levels (sometimes covering under 1 month of imports), forcing sharp currency adjustments rather than gradual ones

**The vicious cycle:** Imported inflation from currency depreciation often triggers the SBP to raise interest rates to defend the currency and control inflation. But high interest rates can also discourage foreign investment inflows if investors doubt Pakistan's fiscal sustainability — meaning currency pressure can persist despite tightening.

**Exchange rate pass-through:** Economists measure how much of a currency depreciation "passes through" to domestic prices. In Pakistan, pass-through is relatively high and fast — reflecting heavy import dependency and limited domestic substitutes for many imported goods.`,
      ur: `**درآمدی افراط زر کا طریقہ کار:**

**قدم 1:** PKR USD کے مقابلے میں کمزور ہوتا ہے
**قدم 2:** ڈالر میں قیمت والی ہر چیز اب روپوں میں زیادہ قیمت پڑتی ہے
**قدم 3:** تیل کی زیادہ روپے لاگت ایندھن قیمتیں بڑھاتی ہے، جو پوری معیشت میں ٹرانسپورٹ اور پیداواری لاگت بڑھاتی ہے
**قدم 4:** اسی طرح، درآمدی گندم، کھانا پکانے کا تیل، کھاد، ادویات، اور صنعتی مشینری سب روپوں میں زیادہ مہنگی ہو جاتی ہیں
**قدم 5:** یہ لاگت اضافے مختلف تاخیر کے ساتھ صارف قیمتوں تک گزرتے ہیں

**پاکستان درآمدی افراط زر کے لیے خاص طور پر کمزور کیوں ہے:**
- اعلی درآمد انحصار: پاکستان اپنی کھانے کے تیل کی ~100٪ ضروریات درآمد کرتا ہے
- تنگ برآمدی بنیاد: پاکستان کی برآمدات کرنسی کو قدرتی طور پر سہارا دینے کے لیے کافی ڈالر پیدا نہیں کرتیں
- پتلے زرمبادلہ ذخائر: پاکستان کے ذخائر بار بار نازک سطح تک گر چکے ہیں`,
      rm: `**Daraamdaati inflation ka tareeqa-kaar:**

**Qadam 1:** PKR USD ke muqaable mein kamzor hota hai
**Qadam 2:** Dollar mein qeemat waali har cheez ab rupon mein zyada qeemat parti hai
**Qadam 3:** Tel ki zyada rupay lagat eendhan qeematen barhati hai, jo poori muaashat mein transport aur paidawaari lagat barhati hai
**Qadam 4:** Isi tarah, daraamdaati gandum, khaana pakaane ka tel, khaad, adwiyat, aur sanaati machinery sab rupon mein zyada mahangi ho jaati hain
**Qadam 5:** Yeh lagat izaafey mukhtalif takheer ke saath saraaf qeematon tak guzarte hain

**Pakistan daraamdaati inflation ke liye khaas tor par kamzor kyun hai:**
- Aali daraamd inhisaar: Pakistan apni khaane ke tel ki ~100% zarooraten daraamd karta hai
- Tang baraamdaati bunyaad: Pakistan ki baraamdaat currency ko qudrati tor par sahaara dene ke liye kaafi dollar paida nahin karteeN
- Patle zar-e-mubadla zakhayir: Pakistan ke zakhayir baar baar naazuk satah tak gir chuke hain`,
    },
    misconceptions: {
      en: `**Myth 1: A weak currency only affects rich people who travel abroad or buy imported luxury goods.** Currency depreciation raises the cost of essentials — cooking oil, wheat (when imported), fertiliser (raising food prices), medicine ingredients, and fuel — hurting everyone, especially the poor who spend the most on necessities.

**Myth 2: Devaluing the currency always helps exports enough to offset import inflation.** Textile exports theoretically become more competitive when PKR weakens, but Pakistan's textile sector also imports raw cotton, dyes, and machinery — meaning much of the export benefit gets offset by higher input costs, limiting the net gain.

**Myth 3: The SBP can simply prevent currency depreciation by intervention alone.** Without adequate forex reserves, the SBP cannot indefinitely defend a currency level against market pressure (excess demand for dollars from importers, debt repayments, and capital flight). Pakistan learned this in 2022 when reserves fell critically low, forcing acceptance of a weaker exchange rate.`,
      ur: `**غلط فہمی 1: کمزور کرنسی صرف امیر لوگوں کو متاثر کرتی ہے جو بیرون ملک سفر کرتے ہیں۔** کرنسی کی کمزوری ضروریات کی لاگت بڑھاتی ہے — کھانا پکانے کا تیل، گندم، کھاد، ادویات کے اجزاء، اور ایندھن۔

**غلط فہمی 2: کرنسی کی قدر کم کرنا ہمیشہ برآمدات کو اتنا فائدہ دیتا ہے کہ درآمدی افراط زر پورا ہو جائے۔** ٹیکسٹائل برآمدات نظریاتی طور پر زیادہ مسابقتی ہو جاتی ہیں لیکن پاکستان کا ٹیکسٹائل شعبہ خام کپاس، رنگ اور مشینری بھی درآمد کرتا ہے۔

**غلط فہمی 3: SBP صرف مداخلت سے کرنسی کی کمزوری کو روک سکتا ہے۔** کافی زرمبادلہ ذخائر کے بغیر، SBP بازار کے دباؤ کے خلاف کرنسی کی سطح کا لامحدود دفاع نہیں کر سکتا۔`,
      rm: `**Ghalat fehmi 1: Kamzor currency sirf ameer logon ko mutaassir karti hai jo bairun-e-mulk safar karte hain.** Currency ki kamzori zarooraat ki lagat barhati hai — khaana pakaane ka tel, gandum, khaad, adwiyat ke ajzaa, aur eendhan.

**Ghalat fehmi 2: Currency ki qadr kam karna hamesha baraamdaat ko itna faayda deta hai ke daraamdaati inflation poora ho jaye.** Textile baraamdaat nazariyaati tor par zyada muqaablatee ho jaati hain lekin Pakistan ka textile shuba khaam kapaas, rang aur machinery bhi daraamd karta hai.

**Ghalat fehmi 3: SBP sirf mudaakhalat se currency ki kamzori ko rok sakta hai.** Kaafi zar-e-mubadla zakhayir ke baghair, SBP baazaar ke dabaao ke khilaf currency ki satah ka laa-mahdood difaa nahin kar sakta.`,
    },
    pakistanExample: {
      en: `**PKR's 2022 free-fall:** In 2022, Pakistan's forex reserves fell to critically low levels (under $3 billion, barely covering 3 weeks of imports) amid a global commodity price surge and delayed IMF programme reviews. The SBP was forced to allow the rupee to depreciate sharply — from ~Rs178/$ in January 2022 to ~Rs287/$ by January 2023, and briefly touching Rs305+/$ in the interbank/open market during the peak crisis. Since Pakistan imports the majority of its edible oil, significant fertiliser inputs, and virtually all its crude oil, this depreciation directly and rapidly raised the rupee cost of food production, cooking oil, and fuel — a textbook case of imported inflation compounding Pakistan's existing cost-push pressures from energy deregulation.`,
      ur: `**PKR کی 2022 آزاد گرنے کی رفتار:** 2022 میں، پاکستان کے زرمبادلہ ذخائر نازک سطح ($3 ارب سے کم) تک گر گئے۔ SBP کو روپے کو تیزی سے کمزور ہونے دینا پڑا — جنوری 2022 میں ~Rs178/$ سے جنوری 2023 تک ~Rs287/$ تک، اور بحران کے عروج پر مختصر طور پر Rs305+/$ کو چھوا۔`,
      rm: `**PKR ki 2022 aazaad girne ki raftaar:** 2022 mein, Pakistan ke zar-e-mubadla zakhayir naazuk satah ($3 arab se kam) tak gir gaye. SBP ko rupay ko tezi se kamzor hone dena para — January 2022 mein ~Rs178/$ se January 2023 tak ~Rs287/$ tak, aur bohran ke uroj par mukhtasar tor par Rs305+/$ ko chhua.`,
    },
    realWorld: {
      en: "Turkey's currency crisis (2018-2023) is a stark case of runaway imported inflation. The Turkish lira lost over 80% of its value against the dollar between 2018-2023 due to unorthodox monetary policy (President Erdogan pushed for LOWER interest rates despite high inflation, against conventional economics). As the lira collapsed, imported goods costs soared, driving Turkish CPI inflation above 80% at its peak in 2022. This illustrates the same mechanism as Pakistan's experience but at a more extreme scale — showing how currency instability and imported inflation can spiral when monetary policy doesn't defend the currency appropriately.",
      ur: "ترکی کا کرنسی بحران (2018-2023) بھاگتی درآمدی افراط زر کا واضح کیس ہے۔ ترک لیرا نے 2018-2023 کے درمیان ڈالر کے مقابلے میں اپنی قدر کا 80٪ سے زیادہ کھو دیا۔ جیسے جیسے لیرا گرا، درآمدی اشیاء کی لاگت بڑھی، ترک CPI افراط زر کو 2022 میں عروج پر 80٪ سے اوپر پہنچایا۔",
      rm: "Turkey ka currency bohran (2018-2023) bhaagti daraamdaati inflation ka waazeh case hai. Turk Lira ne 2018-2023 ke darmiyan dollar ke muqaable mein apni qadr ka 80% se zyada kho diya. Jaise jaise Lira gira, daraamdaati ashaaya ki lagat barhi, Turk CPI inflation ko 2022 mein uroj par 80% se uupar pohunchaaya.",
    },
    summary: {
      en: "• Imported inflation: currency depreciation raises rupee cost of imports without global prices changing\n• Pakistan's high import dependency (oil, edible oil, wheat, fertiliser) makes it especially vulnerable\n• Exchange rate pass-through: fuel adjusts fast; manufactured goods slower\n• PKR fell ~68% from 2021-2023, directly feeding Pakistan's 38% CPI peak\n• Vicious cycle: currency weakness → inflation → rate hikes → potential investment slowdown → continued pressure\n• Cannot be fixed by SBP intervention alone without adequate forex reserves",
      ur: "• درآمدی افراط زر: کرنسی کی کمزوری عالمی قیمتوں کی تبدیلی کے بغیر درآمدات کی روپے لاگت بڑھاتی ہے\n• پاکستان کا اعلی درآمد انحصار اسے خاص طور پر کمزور بناتا ہے\n• شرح تبادلہ گزرگاہ: ایندھن تیزی سے ایڈجسٹ ہوتا ہے\n• PKR 2021-2023 سے ~68٪ گرا، براہ راست پاکستان کے 38٪ CPI عروج میں حصہ ڈالا\n• شیطانی چکر: کرنسی کمزوری → افراط زر → شرح اضافے\n• صرف SBP مداخلت سے ٹھیک نہیں کیا جا سکتا",
      rm: "• Daraamdaati inflation: currency ki kamzori aalami qeematon ki tabdeeli ke baghair daraamdaat ki rupay lagat barhati hai\n• Pakistan ka aali daraamd inhisaar ise khaas tor par kamzor banata hai\n• Shar-e-tabadla guzargaah: eendhan tezi se adjust hota hai\n• PKR 2021-2023 se ~68% gira, baraah-e-raast Pakistan ke 38% CPI uroj mein hissa daala\n• Shaitaani chakar: currency kamzori → inflation → shar izaafey\n• Sirf SBP mudaakhalat se theek nahin kiya ja sakta",
    },
  },
  quiz: [
    {
      question: { en: "If PKR depreciates from Rs200/$ to Rs280/$, what happens to the rupee cost of oil priced at $80/barrel (assuming global price stays the same)?", ur: "اگر PKR Rs200/$ سے Rs280/$ کمزور ہوتا ہے، $80/بیرل قیمت والے تیل کی روپے لاگت کا کیا ہوتا ہے (فرض کریں عالمی قیمت وہی رہتی ہے)؟", rm: "Agar PKR Rs200/$ se Rs280/$ kamzor hota hai, $80/barrel qeemat wale tel ki rupay lagat ka kya hota hai (farz karein aalami qeemat wahi rehti hai)?" },
      options: [
        { en: "It stays exactly the same — Rs16,000", ur: "یہ بالکل ایک جیسا رہتا ہے — Rs16,000", rm: "Yeh bilkul ek jaisa rehta hai — Rs16,000" },
        { en: "It rises from Rs16,000 to Rs22,400 — a 40% increase purely from currency depreciation", ur: "یہ Rs16,000 سے Rs22,400 تک بڑھتا ہے — خالصتاً کرنسی کمزوری سے 40٪ اضافہ", rm: "Yeh Rs16,000 se Rs22,400 tak barhta hai — khaalistan currency kamzori se 40% izaafa" },
        { en: "It falls because the dollar is now worth less", ur: "یہ گرتا ہے کیونکہ ڈالر اب کم قیمت کا ہے", rm: "Yeh girta hai kyunke dollar ab kam qeemat ka hai" },
        { en: "It doubles to Rs32,000", ur: "یہ دگنا ہو کر Rs32,000 ہو جاتا ہے", rm: "Yeh dugna ho kar Rs32,000 ho jaata hai" },
      ],
      correctIndex: 1,
      explanation: { en: "At Rs200/$: $80 × Rs200 = Rs16,000. At Rs280/$: $80 × Rs280 = Rs22,400. That's a Rs6,400 increase, or exactly 40% — matching the currency depreciation percentage. This is the pure mechanical effect of imported inflation: even with zero change in the global dollar price, the rupee cost rises exactly in proportion to the currency's depreciation.", ur: "Rs200/$ پر: $80 × Rs200 = Rs16,000۔ Rs280/$ پر: $80 × Rs280 = Rs22,400۔ یہ Rs6,400 اضافہ ہے، یا بالکل 40٪ — کرنسی کمزوری کے فیصد سے مماثل۔", rm: "Rs200/$ par: $80 × Rs200 = Rs16,000. Rs280/$ par: $80 × Rs280 = Rs22,400. Yeh Rs6,400 izaafa hai, ya bilkul 40% — currency kamzori ke fisad se mumaasil." },
    },
    {
      question: { en: "Why is Pakistan especially vulnerable to imported inflation compared to countries with diversified, large export sectors?", ur: "متنوع، بڑے برآمدی شعبوں والے ممالک کے مقابلے میں پاکستان درآمدی افراط زر کے لیے خاص طور پر کمزور کیوں ہے؟", rm: "Mutanawwa, bare baraamdaati shubon wale mumaalik ke muqaable mein Pakistan daraamdaati inflation ke liye khaas tor par kamzor kyun hai?" },
      options: [
        { en: "Pakistan has too many exports and not enough imports", ur: "پاکستان کے پاس بہت زیادہ برآمدات اور کافی درآمدات نہیں ہیں", rm: "Pakistan ke paas bahut zyada baraamdaat aur kaafi daraamdaat nahin hain" },
        { en: "Pakistan's narrow export base (mostly textiles) doesn't generate enough dollars to naturally support the rupee, and it has high dependency on imported oil, edible oil, and fertiliser", ur: "پاکستان کی تنگ برآمدی بنیاد (زیادہ تر ٹیکسٹائل) روپے کو قدرتی طور پر سہارا دینے کے لیے کافی ڈالر پیدا نہیں کرتی، اور اسے درآمدی تیل، کھانے کے تیل اور کھاد پر اعلی انحصار ہے", rm: "Pakistan ki tang baraamdaati bunyaad (zyada tar textile) rupay ko qudrati tor par sahaara dene ke liye kaafi dollar paida nahin karti, aur use daraamdaati tel, khaane ke tel aur khaad par aali inhisaar hai" },
        { en: "Pakistan doesn't trade with any other countries", ur: "پاکستان کسی دوسرے ملک سے تجارت نہیں کرتا", rm: "Pakistan kisi doosre mulk se tijaarat nahin karta" },
        { en: "Pakistan's currency is not traded internationally", ur: "پاکستان کی کرنسی بین الاقوامی سطح پر تجارت نہیں کی جاتی", rm: "Pakistan ki currency bain-ul-aqwaami satah par tijaarat nahin ki jaati" },
      ],
      correctIndex: 1,
      explanation: { en: "Pakistan's export base is narrow (heavily weighted toward textiles), generating insufficient dollar inflows to naturally stabilise the rupee. Combined with heavy reliance on imported oil, edible oil, and fertiliser, this makes Pakistan's currency prone to sharp depreciation during external financing gaps — and its domestic prices highly sensitive to that depreciation.", ur: "پاکستان کی برآمدی بنیاد تنگ ہے (زیادہ تر ٹیکسٹائل کی طرف)، روپے کو قدرتی طور پر مستحکم کرنے کے لیے ناکافی ڈالر آمد پیدا کرتی ہے۔ درآمدی تیل، کھانے کے تیل اور کھاد پر بھاری انحصار کے ساتھ، یہ پاکستان کی کرنسی کو تیز کمزوری کا شکار بناتا ہے۔", rm: "Pakistan ki baraamdaati bunyaad tang hai (zyada tar textile ki taraf), rupay ko qudrati tor par mustahkam karne ke liye naakaafi dollar aamad paida karti hai. Daraamdaati tel, khaane ke tel aur khaad par bhaari inhisaar ke saath, yeh Pakistan ki currency ko tez kamzori ka shikaar banata hai." },
    },
    {
      question: { en: "Why doesn't PKR depreciation always boost Pakistan's textile exports enough to fully offset imported inflation?", ur: "PKR کی کمزوری ہمیشہ درآمدی افراط زر کو مکمل طور پر پورا کرنے کے لیے پاکستان کی ٹیکسٹائل برآمدات کو کافی فروغ کیوں نہیں دیتی؟", rm: "PKR ki kamzori hamesha daraamdaati inflation ko mukammal tor par poora karne ke liye Pakistan ki textile baraamdaat ko kaafi farogh kyun nahin deti?" },
      options: [
        { en: "Because Pakistan doesn't export textiles at all", ur: "کیونکہ پاکستان بالکل ٹیکسٹائل برآمد نہیں کرتا", rm: "Kyunke Pakistan bilkul textile baraadm nahin karta" },
        { en: "Because textile production itself relies on imported raw cotton, dyes, and machinery, so a weaker rupee raises those input costs too, offsetting some of the export competitiveness gain", ur: "کیونکہ ٹیکسٹائل پیداوار خود درآمدی خام کپاس، رنگوں اور مشینری پر انحصار کرتی ہے، اس لیے کمزور روپیہ ان آدان لاگتوں کو بھی بڑھاتا ہے", rm: "Kyunke textile paidawar khud daraamdaati khaam kapaas, rangon aur machinery par inhisaar karti hai, is liye kamzor rupaya un aadaan lagaton ko bhi barhata hai" },
        { en: "Because global demand for textiles has disappeared entirely", ur: "کیونکہ ٹیکسٹائل کی عالمی طلب مکمل طور پر غائب ہو گئی ہے", rm: "Kyunke textile ki aalami talab mukammal tor par ghaaib ho gayi hai" },
        { en: "Because Pakistan's textile sector is fully self-sufficient in raw materials", ur: "کیونکہ پاکستان کا ٹیکسٹائل شعبہ خام مال میں مکمل طور پر خودکفیل ہے", rm: "Kyunke Pakistan ka textile shuba khaam maal mein mukammal tor par khud-kafeel hai" },
      ],
      correctIndex: 1,
      explanation: { en: "While a weaker rupee theoretically makes Pakistani exports cheaper (more competitive) for foreign buyers, the textile industry itself imports raw cotton (during shortages), synthetic fibers, dyes, and machinery/spare parts. A weaker rupee raises these input costs simultaneously, partially offsetting the competitiveness gain from currency depreciation.", ur: "اگرچہ کمزور روپیہ نظریاتی طور پر پاکستانی برآمدات کو غیر ملکی خریداروں کے لیے سستا بناتا ہے، ٹیکسٹائل صنعت خود خام کپاس، مصنوعی ریشے، رنگ اور مشینری درآمد کرتی ہے۔ کمزور روپیہ بیک وقت ان آدان لاگتوں کو بڑھاتا ہے۔", rm: "Agarchay kamzor rupaya nazariyaati tor par Pakistani baraamdaat ko ghair mulki khareedaron ke liye sasta banata hai, textile sanaat khud khaam kapaas, masnooi resha, rang aur machinery daraamd karti hai. Kamzor rupaya bayak waqt un aadaan lagaton ko barhata hai." },
    },
    {
      question: { en: "Why couldn't Pakistan's SBP simply prevent the 2022 rupee depreciation through intervention?", ur: "پاکستان کا SBP مداخلت کے ذریعے 2022 کی روپے کی کمزوری کو صرف کیوں نہیں روک سکا؟", rm: "Pakistan ka SBP mudaakhalat ke zariye 2022 ki rupay ki kamzori ko sirf kyun nahin rok saka?" },
      options: [
        { en: "Because the SBP was legally banned from intervening in currency markets", ur: "کیونکہ SBP کو قانونی طور پر کرنسی مارکیٹ میں مداخلت سے منع کیا گیا تھا", rm: "Kyunke SBP ko qaanooni tor par currency market mein mudaakhalat se mana kiya gaya tha" },
        { en: "Because forex reserves fell critically low, leaving inadequate dollars to sell in defense of the rupee against market pressure", ur: "کیونکہ زرمبادلہ ذخائر نازک طور پر کم ہو گئے، روپے کے دفاع میں فروخت کرنے کے لیے ناکافی ڈالر چھوڑے", rm: "Kyunke zar-e-mubadla zakhayir naazuk tor par kam ho gaye, rupay ke difaa mein farokht karne ke liye naakaafi dollar chhaade" },
        { en: "Because the SBP wanted the rupee to depreciate for political reasons", ur: "کیونکہ SBP سیاسی وجوہات کی بنا پر روپے کی کمزوری چاہتا تھا", rm: "Kyunke SBP siyaasi wajoohaat ki bunaa par rupay ki kamzori chahta tha" },
        { en: "Because currency markets don't actually respond to central bank intervention", ur: "کیونکہ کرنسی مارکیٹیں دراصل مرکزی بینک مداخلت کا جواب نہیں دیتیں", rm: "Kyunke currency markets darasal markazi bank mudaakhalat ka jawaab nahin deteeN" },
      ],
      correctIndex: 1,
      explanation: { en: "Central banks defend currency levels by selling foreign reserves (dollars) to meet excess demand. When Pakistan's reserves fell below $3 billion (barely 3 weeks of import cover) in 2022, the SBP simply didn't have enough dollars to keep selling into the market to hold the rupee's value — forcing it to allow depreciation to a market-clearing level instead.", ur: "مرکزی بینک زائد طلب کو پورا کرنے کے لیے غیر ملکی ذخائر (ڈالر) بیچ کر کرنسی کی سطح کا دفاع کرتے ہیں۔ جب پاکستان کے ذخائر 2022 میں $3 ارب سے نیچے گر گئے، SBP کے پاس روپے کی قدر برقرار رکھنے کے لیے کافی ڈالر نہیں تھے۔", rm: "Markazi bank zaaid talab ko poora karne ke liye ghair mulki zakhayir (dollar) bech kar currency ki satah ka difaa karte hain. Jab Pakistan ke zakhayir 2022 mein $3 arab se neeche gir gaye, SBP ke paas rupay ki qadr barqaraar rakhne ke liye kaafi dollar nahin the." },
    },
  ],
  faq: [
    {
      question: { en: "Does the recent stability of the rupee mean imported inflation is no longer a concern for Pakistan?", ur: "کیا روپے کا حالیہ استحکام اس بات کا مطلب ہے کہ درآمدی افراط زر اب پاکستان کے لیے تشویش کی بات نہیں؟", rm: "Kya rupay ka haaliya istehkaam is baat ka matlab hai ke daraamdaati inflation ab Pakistan ke liye tashweesh ki baat nahin?" },
      answer: { en: "Currency stability reduces near-term imported inflation risk, but the underlying vulnerabilities remain until addressed structurally: Pakistan's export base is still narrow, import dependency for energy and food inputs remains high, and forex reserves remain thin by international standards (often covering only 2-3 months of imports, versus the 3-6 months considered comfortable). Any future external shock — a global oil price spike, a delay in IMF disbursements, a spike in debt repayment obligations, or reduced remittance inflows — could reignite currency pressure and imported inflation. Sustainable protection against imported inflation requires structural fixes: diversifying exports beyond textiles, boosting domestic energy production, and building durable forex reserve buffers — not just temporary currency stability.", ur: "کرنسی استحکام قریبی مدتی درآمدی افراط زر خطرے کو کم کرتا ہے، لیکن بنیادی کمزوریاں ساختی طور پر حل ہونے تک برقرار رہتی ہیں: پاکستان کی برآمدی بنیاد اب بھی تنگ ہے، توانائی اور خوراک آدانات کے لیے درآمد انحصار اعلی رہتا ہے، اور زرمبادلہ ذخائر بین الاقوامی معیار کے مطابق پتلے رہتے ہیں۔", rm: "Currency istehkaam qareebi muddat daraamdaati inflation khatre ko kam karta hai, lekin bunyaadi kamzoriyan saakhti tor par hal hone tak barqaraar rehti hain: Pakistan ki baraamdaati bunyaad ab bhi tang hai, tawanaayi aur khuraak aadaanaat ke liye daraamd inhisaar aali rehta hai, aur zar-e-mubadla zakhayir bain-ul-aqwaami miyaar ke mutaabiq patle rehte hain." },
    },
  ],
};
