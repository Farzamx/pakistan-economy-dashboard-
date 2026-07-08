import type { Lesson } from "@/lib/academy/types";

export const economicDevelopmentLesson: Lesson = {
  slug: "economic-development",
  category: "beginner",
  title: { en: "Economic Development vs. Economic Growth", ur: "اقتصادی ترقی بنام اقتصادی نمو", rm: "Iqtisaadi Taraqqi ba-naam Iqtisaadi Numa" },
  subtitle: {
    en: "Why GDP growth alone isn't enough — and what real development means for people",
    ur: "GDP نمو اکیلی کیوں کافی نہیں — اور لوگوں کے لیے حقیقی ترقی کا کیا مطلب ہے",
    rm: "GDP numa akeli kyun kaafi nahin — aur logon ke liye haqeeqi taraqqi ka kya matlab hai",
  },
  level: "beginner",
  readMinutes: 6,
  isPremium: false,
  relatedIndicatorSlugs: [],
  relatedLessonSlugs: ["economic-growth-basics", "poverty-and-inequality", "gdp"],
  content: {
    overview: {
      en: "Economic growth means GDP is getting larger. Economic development means people's lives are getting better — in health, education, income, opportunity, and freedom. A country can have economic growth without development (Saudi Arabia with vast oil wealth but limited opportunities for women). Development without growth is rarer but theoretically possible. Pakistan has achieved periods of GDP growth (5-6% in 2016-18) without making major progress on human development indicators like literacy, infant mortality, and female labour participation.",
      ur: "اقتصادی نمو کا مطلب ہے GDP بڑا ہو رہا ہے۔ اقتصادی ترقی کا مطلب ہے لوگوں کی زندگیاں بہتر ہو رہی ہیں — صحت، تعلیم، آمدنی، موقع اور آزادی میں۔ ایک ملک ترقی کے بغیر اقتصادی نمو حاصل کر سکتا ہے۔ پاکستان نے GDP نمو کے ادوار حاصل کیے بغیر انسانی ترقی کے اشاریوں پر بڑی پیشرفت کیے۔",
      rm: "Iqtisaadi numa ka matlab hai GDP bara ho raha hai. Iqtisaadi taraqqi ka matlab hai logon ki zindagiyan behtar ho rahi hain — sehat, taleem, aamdani, mauqa aur aazaadi mein. Ek mulk taraqqi ke baghair iqtisaadi numa haasil kar sakta hai. Pakistan ne GDP numa ke adwaar haasil kiye baghair insaani taraqqi ke ishaariyon par bari pesh-raft kiye.",
    },
    whyItMatters: {
      en: "Pakistan's Human Development Index (HDI) rank is 161 out of 191 countries — despite being a middle-income country. Pakistan ranks poorly on female literacy (47%), child nutrition, infant mortality, and years of schooling. GDP growth of 4-5% means little to a child dying from preventable disease or a girl denied education. Development economics asks: how can growth translate into better lives for more people? This question shapes Pakistan's IMF programmes, PSDP spending priorities, and social protection programmes like BISP.",
      ur: "پاکستان کا انسانی ترقیاتی انڈیکس (HDI) رینک 191 ممالک میں 161 ہے — درمیانی آمدنی والا ملک ہونے کے باوجود۔ پاکستان خواتین خواندگی (47٪)، بچوں کی غذائیت، شیرخوار اموات میں خراب رینک رکھتا ہے۔ GDP نمو 4-5٪ قابل علاج بیماری سے مرنے والے بچے یا تعلیم سے محروم لڑکی کے لیے کم اہم ہے۔",
      rm: "Pakistan ka insaani taraqiyaati index (HDI) rank 191 mumaalik mein 161 hai — darmiyana aamdani wala mulk hone ke bawajood. Pakistan khawateen khwaandagi (47%), bachon ki ghizaiyat, sheer-khwaar amaawaat mein kharaab rank rakhta hai. GDP numa 4-5% qaabil-e-ilaaj beeari se marne wale bachay ya taleem se mahroom larki ke liye kam ahem hai.",
    },
    explanation: {
      en: `**The key distinctions:**

**Growth vs Development:**
- Growth: GDP goes up — more goods and services produced
- Development: quality of life improves — longer lives, better health, more education, greater freedom, reduced poverty

**Measures of development:**
**HDI (Human Development Index):** UN measure combining income (GNI per capita), education (years of schooling), and health (life expectancy). Pakistan's HDI: 0.544 (Low Human Development category).

**MPI (Multidimensional Poverty Index):** Measures poverty across health, education, and living standards — not just income. ~40% of Pakistanis are MPI-poor.

**Why growth doesn't automatically create development:**
1. **Distribution:** If growth goes only to the rich, most people see no benefit
2. **Composition:** Growth in capital-intensive industries (oil, steel) creates fewer jobs than labour-intensive growth (garments, agriculture)
3. **Investment in human capital:** Countries that invest growth in education and health see better long-run development outcomes
4. **Governance:** Without strong institutions, growth can be captured by elites (resource curse — Nigeria's oil)

**Amartya Sen's "Development as Freedom":** True development means expanding people's freedoms — capability to live long, be educated, participate in political life, be free from want. Pakistan constrains many of these freedoms for large portions of the population.`,
      ur: `**اہم فرق:**

**نمو بنام ترقی:**
- نمو: GDP بڑھتا ہے — مزید اشیاء اور خدمات پیدا ہوتی ہیں
- ترقی: زندگی کا معیار بہتر ہوتا ہے — لمبی عمر، بہتر صحت، زیادہ تعلیم، زیادہ آزادی

**ترقی کے پیمانے:**
**HDI:** آمدنی، تعلیم اور صحت کو یکجا کرنے والا اقوام متحدہ کا پیمانہ۔ پاکستان کا HDI: 0.544۔

**MPI:** صحت، تعلیم اور رہن سہن معیار میں غربت ناپتا ہے۔ ~40٪ پاکستانی MPI-غریب ہیں۔

**نمو خودکار طور پر ترقی کیوں نہیں بناتی:**
1. تقسیم: اگر نمو صرف امیروں کو جائے، زیادہ تر لوگ کوئی فائدہ نہیں دیکھتے
2. ساخت: سرمایہ مکثف صنعتوں میں نمو محنت مکثف نمو سے کم روزگار پیدا کرتی ہے
3. انسانی سرمایے میں سرمایہ کاری
4. حکمرانی: مضبوط اداروں کے بغیر، نمو اشرافیہ کے قبضے میں جا سکتی ہے`,
      rm: `**Ahem faraq:**

**Numa ba-naam taraqqi:**
- Numa: GDP barhta hai — mazeed ashaaya aur khadamaat paida hoti hain
- Taraqqi: zindagi ka miyaar behtar hota hai — lambi umar, behtar sehat, zyada taleem, zyada aazaadi

**Taraqqi ke paimaane:**
**HDI:** aamdani, taleem aur sehat ko yek-ja karne wala aqwam-e-muttahida ka paimaana. Pakistan ka HDI: 0.544.

**MPI:** sehat, taleem aur rehen sehen miyaar mein ghurbat naapata hai. ~40% Pakistani MPI-ghareeb hain.

**Numa khudkaar tor par taraqqi kyun nahin banati:**
1. Taqseem: agar numa sirf ameeron ko jaye, zyada tar log koi faayda nahin dekhte
2. Saakht: sarmaaya makassaf sanaaton mein numa mehnat makassaf numa se kam rozgaar paida karti hai
3. Insaani sarmaaye mein sarmaaya kaari
4. Hukoomrani: mazboot idaaron ke baghair, numa ashraafiya ke qabze mein ja sakti hai`,
    },
    misconceptions: {
      en: `**Myth 1: High GDP growth automatically improves people's lives.** Not necessarily — it depends on who captures the growth. Pakistan's 2016-18 growth period did not meaningfully reduce poverty or improve education/health outcomes at the same pace.

**Myth 2: Poor countries are poor because they don't have enough money.** Often they have money (Pakistan received billions in aid, remittances, IMF loans) but lack the institutions, governance, and human capital to turn money into development.

**Myth 3: Development is only about income.** Development economists now measure capabilities, freedoms, health, education, and environmental sustainability — not just GDP per capita. A rich-on-paper country where children die from preventable diseases is not "developed".`,
      ur: `**غلط فہمی 1: اعلی GDP نمو خودبخود لوگوں کی زندگیاں بہتر کرتی ہے۔** ضروری نہیں — یہ اس بات پر منحصر ہے کہ نمو کون پکڑتا ہے۔

**غلط فہمی 2: غریب ممالک غریب ہیں کیونکہ ان کے پاس کافی پیسہ نہیں ہے۔** اکثر ان کے پاس پیسہ ہے لیکن پیسے کو ترقی میں تبدیل کرنے کے لیے ادارے، حکمرانی اور انسانی سرمایہ نہیں ہے۔

**غلط فہمی 3: ترقی صرف آمدنی کے بارے میں ہے۔** ترقی ماہرین اقتصادیات اب صلاحیتیں، آزادیاں، صحت، تعلیم ناپتے ہیں — صرف GDP فی کس نہیں۔`,
      rm: `**Ghalat fehmi 1: Aali GDP numa khud-ba-khud logon ki zindagiyan behtar karti hai.** Zaroori nahin — yeh is baat par munsalik hai ke numa kaun pakadta hai.

**Ghalat fehmi 2: Ghareeb mumaalik ghareeb hain kyunke un ke paas kaafi paisa nahin hai.** Aksar un ke paas paisa hai lekin paise ko taraqqi mein tabdeel karne ke liye idaare, hukoomrani aur insaani sarmaaya nahin hai.

**Ghalat fehmi 3: Taraqqi sirf aamdani ke baare mein hai.** Taraqqi maahireen iqtisaadiyaat ab salaaḥiyatein, aazaadiyaan, sehat, taleem naapte hain — sirf GDP fi-kas nahin.`,
    },
    pakistanExample: {
      en: `**Pakistan's development paradox:** In FY2018, Pakistan's GDP grew 5.5% — one of its best growth years in a decade. Yet Pakistan's PISA education scores remain among the lowest in Asia, ~40% of children under 5 are stunted (chronically malnourished), female literacy is 47%, and an estimated 26 million children are out of school. Growth happened but development lagged. The contrast with Bangladesh is stark: Bangladesh, with lower per-capita income, has higher female literacy, lower infant mortality, better education indicators, and higher female labour participation — because Bangladesh invested consistently in health and education during its growth phase.`,
      ur: `**پاکستان کا ترقی کا تضاد:** FY2018 میں، پاکستان کی GDP 5.5٪ بڑھی — ایک دہائی میں اس کا بہترین نمو سال۔ پھر بھی پاکستان کے PISA تعلیمی اسکور ایشیا میں سب سے کم ہیں، ~40٪ 5 سال سے کم بچے stunted ہیں، خواتین خواندگی 47٪ ہے، اور تخمیناً 2.6 کروڑ بچے سکول سے باہر ہیں۔ بنگلہ دیش کا تضاد واضح ہے: کم فی کس آمدنی کے ساتھ، بنگلہ دیش میں خواتین خواندگی زیادہ، شیرخوار اموات کم ہے۔`,
      rm: `**Pakistan ka taraqqi ka tazaad:** FY2018 mein, Pakistan ki GDP 5.5% barhi — ek dahaayi mein is ka behtareen numa saal. Phir bhi Pakistan ke PISA taleemi scores Asia mein sab se kam hain, ~40% 5 saal se kam bachay stunted hain, khawateen khwaandagi 47% hai, aur takhmeenaṃ 2.6 karor bachay school se baahir hain. Bangladesh ka tazaad waazeh hai: kam fi-kas aamdani ke saath, Bangladesh mein khawateen khwaandagi zyada, sheer-khwaar amaawaat kam hai.`,
    },
    realWorld: {
      en: "South Korea's economic development (1960-2000) is the textbook example of growth translating into development. Starting from poverty equivalent to Pakistan's today, South Korea invested massively in universal education (literacy rates rose from 30% to near 100%), exported electronics and cars (structural transformation from agriculture), and built strong institutions. By 2000, South Korea had per-capita income 15x higher than Pakistan — from the same starting point. The difference: sustained investment in human capital, education, and industrial policy alongside economic growth.",
      ur: "جنوبی کوریا کی اقتصادی ترقی (1960-2000) تعلیمی نصاب کی مثال ہے جہاں نمو ترقی میں تبدیل ہوئی۔ آج پاکستان کے برابر غربت سے شروع ہو کر، جنوبی کوریا نے عالمگیر تعلیم میں بڑے پیمانے پر سرمایہ کاری کی۔ 2000 تک، جنوبی کوریا کی فی کس آمدنی پاکستان سے 15 گنا زیادہ تھی — ایک ہی نقطہ آغاز سے۔",
      rm: "Junoobi Korea ki iqtisaadi taraqqi (1960-2000) taleemi nisaab ki misaal hai jahan numa taraqqi mein tabdeel hui. Aaj Pakistan ke barabar ghurbat se shuru ho kar, Junoobi Korea ne aalamgeer taleem mein bare paimane par sarmaaya kaari ki. 2000 tak, Junoobi Korea ki fi-kas aamdani Pakistan se 15 guna zyada thi — ek hi nuqta-e-aaghaz se.",
    },
    summary: {
      en: "• Growth = GDP up; Development = lives better (health, education, freedom, income)\n• HDI measures income + education + health together — Pakistan: 161/191\n• MPI captures multidimensional poverty — ~40% of Pakistanis are MPI-poor\n• Growth doesn't automatically create development — distribution, composition, investment matter\n• Pakistan's paradox: decent growth periods but low human development indicators\n• Bangladesh vs Pakistan: Bangladesh achieved better development outcomes with lower income",
      ur: "• نمو = GDP اوپر؛ ترقی = زندگیاں بہتر (صحت، تعلیم، آزادی، آمدنی)\n• HDI آمدنی + تعلیم + صحت کو ایک ساتھ ناپتا ہے — پاکستان: 161/191\n• MPI کثیرالجہت غربت کو پکڑتا ہے — ~40٪ پاکستانی MPI-غریب ہیں\n• نمو خودکار طور پر ترقی نہیں بناتی — تقسیم، ساخت، سرمایہ کاری اہم ہیں\n• پاکستان کا تضاد: مناسب نمو ادوار لیکن کم انسانی ترقی کے اشاریے\n• بنگلہ دیش بنام پاکستان: بنگلہ دیش نے کم آمدنی کے ساتھ بہتر ترقیاتی نتائج حاصل کیے",
      rm: "• Numa = GDP uupar; Taraqqi = zindagiyan behtar (sehat, taleem, aazaadi, aamdani)\n• HDI aamdani + taleem + sehat ko ek saath naapata hai — Pakistan: 161/191\n• MPI kaseer-ul-jihat ghurbat ko pakadta hai — ~40% Pakistani MPI-ghareeb hain\n• Numa khudkaar tor par taraqqi nahin banati — taqseem, saakht, sarmaaya kaari ahem hain\n• Pakistan ka tazaad: munaasib numa adwaar lekin kam insaani taraqqi ke ishaariiye\n• Bangladesh ba-naam Pakistan: Bangladesh ne kam aamdani ke saath behtar taraqiyaati nataayij haasil kiye",
    },
  },
  quiz: [
    {
      question: { en: "What is the key difference between 'economic growth' and 'economic development'?", ur: "'اقتصادی نمو' اور 'اقتصادی ترقی' کا اہم فرق کیا ہے؟", rm: "'Iqtisaadi numa' aur 'iqtisaadi taraqqi' ka ahem faraq kya hai?" },
      options: [
        { en: "Growth is measured in dollars, development in rupees", ur: "نمو ڈالر میں ناپی جاتی ہے، ترقی روپوں میں", rm: "Numa dollar mein naapi jaati hai, taraqqi rupon mein" },
        { en: "Growth means GDP increases; development means improvements in health, education, freedom, and quality of life", ur: "نمو کا مطلب ہے GDP بڑھتا ہے؛ ترقی کا مطلب ہے صحت، تعلیم، آزادی اور زندگی کے معیار میں بہتری", rm: "Numa ka matlab hai GDP barhta hai; taraqqi ka matlab hai sehat, taleem, aazaadi aur zindagi ke miyaar mein behtari" },
        { en: "Growth is permanent; development is temporary", ur: "نمو مستقل ہے؛ ترقی عارضی ہے", rm: "Numa mustaqil hai; taraqqi aaraazi hai" },
        { en: "They mean exactly the same thing", ur: "ان کا بالکل ایک ہی مطلب ہے", rm: "Un ka bilkul ek hi matlab hai" },
      ],
      correctIndex: 1,
      explanation: { en: "Growth is a quantitative measure (GDP rising). Development is a qualitative improvement in human welfare — people living longer, being better educated, having more freedom and opportunity. A country can grow without developing if the benefits are captured by the elite.", ur: "نمو ایک مقداری پیمانہ ہے (GDP بڑھنا)۔ ترقی انسانی بہبود میں ایک معیاری بہتری ہے — لوگ لمبے جیتے ہیں، بہتر تعلیم یافتہ ہیں، زیادہ آزادی اور مواقع رکھتے ہیں۔ ایک ملک ترقی کے بغیر نمو کر سکتا ہے اگر فوائد اشرافیہ کے پاس جائیں۔", rm: "Numa ek miqdaari paimaana hai (GDP barhna). Taraqqi insaani behbood mein ek mayaari behtari hai — log lambe jeete hain, behtar taleem yaafta hain, zyada aazaadi aur mawaaqey rakhte hain. Ek mulk taraqqi ke baghair numa kar sakta hai agar fawaaید ashraafiya ke paas jayen." },
    },
    {
      question: { en: "Pakistan's HDI rank is 161 out of 191 countries. This primarily reflects:", ur: "پاکستان کا HDI رینک 191 ممالک میں 161 ہے۔ یہ بنیادی طور پر کیا ظاہر کرتا ہے؟", rm: "Pakistan ka HDI rank 191 mumaalik mein 161 hai. Yeh bunyaadi tor par kya zaahir karta hai?" },
      options: [
        { en: "Pakistan's GDP is among the world's lowest", ur: "پاکستان کی GDP دنیا کی سب سے کم ہے", rm: "Pakistan ki GDP duniya ki sab se kam hai" },
        { en: "Pakistan underperforms on health and education indicators relative to its income level", ur: "پاکستان اپنی آمدنی کی سطح کے مقابلے میں صحت اور تعلیم کے اشاریوں پر کم کارکردگی دکھاتا ہے", rm: "Pakistan apni aamdani ki satah ke muqaable mein sehat aur taleem ke ishaariyon par kam kaarkardagi dikhata hai" },
        { en: "Pakistan has negative economic growth", ur: "پاکستان کی اقتصادی نمو منفی ہے", rm: "Pakistan ki iqtisaadi numa manfi hai" },
        { en: "Pakistan has no exports", ur: "پاکستان کی کوئی برآمدات نہیں ہیں", rm: "Pakistan ki koi baraamdaat nahin hain" },
      ],
      correctIndex: 1,
      explanation: { en: "Pakistan is a lower-middle-income country with per-capita income ~$1,600, but it punches below even that weight on human development. Female literacy at 47%, 26 million out-of-school children, and high stunting rates reflect chronic underinvestment in health and education.", ur: "پاکستان ایک نچلے درمیانی آمدنی والا ملک ہے جس کی فی کس آمدنی ~$1,600 ہے، لیکن انسانی ترقی پر یہ اس سے بھی کم کارکردگی دکھاتا ہے۔ خواتین خواندگی 47٪ پر، 2.6 کروڑ سکول سے باہر بچے، اور اعلی stunting شرحیں صحت اور تعلیم میں دائمی کم سرمایہ کاری کو ظاہر کرتی ہیں۔", rm: "Pakistan ek nichle darmiyana aamdani wala mulk hai jis ki fi-kas aamdani ~$1,600 hai, lekin insaani taraqqi par yeh is se bhi kam kaarkardagi dikhata hai. Khawateen khwaandagi 47% par, 2.6 karor school se baahir bachay, aur aali stunting sharhein sehat aur taleem mein daemi kam sarmaaya kaari ko zaahir karti hain." },
    },
    {
      question: { en: "Why did South Korea grow from Pakistan-level poverty to a rich country in 40 years?", ur: "جنوبی کوریا پاکستان کی سطح کی غربت سے 40 سال میں ایک امیر ملک کیوں بن گیا؟", rm: "Junoobi Korea Pakistan ki satah ki ghurbat se 40 saal mein ek ameer mulk kyun ban gaya?" },
      options: [
        { en: "South Korea discovered oil and natural resources", ur: "جنوبی کوریا نے تیل اور قدرتی وسائل دریافت کیے", rm: "Junoobi Korea ne tel aur qudrati wasail daryaaft kiye" },
        { en: "South Korea invested consistently in education, exported high-value goods, and built strong institutions", ur: "جنوبی کوریا نے تعلیم میں مستقل سرمایہ کاری کی، اعلی قدر والی اشیاء برآمد کیں اور مضبوط ادارے بنائے", rm: "Junoobi Korea ne taleem mein mustaqil sarmaaya kaari ki, aali qadr waali ashaaya baraadm kin aur mazboot idaare banaaye" },
        { en: "South Korea received more foreign aid than any other country", ur: "جنوبی کوریا نے کسی بھی دوسرے ملک سے زیادہ غیر ملکی امداد حاصل کی", rm: "Junoobi Korea ne kisi bhi doosre mulk se zyada ghair mulki imdaad haasil ki" },
        { en: "South Korea had a much larger population to draw from", ur: "جنوبی کوریا کی آبادی بہت زیادہ تھی", rm: "Junoobi Korea ki aabaadi bahut zyada thi" },
      ],
      correctIndex: 1,
      explanation: { en: "South Korea's 'Miracle on the Han River' combined universal education (literacy from 30% to near 100%), industrial policy (building Hyundai, Samsung, POSCO), export focus, and strong institutions. Human capital investment was the foundation — workers educated enough to operate and design complex industrial processes.", ur: "جنوبی کوریا کا 'ہان دریا پر معجزہ' نے عالمگیر تعلیم (خواندگی 30٪ سے تقریباً 100٪)، صنعتی پالیسی، برآمدی توجہ اور مضبوط اداروں کو یکجا کیا۔ انسانی سرمایے کی سرمایہ کاری بنیاد تھی۔", rm: "Junoobi Korea ka 'Han darya par mojza' ne aalamgeer taleem (khwaandagi 30% se taqreeban 100%), sanaati policy, baraamdaati tawajju aur mazboot idaaron ko yek-ja kiya. Insaani sarmaaye ki sarmaaya kaari bunyaad thi." },
    },
    {
      question: { en: "What does the Multidimensional Poverty Index (MPI) measure?", ur: "کثیرالجہت غربت انڈیکس (MPI) کیا ناپتا ہے؟", rm: "Kaseer-ul-jihat Ghurbat Index (MPI) kya naapata hai?" },
      options: [
        { en: "Only income poverty below the international poverty line", ur: "صرف بین الاقوامی غربت کی لکیر سے نیچے آمدنی کی غربت", rm: "Sirf bain-ul-aqwaami ghurbat ki lakeer se neeche aamdani ki ghurbat" },
        { en: "Poverty across multiple dimensions: health, education, and living standards — not just income", ur: "متعدد جہتوں میں غربت: صحت، تعلیم اور رہن سہن معیار — صرف آمدنی نہیں", rm: "Mutaddid jihaaton mein ghurbat: sehat, taleem aur rehen sehen miyaar — sirf aamdani nahin" },
        { en: "Only wealth inequality (Gini coefficient)", ur: "صرف دولت کی عدم مساوات (جینی گتانک)", rm: "Sirf dolat ki adam-musaawaat (Gini Coefficient)" },
        { en: "GDP per capita adjusted for purchasing power", ur: "قوت خرید کے مطابق فی کس GDP ایڈجسٹ کیا گیا", rm: "Quwwat-e-khireed ke mutaabiq fi-kas GDP adjust kiya gaya" },
      ],
      correctIndex: 1,
      explanation: { en: "MPI counts someone as poor if they are deprived in multiple dimensions simultaneously — like lacking access to clean water AND being out of school AND having poor nutrition. It captures the overlap of deprivations that income measures miss. ~40% of Pakistanis are MPI-poor even if their income is above the $2.15/day threshold.", ur: "MPI کسی کو غریب شمار کرتا ہے اگر وہ ایک ساتھ کئی جہتوں میں محروم ہو — جیسے صاف پانی تک رسائی نہ ہونا AND سکول سے باہر ہونا AND خراب غذائیت۔ ~40٪ پاکستانی MPI-غریب ہیں چاہے ان کی آمدنی $2.15/دن کی حد سے اوپر ہو۔", rm: "MPI kisi ko ghareeb shumaar karta hai agar woh ek saath kayi jihaaton mein mahroom ho — jaise saaf paani tak rasaai na hona AND school se baahir hona AND kharaab ghizaiyat. ~40% Pakistani MPI-ghareeb hain chahe un ki aamdani $2.15/din ki hadd se uupar ho." },
    },
  ],
  faq: [
    {
      question: { en: "Can Pakistan achieve economic development without achieving high GDP growth?", ur: "کیا پاکستان اعلی GDP نمو حاصل کیے بغیر اقتصادی ترقی حاصل کر سکتا ہے؟", rm: "Kya Pakistan aali GDP numa haasil kiye baghair iqtisaadi taraqqi haasil kar sakta hai?" },
      answer: { en: "Partly — but it's very hard. You can improve outcomes in health and education without high GDP growth through better public spending allocation (spending more on primary education instead of defence, for instance). But sustained development at scale — building hospitals, training doctors, building schools, training teachers — requires resources that come from economic growth. The smart approach: grow the economy AND simultaneously invest growth revenues in health, education, and human capital rather than debt servicing or prestige projects.", ur: "جزوی طور پر — لیکن یہ بہت مشکل ہے۔ آپ عوامی اخراجات مختص کرنے (مثلاً دفاع کی بجائے ابتدائی تعلیم پر زیادہ خرچ کرکے) کے ذریعے اعلی GDP نمو کے بغیر صحت اور تعلیم میں نتائج بہتر کر سکتے ہیں۔ لیکن پیمانے پر پائیدار ترقی کے لیے وسائل کی ضرورت ہے جو معاشی نمو سے آتے ہیں۔", rm: "Juz'wi tor par — lekin yeh bahut mushkil hai. Aap amoomi ikhraajaati mukhtas karne ke zariye (maslan difaa ki bajaaye ibtidaai taleem par zyada kharch karke) aali GDP numa ke baghair sehat aur taleem mein nataayij behtar kar sakte hain. Lekin paimane par paayidaar taraqqi ke liye wasail ki zaroorat hai jo muaashi numa se aate hain." },
    },
  ],
};
