import type { Lesson } from "@/lib/academy/types";

export const interestRatesBasicsLesson: Lesson = {
  slug: "interest-rates-basics",
  category: "beginner",
  title: { en: "Interest Rates Explained", ur: "شرح سود کی وضاحت", rm: "Shar-e-Sood ki Wazaahat" },
  subtitle: {
    en: "Why borrowing costs money, how interest rates affect your savings, and why the SBP's rate matters to everyone",
    ur: "قرض لینے میں پیسہ کیوں لگتا ہے، شرح سود آپ کی بچت کو کیسے متاثر کرتی ہے، اور SBP کی شرح سب کو کیوں اہم ہے",
    rm: "Qarz lene mein paisa kyun lagta hai, shar-e-sood aap ki bachat ko kaise mutaassir karti hai, aur SBP ki shar sab ko kyun ahem hai",
  },
  level: "beginner",
  readMinutes: 8,
  isPremium: false,
  relatedIndicatorSlugs: ["policy-rate-pakistan", "kibor-rate"],
  relatedLessonSlugs: ["central-banking", "inflation", "money-and-currency"],
  content: {
    overview: {
      en: "An interest rate is the price of borrowing money — expressed as a percentage of the loan per year. If you borrow Rs 100,000 at 15% interest, you pay Rs 15,000 per year to the lender. Interest rates determine how expensive it is to borrow, how rewarding it is to save, and how much investment happens in the economy.",
      ur: "شرح سود قرض لینے کی قیمت ہے — سالانہ قرض کی فیصد کے طور پر ظاہر کی جاتی ہے۔ اگر آپ 1 لاکھ روپے 15% سود پر قرض لیں، آپ قرض دہندہ کو سالانہ 15,000 روپے ادا کرتے ہیں۔",
      rm: "Shar-e-sood qarz lene ki qeemat hai — saalaana qarz ki feesad ke tor par zaahir ki jaati hai. Agar aap 1 laakh rupay 15% sood par qarz len, aap qarz dihandah ko saalaana 15,000 rupay ada karte hain.",
    },
    whyItMatters: {
      en: "Pakistan's policy rate hit 22% in June 2023 — the highest in decades. This made mortgages, business loans, and car financing enormously expensive. A businessman who could afford a factory loan at 8% in 2020 couldn't afford one at 22% — so investment dried up. Interest rates are the single most powerful lever central banks use to control inflation and economic activity.",
      ur: "پاکستان کی پالیسی ریٹ جون 2023 میں 22% تک پہنچی — دہائیوں میں سب سے زیادہ۔ اس سے قرضے بہت مہنگے ہو گئے۔ ایک کاروباری جو 2020 میں 8% پر فیکٹری قرض برداشت کر سکتا تھا، وہ 22% پر نہیں کر سکتا تھا — اس لیے سرمایہ کاری خشک ہو گئی۔",
      rm: "Pakistan ki policy rate June 2023 mein 22% tak pahunchi — dahaayon mein sab se zyada. Is se qarzay bahut mahangay ho gaye. Ek kaarobaari jo 2020 mein 8% par factory qarz bardaasht kar sakta tha, woh 22% par nahi kar sakta tha.",
    },
    explanation: {
      en: `**Why interest exists:** Lenders give up current use of money and take risk. They demand compensation — that's interest. Borrowers pay because access to money now (to invest, buy, or cover emergencies) is worth paying for.

**Simple vs compound interest:** Simple interest is a fixed percentage of the original amount each period. Compound interest calculates interest on interest — so Rs 100,000 at 12% compounded monthly grows faster than at 12% simple annual interest. Most bank accounts and loans use compound interest, which is why debts can balloon quickly.

**Policy rate transmission:** The SBP sets a policy rate (currently the target for the overnight market). Commercial banks borrow from SBP at this rate, so their own lending rates are linked to it. When SBP raises the policy rate, banks raise their loan rates — making borrowing expensive — and raise savings rates (attracting deposits). This slows consumer spending and business investment, cooling inflation.`,
      ur: `**سود کیوں ہوتا ہے:** قرض دہندگان پیسے کا موجودہ استعمال چھوڑتے ہیں اور خطرہ اٹھاتے ہیں۔ وہ معاوضہ مانگتے ہیں — یہی سود ہے۔

**سادہ بمقابلہ مرکب سود:** سادہ سود اصل رقم کا مقررہ فیصد ہے۔ مرکب سود سود پر سود حساب کرتا ہے — قرض جلدی بڑھ سکتا ہے۔

**پالیسی ریٹ کا اثر:** SBP پالیسی ریٹ مقرر کرتا ہے۔ تجارتی بینک اس ریٹ پر SBP سے قرض لیتے ہیں، اس لیے ان کی اپنی قرضہ شرحیں اس سے منسلک ہیں۔`,
      rm: `**Sood kyun hota hai:** Qarz dihandagaan paise ka maujoodah istemal chhodtay hain aur khatara uthaate hain. Woh muaawza maangde hain — yahi sood hai.

**Saada bamuqaabila marakkab sood:** Saada sood asl raqam ka muqarrara feesad hai. Marakkab sood sood par sood hisaab karta hai — qarz jaldi barh sakta hai.

**Policy rate ka asar:** SBP policy rate muqarrar karta hai. Tijarati bank is rate par SBP se qarz lete hain, is liye un ki apni qarza sharayein is se munsalik hain.`,
    },
    misconceptions: {
      en: `**Myth 1: High interest rates always hurt the economy.** High rates do slow growth but also control inflation. Pakistan's 22% rate in 2023 was painful but aimed at breaking inflation that was destroying household purchasing power even more.

**Myth 2: Islamic banking has no interest.** Islamic finance replaces interest with profit-and-loss sharing arrangements (Murabaha, Musharaka, Ijarah) that achieve similar economic functions but comply with Shariah principles banning riba.

**Myth 3: The bank pays you interest out of kindness.** Banks pay you deposit interest because they lend out your money to borrowers at a higher rate, keeping the 'spread' as profit. Your savings fund someone else's loan.`,
      ur: `**غلط فہمی 1: زیادہ شرح سود ہمیشہ معیشت کو نقصان پہنچاتی ہے۔** زیادہ شرحیں ترقی کو سست کرتی ہیں لیکن مہنگائی بھی کنٹرول کرتی ہیں۔

**غلط فہمی 2: اسلامی بینکاری میں سود نہیں ہوتا۔** اسلامی مالیات سود کو نفع و نقصان کے اشتراک سے تبدیل کرتا ہے جو شریعت کی تعمیل کرتا ہے۔

**غلط فہمی 3: بینک مہربانی سے سود دیتا ہے۔** بینک آپ کا پیسہ قرض دار کو زیادہ شرح پر قرض دیتا ہے، فرق بطور منافع رکھتا ہے۔`,
      rm: `**Ghalat fehmi 1: Zyada shar-e-sood hamesha muaashat ko nuqsaan pahunchaati hai.** Zyada sharayein taraqqi ko sust karti hain lekin mahangaai bhi control karti hain.

**Ghalat fehmi 2: Islami bainkari mein sood nahi hota.** Islami maaliaat sood ko nafa-o-nuqsaan ke ishtiraak se tabdeel karta hai.

**Ghalat fehmi 3: Bank meherbaani se sood deta hai.** Bank aap ka paisa qarz daar ko zyada shar par qarz deta hai, farq bataur munaafa rakhta hai.`,
    },
    pakistanExample: {
      en: `**Pakistan's rate cycle 2020-2024:** SBP cut the policy rate to 7% in 2020 (COVID stimulus) — cheap borrowing boosted consumer spending but also contributed to a current account deficit surge. By June 2023, the rate reached 22% to fight 38% CPI inflation. By June 2024, with inflation falling to ~12%, SBP began cutting — reaching 13.5% by December 2024. Each swing rippled through mortgages, car financing, government debt costs, and the stock market.`,
      ur: `**پاکستان کا ریٹ سائیکل 2020-2024:** SBP نے 2020 میں پالیسی ریٹ 7% تک کم کیا (COVID محرک) — سستے قرض نے اخراجات بڑھائے لیکن جاری کھاتے کا خسارہ بھی بڑھا۔ جون 2023 تک، 38% CPI مہنگائی سے لڑنے کے لیے ریٹ 22% پہنچ گیا۔`,
      rm: `**Pakistan ka rate cycle 2020-2024:** SBP ne 2020 mein policy rate 7% tak kam kiya (COVID muhrik) — saste qarz ne ikhraajahat barhaaye lekin jaari khaate ka khisaara bhi barha. June 2023 tak, 38% CPI mahangaai se larne ke liye rate 22% pahunch gaya.`,
    },
    realWorld: {
      en: "In 2022, the US Federal Reserve raised rates from near-zero to 5.25% in just 16 months to fight 9% inflation. This caused mortgage rates to double, slowing the housing market, and made the US dollar more attractive globally — which meant capital flowed out of emerging markets like Pakistan, adding pressure to the rupee. Global interest rate cycles ripple across the world.",
      ur: "2022 میں، امریکی فیڈرل ریزرو نے 9% مہنگائی سے لڑنے کے لیے صرف 16 ماہ میں ریٹ تقریباً صفر سے 5.25% تک بڑھا دیا۔ اس سے رہن کی شرحیں دوگنی ہوئیں اور ڈالر عالمی سطح پر زیادہ کشش پذیر ہوا — جس سے پاکستان جیسے ابھرتے بازاروں سے سرمایہ نکلا۔",
      rm: "2022 mein, Amriki Federal Reserve ne 9% mahangaai se larne ke liye sirf 16 mahine mein rate taqreeban sifar se 5.25% tak barha diya. Is se rehan ki sharayein dugni huin aur dollar aalami satah par zyada kashish pazeer hua.",
    },
    summary: {
      en: "• Interest rate = price of borrowing money (% of loan per year)\n• Borrowers pay it; savers earn it on deposits\n• SBP policy rate is the anchor for all Pakistani interest rates\n• Higher rates: slow economy, fight inflation; lower rates: stimulate growth\n• Compound interest makes debts grow fast — understand it before borrowing\n• Islamic finance replaces interest with Shariah-compliant profit arrangements",
      ur: "• شرح سود = قرض لینے کی قیمت (سالانہ قرض کا %)\n• قرض لینے والے ادا کرتے ہیں؛ بچت کنندگان جمع پر کماتے ہیں\n• SBP پالیسی ریٹ تمام پاکستانی شرحوں کا لنگر ہے\n• زیادہ شرحیں: معیشت سست، مہنگائی کنٹرول؛ کم شرحیں: ترقی کی حوصلہ افزائی\n• مرکب سود قرض تیزی سے بڑھاتا ہے",
      rm: "• Shar-e-sood = qarz lene ki qeemat (saalaana qarz ka %)\n• Qarz lene wale ada karte hain; bachat kunandagaan jama par kamaate hain\n• SBP policy rate tamam Pakistani sharayon ka langar hai\n• Zyada sharayein: muaashat sust, mahangaai control; kam sharayein: taraqqi ki hosla afzaai\n• Marakkab sood qarz tezi se barhata hai",
    },
  },
  quiz: [
    {
      question: { en: "If you borrow Rs 50,000 at 10% annual simple interest for 2 years, how much total interest do you pay?", ur: "اگر آپ 2 سال کے لیے 10% سالانہ سادہ سود پر 50,000 روپے قرض لیں، آپ کل کتنا سود ادا کرتے ہیں؟", rm: "Agar aap 2 saal ke liye 10% saalaana saada sood par 50,000 rupay qarz len, aap kul kitna sood ada karte hain?" },
      options: [
        { en: "Rs 5,000", ur: "5,000 روپے", rm: "5,000 rupay" },
        { en: "Rs 10,000", ur: "10,000 روپے", rm: "10,000 rupay" },
        { en: "Rs 15,000", ur: "15,000 روپے", rm: "15,000 rupay" },
        { en: "Rs 20,000", ur: "20,000 روپے", rm: "20,000 rupay" },
      ],
      correctIndex: 1,
      explanation: { en: "10% of Rs 50,000 = Rs 5,000 per year. Over 2 years = Rs 10,000 total interest. Simple interest doesn't compound.", ur: "50,000 کا 10% = 5,000 روپے سالانہ۔ 2 سال میں = 10,000 روپے کل سود۔ سادہ سود مرکب نہیں ہوتا۔", rm: "50,000 ka 10% = 5,000 rupay saalaana. 2 saal mein = 10,000 rupay kul sood. Saada sood marakkab nahi hota." },
    },
    {
      question: { en: "When SBP raises the policy rate, what typically happens to business investment?", ur: "جب SBP پالیسی ریٹ بڑھاتا ہے، کاروباری سرمایہ کاری پر عام طور پر کیا اثر پڑتا ہے؟", rm: "Jab SBP policy rate barhata hai, kaarobaari sarmaaya kaari par aam tor par kya asar parta hai?" },
      options: [
        { en: "Investment rises sharply", ur: "سرمایہ کاری تیزی سے بڑھتی ہے", rm: "Sarmaaya kaari tezi se barhti hai" },
        { en: "Investment falls as loans become more expensive", ur: "قرضے مہنگے ہونے سے سرمایہ کاری کم ہوتی ہے", rm: "Qarzay mahangay hone se sarmaaya kaari kam hoti hai" },
        { en: "No effect on investment", ur: "سرمایہ کاری پر کوئی اثر نہیں", rm: "Sarmaaya kaari par koi asar nahi" },
        { en: "Investment stays exactly the same", ur: "سرمایہ کاری بالکل وہی رہتی ہے", rm: "Sarmaaya kaari bilkul wahi rahti hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Higher policy rates raise borrowing costs for businesses. Projects that were profitable at 10% loans become unprofitable at 20% — so companies borrow and invest less.", ur: "زیادہ پالیسی ریٹ کاروباروں کے لیے قرض لینے کی لاگت بڑھاتی ہے۔ 10% قرض پر منافع بخش منصوبے 20% پر غیر منافع بخش ہو جاتے ہیں۔", rm: "Zyada policy rate karobaaron ke liye qarz lene ki lagat barhati hai. 10% qarz par munaafa bakhsh mansoobe 20% par ghair munaafa bakhsh ho jaate hain." },
    },
    {
      question: { en: "Why did Pakistan's SBP raise the policy rate to 22% in 2023?", ur: "پاکستان کے SBP نے 2023 میں پالیسی ریٹ 22% تک کیوں بڑھایا؟", rm: "Pakistan ke SBP ne 2023 mein policy rate 22% tak kyun barhaaya?" },
      options: [
        { en: "To attract more foreign direct investment", ur: "زیادہ غیر ملکی براہ راست سرمایہ کاری کو راغب کرنے کے لیے", rm: "Zyada ghair mulki baraah-e-raast sarmaaya kaari ko raghib karne ke liye" },
        { en: "To fight 38% CPI inflation", ur: "38% CPI مہنگائی سے لڑنے کے لیے", rm: "38% CPI mahangaai se larne ke liye" },
        { en: "To weaken the rupee intentionally", ur: "جان بوجھ کر روپے کو کمزور کرنے کے لیے", rm: "Jaanboojhkar rupay ko kamzor karne ke liye" },
        { en: "To increase government spending", ur: "حکومتی اخراجات بڑھانے کے لیے", rm: "Hukomaati ikhraajahat barhaane ke liye" },
      ],
      correctIndex: 1,
      explanation: { en: "With CPI inflation hitting nearly 38%, SBP raised rates aggressively to reduce spending and money supply growth, eventually bringing inflation down toward 12% by mid-2024.", ur: "CPI مہنگائی تقریباً 38% تک پہنچنے کے ساتھ، SBP نے اخراجات اور رقم کی فراہمی کی ترقی کو کم کرنے کے لیے جارحانہ طور پر شرحیں بڑھائیں۔", rm: "CPI mahangaai taqreeban 38% tak pahunchne ke saath, SBP ne ikhraajahat aur raqam ki faraahami ki taraqqi ko kam karne ke liye jaarchanaana tor par sharayein barhaain." },
    },
    {
      question: { en: "What is the key difference between simple interest and compound interest?", ur: "سادہ اور مرکب سود کے درمیان بنیادی فرق کیا ہے؟", rm: "Saada aur marakkab sood ke darmiyan bunyaadi farq kya hai?" },
      options: [
        { en: "Simple interest is illegal in Pakistan", ur: "سادہ سود پاکستان میں غیر قانونی ہے", rm: "Saada sood Pakistan mein ghair qaanooni hai" },
        { en: "Compound interest charges interest on previously earned interest", ur: "مرکب سود پہلے سے حاصل سود پر سود لگاتا ہے", rm: "Marakkab sood pehle se haasil sood par sood lagaata hai" },
        { en: "Simple interest always costs more over time", ur: "سادہ سود ہمیشہ وقت کے ساتھ زیادہ مہنگا ہوتا ہے", rm: "Saada sood hamesha waqt ke saath zyada mahanga hota hai" },
        { en: "They are the same thing", ur: "وہ ایک ہی چیز ہیں", rm: "Woh ek hi cheez hain" },
      ],
      correctIndex: 1,
      explanation: { en: "With compound interest, you earn (or pay) interest on the accumulated interest, not just the original principal. This exponential growth makes compound interest far more powerful over time — great for savings, dangerous for debts.", ur: "مرکب سود کے ساتھ، آپ جمع شدہ سود پر بھی سود کماتے (یا ادا کرتے) ہیں، نہ کہ صرف اصل رقم پر۔ یہ بڑھوتری وقت کے ساتھ مرکب سود کو بہت طاقتور بناتی ہے۔", rm: "Marakkab sood ke saath, aap jama shuda sood par bhi sood kamaate (ya ada karte) hain, nah ke sirf asl raqam par. Yeh barhotar waqt ke saath marakkab sood ko bahut taaqatwar banati hai." },
    },
  ],
  faq: [
    {
      question: { en: "How does KIBOR relate to the policy rate?", ur: "KIBOR کا پالیسی ریٹ سے کیا تعلق ہے؟", rm: "KIBOR ka policy rate se kya taluq hai?" },
      answer: { en: "KIBOR (Karachi Interbank Offered Rate) is the rate at which Pakistani banks lend to each other overnight. It closely tracks the SBP policy rate and serves as the benchmark for corporate loans — when you see a loan priced at 'KIBOR + 2%', the '2%' is the bank's margin above the benchmark.", ur: "KIBOR (کراچی انٹربینک آفرڈ ریٹ) وہ شرح ہے جس پر پاکستانی بینک ایک دوسرے کو راتوں رات قرض دیتے ہیں۔ یہ SBP پالیسی ریٹ کو قریب سے ٹریک کرتا ہے اور کارپوریٹ قرضوں کے معیار کے طور پر کام کرتا ہے۔", rm: "KIBOR (Karachi Interbank Offered Rate) woh shar hai jis par Pakistani bank ek doosre ko raaton raat qarz dete hain. Yeh SBP policy rate ko qareeb se track karta hai aur corporate qarzoon ke miyaar ke tor par kaam karta hai." },
    },
    {
      question: { en: "Is all interest (sood) haram in Islam?", ur: "کیا اسلام میں تمام سود حرام ہے؟", rm: "Kya Islam mein tamam sood haraam hai?" },
      answer: { en: "Islamic jurisprudence prohibits riba (exploitative interest), but Islamic finance offers Shariah-compliant alternatives: Murabaha (cost-plus financing), Ijarah (leasing), Musharaka (partnership profit-sharing). Pakistan's Islamic banking sector (around 25% of total banking assets) uses these structures to provide home, car, and business financing without conventional interest.", ur: "اسلامی فقہ سود (استحصالی سود) کو ممنوع قرار دیتی ہے، لیکن اسلامی مالیات شریعت کے مطابق متبادل پیش کرتا ہے: مرابحہ، اجارہ، مشارکہ۔ پاکستان کا اسلامی بینکاری شعبہ (کل بینکاری اثاثوں کا تقریباً 25%) یہ ڈھانچے استعمال کرتا ہے۔", rm: "Islami fiqah sood (istishaali sood) ko mamnooa qarar deti hai, lekin Islami maaliaat shariah ke mutabiq mutabadil pesh karta hai: Murabaha, Ijarah, Musharaka. Pakistan ka Islami bainkari shaabay in dhaancon ko istemal karta hai." },
    },
  ],
};
