import type { Lesson } from "@/lib/workshop/types";

export const policyRateLesson: Lesson = {
  slug: "policy-rate",
  category: "banking",
  title: {
    en: "The SBP Policy Rate Explained",
    ur: "SBP پالیسی ریٹ کی وضاحت",
    rm: "SBP Policy Rate ki Wazaahat",
  },
  subtitle: {
    en: "How Pakistan's central bank sets interest rates — and why it affects everything from your mortgage to the stock market",
    ur: "پاکستان کا مرکزی بینک شرح سود کیسے مقرر کرتا ہے — اور یہ آپ کے گھر کے قرض سے حصص بازار تک سب کو کیوں متاثر کرتا ہے",
    rm: "Pakistan ka markazi bank share sood kaise muqarrar karta hai — aur yeh aapke ghar ke qarz se hissas bazaar tak sab ko kyun mutaassir karta hai",
  },
  level: "intermediate",
  readMinutes: 10,
  isPremium: true,
  relatedIndicatorSlugs: [
    "policy-rate-pakistan",
    "tbill-3m-pakistan",
    "cpi-inflation-pakistan",
  ],
  content: {
    explanation: {
      en: `The State Bank of Pakistan (SBP) policy rate is the target interest rate for overnight lending between commercial banks in the interbank market. It is the primary tool the SBP uses to implement monetary policy.

**How it works — the transmission mechanism:**

When the SBP raises the policy rate:
1. Overnight interbank borrowing costs rise immediately
2. Banks raise lending rates for consumers and businesses (mortgages, auto loans, working capital)
3. Borrowing becomes more expensive → spending and investment decline
4. Aggregate demand falls → inflationary pressure eases
5. Higher yields attract foreign capital inflows → PKR strengthens

When the SBP cuts the policy rate, the transmission runs in reverse — cheaper credit stimulates borrowing, investment, and consumption, supporting growth at the cost of potential inflationary pressure.

**The Monetary Policy Committee (MPC):**
The SBP's MPC meets 8 times per year and decides the policy rate by consensus. The MPC consists of 7 members: SBP Governor (Chair), Deputy Governors, and 4 external experts appointed by the government. Decisions are announced via a Monetary Policy Statement (MPS) that also provides the SBP's outlook on inflation, growth, and the external sector.

**The corridor system:**
Pakistan uses an interest rate corridor. The policy rate is the ceiling for SBP's overnight repo facility and the floor is set 150 basis points below. This bounds where the overnight market rate trades, giving the SBP precise control over very short-term rates.`,

      ur: `اسٹیٹ بینک آف پاکستان (SBP) پالیسی ریٹ انٹربینک مارکیٹ میں تجارتی بینکوں کے درمیان راتوں رات قرض کے لیے ہدف شرح سود ہے۔ یہ SBP کا مالیاتی پالیسی نافذ کرنے کا بنیادی آلہ ہے۔

**یہ کیسے کام کرتا ہے — ترسیلی طریقہ کار:**

جب SBP پالیسی ریٹ بڑھاتا ہے:
1. راتوں رات انٹربینک قرض کی لاگت فوری بڑھ جاتی ہے
2. بینک صارفین اور کاروباروں کے لیے قرض کی شرحیں بڑھاتے ہیں
3. قرض مہنگا ہو جاتا ہے → خرچ اور سرمایہ کاری کم ہو جاتی ہے
4. مجموعی طلب گرتی ہے → افراطِ زر کا دباؤ کم ہوتا ہے

**مانیٹری پالیسی کمیٹی (MPC):**
SBP کی MPC سال میں 8 مرتبہ ملتی ہے اور اتفاق رائے سے پالیسی ریٹ طے کرتی ہے۔ کمیٹی میں 7 ارکان ہیں: SBP گورنر، نائب گورنر، اور 4 بیرونی ماہرین۔`,

      rm: `State Bank of Pakistan (SBP) policy rate interbank market mein tijaarti bankon ke darmiyan raaton raat qarz ke liye hadaf share sood hai. Yeh SBP ka maaliyaati policy naafiz karne ka bunyaadi aala hai.

**Yeh kaise kaam karta hai — tarsili tareeqa kaar:**

Jab SBP policy rate barhata hai:
1. Raaton raat interbank qarz ki lagat fori barh jaati hai
2. Bank consumers aur kaarobaaron ke liye qarz ki sarhain barhate hain
3. Qarz mahnga ho jaata hai → kharch aur sarmayakari kam ho jaati hai
4. Majmooi talab girti hai → inflation ka dabaao kam hota hai

**Monetary Policy Committee (MPC):**
SBP ki MPC saal mein 8 baar milti hai aur ittifaq-e-raaye se policy rate tay karti hai. Committee mein 7 arkaan hain: SBP Governor, Naib Governor, aur 4 bairooni maahhireen.`,
    },

    pakistanExample: {
      en: `Pakistan's most dramatic policy rate cycle in recent history: 2021–2024.

**July 2021:** SBP held the rate at 7% — a post-COVID low — to support economic recovery. GDP growth was 5.7%.

**September 2021 – June 2023:** The SBP hiked aggressively in response to accelerating inflation and the IMF program requirements — from 7% to a record high of 22%. This was the sharpest tightening cycle in Pakistan's history.

**Impact of the 22% rate:**
- Government debt servicing costs exploded: interest payments consumed over 50% of federal revenues in FY2024
- Private sector credit growth collapsed — banks preferred the risk-free 22% PIB yield
- KSE-100 remained surprisingly resilient as high rates were already priced in and earnings from banks (enjoying high spreads) boosted index earnings
- Mortgage and auto loan demand dried up almost entirely

**June 2024 – present:** The SBP began cutting as inflation declined from its 38% peak toward ~10%. The rate was cut from 22% to 11% by early 2025 — the fastest easing cycle in two decades. Each cut announcement triggered significant bond market rallies.`,

      ur: `پاکستان کی حالیہ تاریخ میں سب سے ڈرامائی پالیسی ریٹ سائیکل: 2021–2024۔

**جولائی 2021:** SBP نے شرح 7٪ پر رکھی — COVID کے بعد کم ترین — اقتصادی بحالی کی حمایت کے لیے۔

**ستمبر 2021 – جون 2023:** SBP نے تیزی سے اضافہ کیا — 7٪ سے 22٪ ریکارڈ بلندی تک۔ پاکستان کی تاریخ میں سب سے تیز سخت گیری سائیکل۔

**22٪ شرح کا اثر:**
- حکومتی قرض کی خدمت کے اخراجات بڑھ گئے: سود کی ادائیگیوں نے مالی سال 2024 میں 50٪ سے زیادہ وفاقی محصول نگل لیے
- نجی شعبے کی قرض ترقی سکڑ گئی

**جون 2024 – حال تک:** SBP نے کٹوتی شروع کی جب افراطِ زر 38٪ عروج سے ~10٪ تک گرا۔ شرح 22٪ سے 11٪ پر آئی۔`,

      rm: `Pakistan ki haaliya taareekh mein sab se dramatic policy rate cycle: 2021–2024.

**July 2021:** SBP ne share 7% par rakhi — COVID ke baad kam tareen — iqtisaadi bahali ki himaayat ke liye.

**September 2021 – June 2023:** SBP ne tezi se izaafa kiya — 7% se 22% record buland tak. Pakistan ki taareekh mein sab se tez sakht giri cycle.

**22% share ka asar:**
- Hukoomatī qarz ki khidmat ke ikhraajaaat barh gaye: sood ki adaaigiyon ne maali saal 2024 mein 50% se zyada wafdaaqī mahsool nigal liye
- Najaati shaabe ka qarz taraqqī sikhar gayi

**June 2024 – haal tak:** SBP ne katooti shuru ki jab inflation 38% uruj se ~10% tak gira. Share 22% se 11% par aayi.`,
    },

    realWorld: {
      en: `The US Federal Reserve's rate cycle offers the closest global parallel to Pakistan's recent experience.

**Fed 2022–2023 hike cycle:** The Fed raised rates from 0.25% to 5.25–5.50% in 16 months — the fastest tightening in 40 years — to combat inflation that peaked at 9.1% in June 2022. The result: inflation fell back to ~3% by mid-2023 without a recession (a "soft landing" rarely achieved in monetary policy history).

**Key differences from Pakistan:**
1. The Fed sets dollar rates — the global reserve currency. Its rate hikes push money out of emerging markets (including Pakistan) into US Treasuries, pressuring EM currencies.
2. Pakistan's fiscal dominance problem: when the government is the largest borrower at 22%, rate hikes directly raise fiscal costs, creating political pressure to reverse policy before inflation is fully controlled.
3. Central bank credibility: the Fed has decades of institutional independence. The SBP has faced political pressure to cut rates prematurely in past cycles (2018–2019), which contributed to the 2019 IMF bailout.

**Turkey's cautionary tale:** President Erdogan insisted that high rates cause inflation (the reverse of standard economics). The Turkish central bank cut rates in 2021 despite rising inflation — the lira collapsed, inflation hit 85%, and Turkey eventually reversed course under a new finance minister.`,

      ur: `امریکی فیڈرل ریزرو کا شرح سائیکل پاکستان کے حالیہ تجربے سے قریب ترین عالمی مثال پیش کرتا ہے۔

**Fed 2022–2023 اضافہ سائیکل:** Fed نے 16 ماہ میں شرح 0.25٪ سے 5.25–5.50٪ تک بڑھائی — 40 سالوں میں سب سے تیز سخت گیری — جون 2022 میں 9.1٪ پر عروج پر پہنچنے والے افراطِ زر کا مقابلہ کرنے کے لیے۔

**پاکستان سے اہم فرق:**
1. Fed ڈالر شرحیں مقرر کرتا ہے — عالمی ریزرو کرنسی
2. پاکستان کا مالیاتی غلبے کا مسئلہ: جب حکومت 22٪ پر سب سے بڑی قرض دار ہو
3. مرکزی بینک کی ساکھ: Fed کی دہائیوں کی ادارہ جاتی خودمختاری ہے۔`,

      rm: `Amreeki Federal Reserve ka share cycle Pakistan ke haaliya tajaribe se qareeb tareen aalami misaal pesh karta hai.

**Fed 2022–2023 izaafa cycle:** Fed ne 16 maah mein share 0.25% se 5.25–5.50% tak badhaayi — 40 saalon mein sab se tez sakht giri — inflation ka muqabala karne ke liye.

**Pakistan se aham farq:**
1. Fed dollar sarhain muqarrar karta hai — aalami reserve currency
2. Pakistan ka maali ghalbe ka masala: jab hukoomat 22% par sab se bari qarz daar ho
3. Markazi bank ki saakh: Fed ki dahaion ki idaarajati khudmukhtaari hai.`,
    },

    whyTraders: {
      en: `The SBP policy rate is the single most important variable for Pakistani fixed-income traders and has significant equity implications:

**T-Bills and PIBs:** Policy rate decisions directly set the anchor for all government security yields. When the rate was at 22%, 12-month T-Bill yields were ~22.5%. As cuts began, T-Bill and PIB prices rallied sharply (yields fell). Traders who positioned long PIBs before the cutting cycle made exceptional returns.

**Reading the MPS:** The Monetary Policy Statement contains forward guidance. Phrases like "the MPC views the current rate as appropriate" vs. "further tightening may be needed" signal future direction. Traders parse these statements for asymmetric positioning opportunities.

**Equity rotation:** As rates fall, the opportunity cost of holding equities vs. fixed income declines. Money rotates from T-Bills into KSE-100 stocks — historically, the first 200–400 bps of rate cuts drive strong equity market re-rating. Banks (spread compression risk), rate-sensitive autos, and construction benefit most from cuts.

**PKR positioning:** Rate differentials matter for carry trade. When Pakistan's rates (22%) far exceeded US rates (5.25%) in 2023–24, carry trade inflows supported the PKR — but political and reserve risks always cap this.`,

      ur: `SBP پالیسی ریٹ پاکستانی ثابت آمدنی کے تاجروں کے لیے سب سے اہم متغیر ہے:

**T-Bills اور PIBs:** پالیسی ریٹ فیصلے تمام حکومتی سیکیورٹی منافع کے لیے لنگر مقرر کرتے ہیں۔

**MPS پڑھنا:** مانیٹری پالیسی بیان میں آگے کی رہنمائی ہوتی ہے۔ تاجر غیر متناسب پوزیشننگ کے مواقع کے لیے ان بیانات کا تجزیہ کرتے ہیں۔

**حصص گردش:** جب شرحیں گرتی ہیں، تو T-Bills کے مقابلے حصص رکھنے کی موقع لاگت کم ہوتی ہے۔ تاریخی طور پر، شرح کٹوتیوں کے پہلے 200–400 بنیادی نکات مضبوط حصص بازار دوبارہ درجہ بندی کرتے ہیں۔`,

      rm: `SBP policy rate Pakistani saabit aamdani ke taajaron ke liye sab se aham mutaghayyir hai:

**T-Bills aur PIBs:** Policy rate faisale tamam hukoomatī security munafe ke liye langar muqarrar karte hain.

**MPS parhna:** Monetary Policy Statement mein aage ki rahnumaai hoti hai. Tajir ghair mutanaasib positioning ke mawaqe ke liye in bayaanaat ka tajziyah karte hain.

**Hissas gardish:** Jab sarhain girti hain, to T-Bills ke muqable hissas rakhne ki mauqa lagat kam hoti hai. Taareekhan, share katootiyon ke pehle 200–400 bunyaadi nuqaat mazboot hissas bazaar dobara darjabandi karte hain.`,
    },

    whyInvestors: {
      en: `For long-term investors, the policy rate cycle is a key determinant of the appropriate asset allocation between Pakistani fixed income, equities, and real assets:

**Required return framework:** When risk-free T-Bill yields are 22%, any investment (equity, real estate, business) must offer a risk premium above 22% to be rational. This crushes equity valuations unless earnings growth justifies the premium. As rates fall to, say, 11%, equity valuations can re-rate significantly higher even with the same earnings.

**Duration management:** Long-duration bonds (20-year PIBs) have the highest price sensitivity to rate changes. A 100bps rate cut on a 20-year bond produces roughly a 12–14% price gain. Investors who bought long PIBs in mid-2023 at 22% yields and held through 11 cuts to 11% earned both the coupon and significant capital gains.

**Real estate:** Higher rates mean higher mortgage costs → lower affordability → property price pressure. Conversely, falling rates stimulate property markets. Pakistan's property market is largely cash-driven (limited mortgage penetration), so this effect is muted but still present for commercial real estate.

**Corporate credit:** Companies with floating-rate debt (common in Pakistan's banking system) face rising interest expenses when rates climb. Investors in corporate bonds or equity must model this interest coverage ratio sensitivity.`,

      ur: `طویل مدتی سرمایہ کاروں کے لیے، پالیسی ریٹ سائیکل پاکستانی ثابت آمدنی، حصص، اور حقیقی اثاثوں کے درمیان مناسب اثاثہ مختص کاری کا اہم تعین کنندہ ہے:

**مطلوبہ منافع کا ڈھانچہ:** جب خطرے سے پاک T-Bill منافع 22٪ ہو، تو کوئی بھی سرمایہ کاری 22٪ سے اوپر خطرے کا اضافی منافع پیش کرنی چاہیے۔

**مدت کا انتظام:** طویل مدتی بانڈز (20 سالہ PIBs) شرح تبدیلیوں کی قیمت حساسیت سب سے زیادہ رکھتے ہیں۔ 20 سالہ بانڈ پر 100bps شرح کٹوتی تقریباً 12–14٪ قیمت فائدہ دیتی ہے۔`,

      rm: `Taweeel muddat ke sarmayakaaron ke liye, policy rate cycle Pakistani saabit aamdani, hissas, aur haqeeqi asasoon ke darmiyan munaasib asasah mukhtaas kaari ka aham ta'ayyun kunnindah hai:

**Matloobah munafa ka dhancha:** Jab khatarey se paak T-Bill munafa 22% ho, to koi bhi sarmayakari 22% se upar khatrey ka izaafi munafa pesh karni chahiye.

**Muddat ka intizaam:** Taweeel muddat ke bonds (20 saala PIBs) share tabdeeliyon ki qeemat hassaasiyat sab se zyada rakhte hain. 20 saala bond par 100bps share katooti taqreeban 12–14% qeemat faida deti hai.`,
    },
  },

  faq: [
    {
      question: {
        en: "How quickly does a rate change affect borrowers?",
        ur: "شرح میں تبدیلی قرض داروں کو کتنی جلدی متاثر کرتی ہے؟",
        rm: "Share mein tabdeeli qarz daaron ko kitni jaldi mutaassir karti hai?",
      },
      answer: {
        en: "For floating-rate loans (most commercial and consumer lending in Pakistan), the impact is near-immediate — banks adjust their KIBOR-linked rates within days of an MPC decision. For fixed-rate loans (rarer in Pakistan), existing borrowers are unaffected until refinancing. T-Bill and PIB rates in the secondary market reprice within hours of the MPS announcement. The real economy impact (on inflation and growth) takes 6–12 months to fully transmit.",
        ur: "فلوٹنگ ریٹ قرضوں (پاکستان میں زیادہ تر تجارتی اور صارف قرض) کے لیے، اثر تقریباً فوری ہے — بینک MPC فیصلے کے چند دنوں میں اپنی KIBOR سے منسلک شرحیں ایڈجسٹ کرتے ہیں۔ حقیقی معاشی اثر (افراطِ زر اور ترقی پر) منتقل ہونے میں 6–12 ماہ لگتے ہیں۔",
        rm: "Floating rate qarzon (Pakistan mein zyada tar tijaari aur consumer qarz) ke liye, asar taqreeban fori hai — bank MPC faisale ke chand dinon mein apni KIBOR se mansoob sarhain adjust karte hain. Haqeeqi maashaati asar (inflation aur taraqqī par) muntaqil hone mein 6–12 maah lagte hain.",
      },
    },
    {
      question: {
        en: "What is KIBOR and how is it related to the policy rate?",
        ur: "KIBOR کیا ہے اور اس کا پالیسی ریٹ سے کیا تعلق ہے؟",
        rm: "KIBOR kya hai aur iska policy rate se kya ta'alluq hai?",
      },
      answer: {
        en: "KIBOR (Karachi Interbank Offered Rate) is the average interest rate at which major Pakistani banks are willing to lend to each other unsecured in the short-term interbank market. It is published daily by the Financial Markets Association (FMA) for various tenors (overnight, 1-week, 1-month, 3-month, 6-month, 1-year). The 3-month and 6-month KIBOR are widely used as reference rates for corporate and consumer loans. KIBOR tracks the SBP policy rate closely but can diverge during periods of liquidity stress.",
        ur: "KIBOR (کراچی انٹربینک آفرڈ ریٹ) وہ اوسط شرح ہے جس پر پاکستان کے بڑے بینک قلیل مدتی انٹربینک مارکیٹ میں غیر محفوظ بنیادوں پر ایک دوسرے کو قرض دینے کے لیے تیار ہوتے ہیں۔ KIBOR SBP پالیسی ریٹ کو قریب سے فالو کرتا ہے لیکن لیکویڈیٹی دباؤ کے دوران ہٹ سکتا ہے۔",
        rm: "KIBOR (Karachi Interbank Offered Rate) wo aosatan share hai jis par Pakistan ke bare bank qaleel muddat ke interbank market mein ghair mehfooz bunyaadon par ek doosre ko qarz dene ke liye taiyaar hote hain. KIBOR SBP policy rate ko qareeb se follow karta hai lekin liquidity dabaao ke dauran hat sakta hai.",
      },
    },
    {
      question: {
        en: "Can the SBP be independent from the government?",
        ur: "کیا SBP حکومت سے آزاد ہو سکتا ہے؟",
        rm: "Kya SBP hukoomat se azaad ho sakta hai?",
      },
      answer: {
        en: "This is one of Pakistan's most contested institutional questions. The SBP Amendment Act of 2021 (required by the IMF) strengthened formal independence — prohibiting direct government borrowing from the SBP and establishing a more independent MPC. However, de facto independence is harder to guarantee: the SBP Governor is appointed by the government, and political pressure to cut rates to boost pre-election growth has historically undermined the SBP's inflation-fighting credibility. IMF programs include performance criteria that partially enforce monetary discipline.",
        ur: "یہ پاکستان کے سب سے زیادہ متنازعہ ادارہ جاتی سوالات میں سے ایک ہے۔ SBP ترمیمی قانون 2021 (IMF کی ضرورت) نے رسمی خودمختاری کو مضبوط کیا — حکومت کو SBP سے براہ راست قرض لینے سے روکا۔ تاہم، عملی خودمختاری زیادہ مشکل ہے: SBP گورنر حکومت مقرر کرتی ہے، اور الیکشن سے پہلے شرح کم کرنے کا سیاسی دباؤ رہا ہے۔",
        rm: "Yeh Pakistan ke sab se zyada mutanaza idaarajati sawaalaat mein se ek hai. SBP Tarmeemi Qanoon 2021 (IMF ki zaroorat) ne rasmi khudmukhtaari ko mazboot kiya — hukoomat ko SBP se seedha qarz lene se roka. Taham, amali khudmukhtaari zyada mushkil hai: SBP Governor hukoomat muqarrar karti hai, aur election se pehle share kam karne ka siyasi dabaao raha hai.",
      },
    },
  ],
};
