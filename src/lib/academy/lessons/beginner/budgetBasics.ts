import type { Lesson } from "@/lib/academy/types";

export const budgetBasicsLesson: Lesson = {
  slug: "budget-basics",
  category: "beginner",
  title: { en: "Budget Basics: Income, Spending, and Deficits", ur: "بجٹ کی بنیادیں: آمدنی، اخراجات اور خسارہ", rm: "Budget ki Bunyaadein: Aamdani, Ikhraajaati aur Khasaara" },
  subtitle: {
    en: "How governments plan their finances — and what Pakistan's budget numbers actually mean",
    ur: "حکومتیں اپنی مالیات کی منصوبہ بندی کیسے کرتی ہیں — اور پاکستان کے بجٹ کے اعداد و شمار کا اصل مطلب کیا ہے",
    rm: "Hukoomaten apni maaliyaat ki mansoobabadiی kaise karti hain — aur Pakistan ke budget ke adaad-o-shumaar ka asl matlab kya hai",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: [],
  relatedLessonSlugs: ["government-spending-basics", "taxes-intro", "fiscal-vs-monetary"],
  content: {
    overview: {
      en: "A government budget is a plan for how much money the government expects to collect (revenue) and how much it plans to spend (expenditure) over a fiscal year. When spending exceeds revenue, that's a budget deficit — the government must borrow to cover the gap. When revenue exceeds spending, that's a surplus. Pakistan has run fiscal deficits every year for decades — typically 5-8% of GDP — making it chronically dependent on borrowing from domestic banks and international lenders.",
      ur: "حکومتی بجٹ ایک منصوبہ ہے کہ حکومت کتنی رقم جمع کرنے کی توقع رکھتی ہے (آمدنی) اور مالی سال میں کتنا خرچ کرنے کا ارادہ رکھتی ہے (اخراجات)۔ جب اخراجات آمدنی سے زیادہ ہوں، یہ بجٹ خسارہ ہے — حکومت کو خلا پر کرنے کے لیے قرض لینا پڑتا ہے۔ پاکستان نے دہائیوں تک ہر سال مالی خسارے چلائے ہیں — عام طور پر GDP کا 5-8٪۔",
      rm: "Hukoomati budget ek mansooба hai ke hukoomat kitni raqam jamaa karne ki tawaqqu rakhti hai (aamdani) aur maali saal mein kitna kharch karne ka iraada rakhti hai (ikhraajaati). Jab ikhraajaati aamdani se zyada hon, yeh budget khasaara hai — hukoomat ko khala poora karne ke liye qarz lena parta hai. Pakistan ne dahaayon tak har saal maali khasaare chalaye hain — umuman GDP ka 5-8%.",
    },
    whyItMatters: {
      en: "Pakistan's federal budget (announced each June for the coming fiscal year) directly affects your life: it sets tax rates, decides how much goes to education and health, determines defence spending, and reveals how much the government will borrow. The deficit determines how much new debt is added to Pakistan's already-large debt pile. In FY2024, debt servicing (paying back old loans + interest) consumed 50%+ of federal revenues — leaving very little for services, development, or anything else. Understanding the budget lets you understand why Pakistan's government is perpetually cash-strapped.",
      ur: "پاکستان کا وفاقی بجٹ (ہر جون میں آنے والے مالی سال کے لیے اعلان کیا گیا) براہ راست آپ کی زندگی کو متاثر کرتا ہے: یہ ٹیکس کی شرحیں مقرر کرتا ہے، تعلیم اور صحت کو کتنا جاتا ہے اس کا فیصلہ کرتا ہے۔ FY2024 میں، قرضوں کی خدمت (پرانے قرضوں + سود کی واپسی) نے وفاقی آمدنی کا 50٪+ صرف کر لیا۔",
      rm: "Pakistan ka wafaaqi budget (har June mein aane wale maali saal ke liye elaan kiya gaya) baraah-e-raast aapki zindagi ko mutaassir karta hai: yeh tax ki sharhein muqarrar karta hai, taleem aur sehat ko kitna jaata hai is ka faisla karta hai. FY2024 mein, qarzon ki khidmat (porane qarzon + sood ki waapsi) ne wafaaqi aamdani ka 50%+ sarf kar liya.",
    },
    explanation: {
      en: `**Budget components:**

**Revenue (Government Income):**
- Tax revenue: income tax, GST (sales tax), customs duties, FED (Federal Excise Duty)
- Non-tax revenue: profits from state enterprises, central bank profits (SBP surplus), fees, foreign grants

**Expenditure (Government Spending):**
- Current expenditure: day-to-day costs — government salaries, interest on debt, defence, subsidies, pensions
- Development expenditure (PSDP): capital projects — building roads, dams, hospitals, schools

**The deficit:**
- Fiscal deficit = Total expenditure − Total revenue
- Expressed as % of GDP (Pakistan typically 5-8%)
- Financed by: domestic borrowing (T-bills, PIBs from banks), external borrowing (World Bank, ADB, IMF, bilateral loans), printing money (last resort — inflationary)

**Pakistan's FY2024 budget breakdown:**
- Total expenditure: ~Rs14.5 trillion
- Total revenue: ~Rs10 trillion
- Fiscal deficit: ~Rs4-5 trillion (6-7% of GDP)
- Debt servicing alone: ~Rs8 trillion (55%+ of total spending)
- Education: ~Rs0.1 trillion federal (1% of total)
- Health: similarly small federal allocation

**Why the deficit is structural:** Interest payments grow every year (compound interest on old debt). Tax revenue grows slowly (Pakistan's tax base is narrow — just 3 million active tax filers in a nation of 240 million). The gap widens automatically unless either taxes are raised dramatically or spending is cut.`,
      ur: `**بجٹ کے اجزاء:**

**آمدنی (حکومتی آمدنی):**
- ٹیکس آمدنی: آمدنی ٹیکس، GST (فروخت ٹیکس)، کسٹم ڈیوٹی، FED
- غیر ٹیکس آمدنی: سرکاری کاروباری اداروں سے منافع، SBP سرپلس، فیس، غیر ملکی گرانٹ

**اخراجات (حکومتی خرچ):**
- جاری اخراجات: روزمرہ لاگت — سرکاری تنخواہیں، قرض پر سود، دفاع، سبسڈیاں، پنشن
- ترقیاتی اخراجات (PSDP): سرمایہ منصوبے

**خسارہ:**
- مالی خسارہ = کل اخراجات − کل آمدنی
- GDP کے ٪ کے طور پر (پاکستان عام طور پر 5-8٪)

**پاکستان کا FY2024 بجٹ خلاصہ:**
- کل اخراجات: ~Rs14.5 ٹریلین
- کل آمدنی: ~Rs10 ٹریلین
- مالی خسارہ: ~Rs4-5 ٹریلین (GDP کا 6-7٪)
- قرض کی خدمت: ~Rs8 ٹریلین (کل خرچ کا 55٪+)`,
      rm: `**Budget ke ajzaa:**

**Aamdani (Hukoomati aamdani):**
- Tax aamdani: aamdani tax, GST (farokht tax), customs duty, FED
- Ghair-tax aamdani: sarkari kaarobaari idaaron se munaafa, SBP surplus, fees, ghair mulki grant

**Ikhraajaati (Hukoomati kharch):**
- Jaari ikhraajaati: roz-marra lagat — sarkari tankhaahein, qarz par sood, difaa, subsidiyaan, pension
- Taraqiyaati ikhraajaati (PSDP): sarmaaya mansooby

**Khasaara:**
- Maali khasaara = kul ikhraajaati − kul aamdani
- GDP ke % ke tor par (Pakistan umuman 5-8%)

**Pakistan ka FY2024 budget khulasa:**
- Kul ikhraajaati: ~Rs14.5 trillion
- Kul aamdani: ~Rs10 trillion
- Maali khasaara: ~Rs4-5 trillion (GDP ka 6-7%)
- Qarz ki khidmat: ~Rs8 trillion (kul kharch ka 55%+)`,
    },
    misconceptions: {
      en: `**Myth 1: A budget deficit means the government is being irresponsible.** Not automatically — many countries run moderate deficits during downturns or to finance growth-enhancing investment. The problem is chronic, large deficits (Pakistan's case) that compound into unsustainable debt.

**Myth 2: Pakistan's government can just print money to cover the deficit.** Technically possible but highly damaging — money printing causes inflation. Pakistan tried this in 2019-22, contributing to the inflation crisis. IMF programmes explicitly require the government to stop borrowing from the SBP (central bank).

**Myth 3: Reducing the deficit always requires cutting public services.** Alternative: increase tax revenue. Pakistan's tax-to-GDP ratio is 9-10%, far below comparable countries. Broadening the tax base (taxing agriculture, retailers, the informal economy) could raise revenue without cutting services.`,
      ur: `**غلط فہمی 1: بجٹ خسارہ کا مطلب ہے حکومت غیر ذمہ دار ہے۔** خودکار طور پر نہیں — بہت سے ممالک مندی کے دوران یا ترقی بڑھانے والی سرمایہ کاری کے لیے اعتدال پسند خسارے چلاتے ہیں۔ مسئلہ دائمی، بڑے خسارے (پاکستان کا کیس) ہیں جو غیر پائیدار قرض میں مرکب ہوتے ہیں۔

**غلط فہمی 2: پاکستانی حکومت صرف خسارے کو پورا کرنے کے لیے پیسہ چھاپ سکتی ہے۔** یہ افراط زر کا باعث بنتا ہے۔ IMF پروگرام واضح طور پر حکومت کو SBP سے قرض لینا بند کرنے کا تقاضا کرتے ہیں۔

**غلط فہمی 3: خسارہ کم کرنے کے لیے ہمیشہ عوامی خدمات کاٹنے کی ضرورت ہے۔** متبادل: ٹیکس آمدنی بڑھائیں۔`,
      rm: `**Ghalat fehmi 1: Budget khasaara ka matlab hai hukoomat ghair zimmedaar hai.** Khudkaar tor par nahin — bahut se mumaalik mandi ke dauran ya taraqqi barhane wali sarmaaya kaari ke liye aitedaal pasand khasaare chalate hain.

**Ghalat fehmi 2: Pakistani hukoomat sirf khasaare ko poora karne ke liye paisa chhaap sakti hai.** Yeh afrat-e-zer ka baais banta hai. IMF programme waazeh tor par hukoomat ko SBP se qarz lena band karne ka taqaaza karte hain.

**Ghalat fehmi 3: Khasaara kam karne ke liye hamesha amoomi khadamaat kaatne ki zaroorat hai.** Mutabaadil: tax aamdani barhaaein.`,
    },
    pakistanExample: {
      en: `**The debt servicing trap:** In FY2024, Pakistan's federal government collected approximately Rs10 trillion in revenue. But it owed ~Rs8 trillion just for debt servicing (paying interest on old domestic loans + repaying foreign debt). That left only ~Rs2 trillion for everything else: defence (~Rs1.9 trillion), development (PSDP ~Rs1 trillion), education, health, subsidies, pensions, and all other spending. The math doesn't work — hence the deficit. This isn't a one-year problem: years of annual deficits, each adding to the debt pile, have compounded Pakistan into a debt trap where debt servicing crowds out all productive spending.`,
      ur: `**قرض کی خدمت کا جال:** FY2024 میں، پاکستان کی وفاقی حکومت نے تقریباً Rs10 ٹریلین آمدنی اکٹھی کی۔ لیکن اسے صرف قرض کی خدمت کے لیے ~Rs8 ٹریلین واجب تھے (پرانے قرضوں پر سود ادا کرنا + غیر ملکی قرض کی واپسی)۔ اس نے باقی سب کے لیے صرف ~Rs2 ٹریلین چھوڑے: دفاع (~Rs1.9 ٹریلین)، ترقی، تعلیم، صحت۔ یہ ایک سالہ مسئلہ نہیں ہے: سالانہ خسارے کے سال پاکستان کو قرض کے جال میں ڈال چکے ہیں۔`,
      rm: `**Qarz ki khidmat ka jaal:** FY2024 mein, Pakistan ki wafaaqi hukoomat ne taqreeban Rs10 trillion aamdani ikatthi ki. Lekin use sirf qarz ki khidmat ke liye ~Rs8 trillion waajib the (porane qarzon par sood ada karna + ghair mulki qarz ki waapsi). Is ne baaki sab ke liye sirf ~Rs2 trillion chhaade: difaa (~Rs1.9 trillion), taraqqi, taleem, sehat. Yeh ek-saala masla nahin hai: saalaana khasaare ke saal Pakistan ko qarz ke jaal mein daal chuke hain.`,
    },
    realWorld: {
      en: "The US runs large budget deficits (typically 3-6% of GDP) year after year, yet doesn't face the same crisis as Pakistan. Why? Three reasons: (1) The dollar is the world's reserve currency — US can borrow in its own currency; (2) US debt markets are deep and liquid — large volumes can be absorbed; (3) US has a broad tax base and high revenue collection. Pakistan lacks all three. This is why a 6% deficit in Pakistan is far more dangerous than the same in the US — context determines sustainability.",
      ur: "امریکہ سال بعد سال بڑے بجٹ خسارے (عام طور پر GDP کا 3-6٪) چلاتا ہے، پھر بھی پاکستان جیسے بحران کا سامنا نہیں کرتا۔ کیوں؟ تین وجوہات: (1) ڈالر دنیا کی ریزرو کرنسی ہے — امریکہ اپنی کرنسی میں قرض لے سکتا ہے؛ (2) امریکی قرض بازار گہرے اور مائع ہیں؛ (3) امریکہ کے پاس وسیع ٹیکس بیس ہے۔ پاکستان کے پاس تینوں نہیں ہیں۔",
      rm: "America saal baad saal bare budget khasaare (umuman GDP ka 3-6%) chalata hai, phir bhi Pakistan jaise bohran ka saamna nahin karta. Kyun? Teen wajoohaatein: (1) Dollar duniya ki reserve currency hai — America apni currency mein qarz le sakta hai; (2) Amreeki qarz baazaar gehre aur maayi hain; (3) America ke paas wasee tax base hai. Pakistan ke paas teenon nahin hain.",
    },
    summary: {
      en: "• Budget = revenue plan + expenditure plan for one fiscal year\n• Fiscal deficit = spending > revenue → must borrow to cover gap\n• Pakistan's deficit: typically 5-8% of GDP, financed by domestic + external borrowing\n• Debt servicing: consumed ~Rs8 trillion of ~Rs10 trillion revenue in FY2024\n• Structural problem: narrow tax base + compounding old debt = ever-widening gap\n• IMF programmes aim to shrink the deficit via higher taxes and spending cuts",
      ur: "• بجٹ = ایک مالی سال کے لیے آمدنی کا منصوبہ + اخراجات کا منصوبہ\n• مالی خسارہ = اخراجات > آمدنی → خلا پر کرنے کے لیے قرض لینا ہوگا\n• پاکستان کا خسارہ: عام طور پر GDP کا 5-8٪، ملکی + بیرونی قرض سے فنانس\n• قرض کی خدمت: FY2024 میں ~Rs10 ٹریلین آمدنی میں سے ~Rs8 ٹریلین صرف ہوئے\n• ساختی مسئلہ: تنگ ٹیکس بیس + پرانے قرض کا مرکب = ہمیشہ بڑھتا ہوا خلا\n• IMF پروگرام اعلی ٹیکس اور اخراجات کٹوتی کے ذریعے خسارہ کم کرنے کا ہدف رکھتے ہیں",
      rm: "• Budget = ek maali saal ke liye aamdani ka mansooба + ikhraajaati ka mansooба\n• Maali khasaara = ikhraajaati > aamdani → khala poora karne ke liye qarz lena hoga\n• Pakistan ka khasaara: umuman GDP ka 5-8%, mulki + baeruni qarz se finance\n• Qarz ki khidmat: FY2024 mein ~Rs10 trillion aamdani mein se ~Rs8 trillion sarf hue\n• Saakhti masla: tang tax base + porane qarz ka murakkab = hamesha barhta hua khala\n• IMF programme aali tax aur ikhraajaati katoti ke zariye khasaara kam karne ka hadaf rakhte hain",
    },
  },
  quiz: [
    {
      question: { en: "Pakistan's government collects Rs10 trillion in revenue but spends Rs14 trillion. What is the fiscal deficit?", ur: "پاکستان کی حکومت Rs10 ٹریلین آمدنی جمع کرتی ہے لیکن Rs14 ٹریلین خرچ کرتی ہے۔ مالی خسارہ کیا ہے؟", rm: "Pakistan ki hukoomat Rs10 trillion aamdani jamaa karti hai lekin Rs14 trillion kharch karti hai. Maali khasaara kya hai?" },
      options: [
        { en: "Rs10 trillion", ur: "Rs10 ٹریلین", rm: "Rs10 trillion" },
        { en: "Rs4 trillion", ur: "Rs4 ٹریلین", rm: "Rs4 trillion" },
        { en: "Rs14 trillion", ur: "Rs14 ٹریلین", rm: "Rs14 trillion" },
        { en: "Rs24 trillion", ur: "Rs24 ٹریلین", rm: "Rs24 trillion" },
      ],
      correctIndex: 1,
      explanation: { en: "Fiscal deficit = Total expenditure − Total revenue = Rs14 trillion − Rs10 trillion = Rs4 trillion. This gap must be financed through borrowing — from banks (selling T-bills) or from external lenders (World Bank, IMF, bilateral loans).", ur: "مالی خسارہ = کل اخراجات − کل آمدنی = Rs14 ٹریلین − Rs10 ٹریلین = Rs4 ٹریلین۔ اس خلا کو قرض کے ذریعے فنانس کرنا ہوگا — بینکوں سے (T-bills بیچ کر) یا بیرونی قرض دہندگان سے۔", rm: "Maali khasaara = kul ikhraajaati − kul aamdani = Rs14 trillion − Rs10 trillion = Rs4 trillion. Is khala ko qarz ke zariye finance karna hoga — bankon se (T-bills bech kar) ya baeruni qarz dehandgaan se." },
    },
    {
      question: { en: "In FY2024, Pakistan's debt servicing consumed about 50%+ of federal revenues. This means:", ur: "FY2024 میں، پاکستان کی قرض کی خدمت نے وفاقی آمدنی کا تقریباً 50٪+ صرف کر لیا۔ اس کا مطلب ہے:", rm: "FY2024 mein, Pakistan ki qarz ki khidmat ne wafaaqi aamdani ka taqreeban 50%+ sarf kar liya. Is ka matlab hai:" },
      options: [
        { en: "Pakistan has very efficient debt management", ur: "پاکستان کا قرض انتظام بہت مؤثر ہے", rm: "Pakistan ka qarz intzaam bahut moassir hai" },
        { en: "Less than half of revenues were available for education, health, defence, and everything else", ur: "آمدنی کا نصف سے بھی کم تعلیم، صحت، دفاع اور باقی سب کے لیے دستیاب تھا", rm: "Aamdani ka nisf se bhi kam taleem, sehat, difaa aur baaki sab ke liye dastaab tha" },
        { en: "Pakistan has no fiscal problem because interest is being paid", ur: "پاکستان کا کوئی مالی مسئلہ نہیں کیونکہ سود ادا ہو رہا ہے", rm: "Pakistan ka koi maali masla nahin kyunke sood ada ho raha hai" },
        { en: "Pakistan's debt is decreasing rapidly", ur: "پاکستان کا قرض تیزی سے کم ہو رہا ہے", rm: "Pakistan ka qarz tezi se kam ho raha hai" },
      ],
      correctIndex: 1,
      explanation: { en: "When Rs8 of every Rs10 in revenue goes to debt servicing, only Rs2 remains for all other government functions. This structural problem — inherited from decades of deficit spending — severely limits Pakistan's ability to invest in education, health, and development.", ur: "جب ہر Rs10 آمدنی میں سے Rs8 قرض کی خدمت پر جاتے ہیں، صرف Rs2 تمام دیگر حکومتی کام کے لیے باقی رہتے ہیں۔ یہ ساختی مسئلہ — دہائیوں کے خسارے کے اخراجات سے وراثت میں ملا — تعلیم، صحت اور ترقی میں سرمایہ کاری کرنے کی پاکستان کی صلاحیت کو شدید طور پر محدود کرتا ہے۔", rm: "Jab har Rs10 aamdani mein se Rs8 qarz ki khidmat par jaate hain, sirf Rs2 tamam doosre hukoomati kaam ke liye baaki rehte hain. Yeh saakhti masla — dahaayon ke khasaare ke ikhraajaati se wiraasat mein mila — taleem, sehat aur taraqqi mein sarmaaya kaari karne ki Pakistan ki salaaḥiyat ko shadeed tor par mahdood karta hai." },
    },
    {
      question: { en: "How does Pakistan finance its budget deficit?", ur: "پاکستان اپنے بجٹ خسارے کو کیسے فنانس کرتا ہے؟", rm: "Pakistan apne budget khasaare ko kaise finance karta hai?" },
      options: [
        { en: "By selling state assets every year", ur: "ہر سال سرکاری اثاثے بیچ کر", rm: "Har saal sarkari aasiye bech kar" },
        { en: "Through borrowing — domestic T-bills/PIBs from banks and external loans from World Bank, IMF, bilateral lenders", ur: "قرض لینے کے ذریعے — بینکوں سے ملکی T-bills/PIBs اور ورلڈ بینک، IMF، دو طرفہ قرض دہندگان سے بیرونی قرضے", rm: "Qarz lene ke zariye — bankon se mulki T-bills/PIBs aur World Bank, IMF, do-tarfa qarz dehandgaan se baeruni qarzay" },
        { en: "By printing new money only", ur: "صرف نئے پیسے چھاپ کر", rm: "Sirf naye paise chhaap kar" },
        { en: "Pakistan always runs a surplus and saves the money", ur: "پاکستان ہمیشہ سرپلس چلاتا ہے اور پیسہ بچاتا ہے", rm: "Pakistan hamesha surplus chalata hai aur paisa bachata hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Pakistan's deficit is mainly financed through: (1) Domestic borrowing — selling Treasury Bills (3-month, 6-month, 12-month) and Pakistan Investment Bonds (PIBs, longer-term) to commercial banks; (2) External borrowing — IMF programme loans, World Bank/ADB project loans, bilateral loans from Saudi Arabia, UAE, China. Money printing (SBP borrowing) has been curtailed under IMF conditionality.", ur: "پاکستان کا خسارہ بنیادی طور پر اس طرح فنانس ہوتا ہے: (1) ملکی قرض — تجارتی بینکوں کو T-bills اور PIBs بیچنا؛ (2) بیرونی قرض — IMF، ورلڈ بینک/ADB، دو طرفہ قرضے۔ IMF شرائط کے تحت SBP سے قرض لینا محدود کیا گیا ہے۔", rm: "Pakistan ka khasaara bunyaadi tor par is tarah finance hota hai: (1) Mulki qarz — tijarati bankon ko T-bills aur PIBs bechna; (2) Baeruni qarz — IMF, World Bank/ADB, do-tarfa qarzay. IMF sharaaeet ke tehet SBP se qarz lena mahdood kiya gaya hai." },
    },
    {
      question: { en: "Pakistan's tax-to-GDP ratio is about 9-10%. What does this tell us?", ur: "پاکستان کی ٹیکس سے GDP تناسب تقریباً 9-10٪ ہے۔ یہ ہمیں کیا بتاتا ہے؟", rm: "Pakistan ki tax-to-GDP tanasub taqreeban 9-10% hai. Yeh hamein kya batata hai?" },
      options: [
        { en: "Pakistan has an efficient tax system", ur: "پاکستان کا ٹیکس نظام مؤثر ہے", rm: "Pakistan ka tax nizam moassir hai" },
        { en: "Pakistan collects relatively little tax — most comparable countries collect 15-25%", ur: "پاکستان نسبتاً کم ٹیکس جمع کرتا ہے — زیادہ تر موازنہ قابل ممالک 15-25٪ جمع کرتے ہیں", rm: "Pakistan nisbatan kam tax jamaa karta hai — zyada tar muwaazna qaabil mumaalik 15-25% jamaa karte hain" },
        { en: "Pakistan taxes 90% of its GDP", ur: "پاکستان اپنے GDP کا 90٪ ٹیکس لگاتا ہے", rm: "Pakistan apne GDP ka 90% tax lagata hai" },
        { en: "Only 9-10 people pay taxes in Pakistan", ur: "صرف 9-10 لوگ پاکستان میں ٹیکس ادا کرتے ہیں", rm: "Sirf 9-10 log Pakistan mein tax ada karte hain" },
      ],
      correctIndex: 1,
      explanation: { en: "A 9-10% tax-to-GDP ratio is very low by international standards. Bangladesh: ~10%, India: ~18%, Turkey: ~25%, OECD average: ~34%. Pakistan under-taxes its economy — agriculture is largely exempt, large informal sector pays no tax, many wealthy individuals evade through underreporting. This is the root cause of Pakistan's revenue problem.", ur: "9-10٪ ٹیکس سے GDP تناسب بین الاقوامی معیار کے مطابق بہت کم ہے۔ بنگلہ دیش: ~10٪، بھارت: ~18٪، ترکی: ~25٪، OECD اوسط: ~34٪۔ پاکستان اپنی معیشت کو کم ٹیکس کرتا ہے — زراعت زیادہ تر مستثنیٰ ہے، بڑا غیر رسمی شعبہ کوئی ٹیکس نہیں دیتا۔", rm: "9-10% tax-to-GDP tanasub bain-ul-aqwaami miyaar ke mutaabiq bahut kam hai. Bangladesh: ~10%, India: ~18%, Turkey: ~25%, OECD ausat: ~34%. Pakistan apni muaashat ko kam tax karta hai — ziraat zyada tar mustasna hai, bara ghair-rasmi shuba koi tax nahin deta." },
    },
  ],
  faq: [
    {
      question: { en: "Why does Pakistan keep borrowing instead of fixing its fiscal problem?", ur: "پاکستان اپنے مالی مسئلے کو ٹھیک کرنے کی بجائے قرض لینا کیوں جاری رکھتا ہے؟", rm: "Pakistan apne maali masle ko theek karne ki bajaaye qarz lena kyun jaari rakhta hai?" },
      answer: { en: "Because fixing it requires painful choices: raising taxes on powerful constituencies (agriculture landlords, large retailers, real estate) or cutting popular spending (subsidies, government jobs, defence). Both are politically costly. Borrowing avoids immediate pain — politicians can defer the problem to the next government or the next generation. Pakistan's political economy consistently rewards short-term populism over long-term fiscal discipline. IMF programmes force temporary discipline, but once the programme ends, old habits often return. The structural fix requires a political coalition willing to endure short-term unpopularity for long-term stability — historically very rare in Pakistan.", ur: "کیونکہ اسے ٹھیک کرنے کے لیے تکلیف دہ انتخاب کی ضرورت ہے: طاقتور حلقوں (زرعی زمینداروں، بڑے خوردہ فروشوں) پر ٹیکس بڑھانا یا مقبول اخراجات کم کرنا (سبسڈیاں، سرکاری ملازمتیں)۔ دونوں سیاسی طور پر مہنگے ہیں۔ قرض لینا فوری تکلیف سے بچاتا ہے۔ IMF پروگرام عارضی نظم و ضبط مجبور کرتے ہیں، لیکن ایک بار پروگرام ختم ہونے پر، پرانی عادات اکثر واپس آ جاتی ہیں۔", rm: "Kyunke ise theek karne ke liye takleef deh intikhab ki zaroorat hai: taaqatwar halqon (ziraati zamiindaaron, bare khudraa-faroshoN) par tax barhana ya maqbool ikhraajaati kam karna (subsidiyaan, sarkari mulaazmaten). Dono siyaasi tor par mahange hain. Qarz lena fori takleef se bachaata hai. IMF programme aarzi nazm-o-zabt majboor karte hain, lekin ek baar programme khatam hone par, porani aadatein aksar waapis aa jaati hain." },
    },
  ],
};
