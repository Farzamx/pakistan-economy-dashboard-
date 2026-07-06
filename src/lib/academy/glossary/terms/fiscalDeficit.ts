import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const fiscalDeficitTerm: GlossaryTerm = {
  slug: "fiscal-deficit",
  term: { en: "Fiscal Deficit", ur: "مالیاتی خسارہ", rm: "Maaliyaati Khassara" },
  category: "fiscal-policy",
  relatedTermSlugs: ["primary-deficit", "public-debt", "gdp", "tax-revenue"],
  relatedLessonSlugs: [],
  definition: {
    en: "The amount by which a government's total expenditures exceed its total revenues in a given period, requiring the government to borrow to cover the shortfall.",
    ur: "وہ رقم جس کے ذریعہ کسی مقررہ مدت میں حکومت کے کل اخراجات اس کی کل آمدنی سے زیادہ ہو جاتے ہیں، جس کی وجہ سے حکومت کو کمی کو پورا کرنے کے لیے قرض لینا پڑتا ہے۔",
    rm: "Woh raqam jis ke zariye kisi muqarrara muddat mein hukoomat ke kul ikhraajaat is ki kul aamdani se zyada ho jaate hain, jis ki wajah se hukoomat ko kami ko poora karne ke liye qarz lena parta hai.",
  },
  beginnerExplanation: {
    en: "Imagine a household that earns PKR 50,000 per month but spends PKR 65,000. The PKR 15,000 shortfall has to be borrowed from somewhere — friends, banks, or credit cards. A government does the same thing when it spends more than it collects in taxes. The government borrows by selling bonds (T-bills, PIBs). Over time, accumulated deficits create public debt.",
    ur: "ایک گھرانے کا تصور کریں جو ماہانہ 50,000 روپے کماتا ہے لیکن 65,000 روپے خرچ کرتا ہے۔ 15,000 روپے کی کمی کہیں سے قرض لینی ہوگی۔ حکومت بھی یہی کرتی ہے جب وہ ٹیکسوں سے جمع ہونے والی رقم سے زیادہ خرچ کرتی ہے۔",
    rm: "Ek gharane ka tasawwur karein jo maahana 50,000 rupay kamata hai lekin 65,000 rupay kharch karta hai. 15,000 rupay ki kami kahin se qarz leni hogi. Hukoomat bhi yehi karti hai jab woh taxon se jama hone wali raqam se zyada kharch karti hai.",
  },
  pakistanContext: {
    en: "Pakistan consistently runs one of the highest fiscal deficits in the developing world as a share of GDP (~6–8% of GDP in most years). The key drivers are: low tax collection (tax-to-GDP ratio ~10–11%, one of the lowest globally), large interest payments on debt, and energy sector subsidies/circular debt. Under IMF programs, Pakistan commits to reducing the deficit through higher taxes and lower subsidies. The 'primary deficit' (before interest payments) is a key IMF target.",
    ur: "پاکستان مسلسل GDP کے تناسب سے دنیا کے سب سے زیادہ مالیاتی خساروں میں سے ایک چلاتا ہے (زیادہ تر سالوں میں GDP کا ~6–8٪)۔ اہم عوامل: کم ٹیکس جمع آوری (~10–11٪ ٹیکس-سے-GDP تناسب، عالمی سطح پر سب سے کم میں سے ایک)، قرض پر بڑی سود کی ادائیگیاں، اور توانائی شعبے کی سبسڈیز۔",
    rm: "Pakistan musalsal GDP ke tanaasub se duniya ke sab se zyada maali khassaaron mein se ek chalata hai (zyada tar saalon mein GDP ka ~6–8%). Aham asbab: kam tax jama aawari (~10–11% tax-se-GDP tanaasub), qarz par bari sood ki adaaigiyan, aur energy sho'bay ki subsidies.",
  },
  example: {
    en: "If Pakistan's government collects PKR 9 trillion in tax revenues but spends PKR 14 trillion (including debt servicing, defence, salaries, subsidies), the fiscal deficit is PKR 5 trillion. Expressed as a percentage of GDP (~PKR 80 trillion), that's roughly 6.25% of GDP. To fill this gap, the government issues T-bills and PIBs in the domestic market and borrows from the IMF, World Bank, and bilateral creditors.",
    ur: "اگر پاکستان کی حکومت ٹیکس آمدنی میں 9 ٹریلین روپے جمع کرتی ہے لیکن 14 ٹریلین روپے خرچ کرتی ہے، تو مالیاتی خسارہ 5 ٹریلین روپے ہے۔ GDP کے فیصد کے طور پر، یہ تقریباً 6.25٪ ہے۔",
    rm: "Agar Pakistan ki hukoomat tax aamdani mein 9 trillion rupay jama karti hai lekin 14 trillion rupay kharch karti hai, to maali khassara 5 trillion rupay hai. GDP ke feesad ke tor par, yeh taqreeban 6.25% hai.",
  },
  faq: [
    {
      question: { en: "What is the difference between fiscal deficit and public debt?", ur: "مالیاتی خسارے اور عوامی قرضے میں کیا فرق ہے؟", rm: "Maali khassaray aur awami qarzay mein kya farq hai?" },
      answer: {
        en: "The fiscal deficit is a *flow* — the gap between revenue and spending in one year. Public debt is a *stock* — the cumulative total of all past borrowings (minus any repayments). Running a fiscal deficit each year adds to public debt. Pakistan's public debt has crossed 75% of GDP, meaning decades of accumulated deficits now impose large annual interest obligations.",
        ur: "مالیاتی خسارہ ایک *بہاؤ* ہے — ایک سال میں آمدنی اور خرچ کا فرق۔ عوامی قرضہ ایک *ذخیرہ* ہے — ماضی کے تمام قرضوں کا مجموعی کل۔ ہر سال مالیاتی خسارہ چلانے سے عوامی قرضہ بڑھتا ہے۔",
        rm: "Maali khassara ek *bahaao* hai — ek saal mein aamdani aur kharch ka farq. Awami qarza ek *zakheera* hai — maazi ke tamam qarzoon ka majmoo'i kul. Har saal maali khassara chalane se awami qarza barhta hai.",
      },
    },
  ],
};
