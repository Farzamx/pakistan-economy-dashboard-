import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const tbillsTerm: GlossaryTerm = {
  slug: "tbills",
  term: { en: "Treasury Bills (T-Bills)", ur: "خزانہ بل (T-Bills)", rm: "Khazaana Bill (T-Bills)" },
  abbreviation: "T-Bills",
  category: "bonds",
  relatedTermSlugs: ["pibs", "policy-rate", "kibor", "fiscal-deficit"],
  relatedLessonSlugs: [],
  definition: {
    en: "Short-term government debt instruments (3-month, 6-month, 12-month) issued at a discount to face value, with no coupon payments, used to finance the government's short-term borrowing needs.",
    ur: "قلیل مدتی حکومتی قرض کے آلات (3 ماہ، 6 ماہ، 12 ماہ) جو فیس ویلیو پر ڈسکاؤنٹ پر جاری کیے جاتے ہیں، بغیر کوپن ادائیگیوں کے، حکومت کی قلیل مدتی قرض کی ضروریات کو پورا کرنے کے لیے استعمال ہوتے ہیں۔",
    rm: "Qaleel muddat ke hukomaati qarz ke aalaat (3 maah, 6 maah, 12 maah) jo face value par discount par jaari kiye jaate hain, baghair coupon adaaigiyon ke, hukoomat ki qaleel muddat ke qarz ki zarooriyaat ko poora karne ke liye istemal hote hain.",
  },
  beginnerExplanation: {
    en: "T-bills are how the Pakistani government borrows money for short periods. Instead of paying interest, the government sells the T-bill at a discount. For example, you pay PKR 95 today for a T-bill that pays back PKR 100 in 3 months. That PKR 5 gain is your return (equivalent to ~21% annualised). The SBP conducts weekly T-bill auctions; banks, mutual funds, and institutional investors participate. The cut-off yield at auction reflects market expectations for short-term rates.",
    ur: "T-bills وہ طریقہ ہے جس سے پاکستانی حکومت قلیل مدت کے لیے پیسے قرض لیتی ہے۔ سود ادا کرنے کی بجائے، حکومت T-bill کو ڈسکاؤنٹ پر بیچتی ہے۔ مثال کے طور پر، آپ آج 95 روپے ادا کرتے ہیں ایک T-bill کے لیے جو 3 ماہ میں 100 روپے واپس کرتی ہے۔",
    rm: "T-bills woh tareeqa hai jis se Pakistani hukoomat qaleel muddat ke liye paise qarz leti hai. Sood ada karne ki bajaay, hukoomat T-bill ko discount par bechti hai. Misaal ke tor par, aap aaj 95 rupay ada karte hain ek T-bill ke liye jo 3 maah mein 100 rupay wapas karti hai.",
  },
  pakistanContext: {
    en: "T-bills are Pakistan's most actively traded government securities. The SBP holds weekly auctions (Primary Dealer network). At the peak of the 2023 rate cycle with a 22% policy rate, 3-month T-bill yields reached ~22–23%. Banks poured money into T-bills instead of lending to the private sector (because T-bills offered near-risk-free returns comparable to or above private lending rates). This 'crowding out' of private sector credit was a major criticism of sustained high rates. T-bill yields are now a benchmark for NSS (National Savings Scheme) rates.",
    ur: "T-bills پاکستان کی سب سے فعال طور پر تجارت کی جانے والی حکومتی اوراق ہیں۔ SBP ہفتہ وار نیلامی کرتا ہے۔ 22٪ پالیسی ریٹ کی چوٹی پر، 3 ماہ کی T-bill پیداوار ~22–23٪ تک پہنچی۔ بینکوں نے نجی شعبے کو قرض دینے کی بجائے T-bills میں پیسے ڈالے۔ یہ نجی شعبے کے قرض کو 'بے دخل' کرنا ایک بڑی تنقید تھی۔",
    rm: "T-bills Pakistan ki sab se fa'al tor par tijaarat ki jaane wali hukomaati awraaq hain. SBP haftawar neelami karta hai. 22% policy rate ki choti par, 3 maah ki T-bill paidawar ~22–23% tak pahunchi. Bankoon ne najaati sho'bay ko qarz dene ki bajaay T-bills mein paise daale. Yeh najaati sho'bay ke qarz ko 'be-dakheel' karna ek bari tanqeed thi.",
  },
  example: {
    en: "At a T-bill auction, if the government needs to borrow PKR 200 billion for 3 months and banks bid at yields ranging from 20–22%, the SBP will accept bids up to the 'cut-off yield' it's willing to pay. Banks that bid below the cut-off get their T-bills; those above are rejected. The cut-off yield becomes the market benchmark for 3-month rates.",
    ur: "T-bill نیلامی میں، اگر حکومت کو 3 ماہ کے لیے 200 بلین روپے قرض لینے کی ضرورت ہے اور بینک 20–22٪ پیداوار پر بولی لگاتے ہیں، تو SBP 'کٹ آف پیداوار' تک بولیاں قبول کرے گا جو وہ ادا کرنے کو تیار ہے۔",
    rm: "T-bill neelami mein, agar hukoomat ko 3 maah ke liye 200 billion rupay qarz lene ki zaroorat hai aur bank 20–22% paidawar par boli lagaate hain, to SBP 'cut-off paidawar' tak boliyaan qabool kare ga jo woh ada karne ko tayyar hai.",
  },
  faq: [
    {
      question: { en: "What is the difference between T-bills and PIBs?", ur: "T-bills اور PIBs میں کیا فرق ہے؟", rm: "T-bills aur PIBs mein kya farq hai?" },
      answer: {
        en: "T-bills are short-term (3, 6, 12 months), issued at a discount, with no coupon — the return is purely capital gain. PIBs (Pakistan Investment Bonds) are long-term (2, 3, 5, 10, 20, 30 years), pay a semi-annual coupon (interest payment), and are used for the government's medium-to-long-term financing. T-bill yields reflect near-term rate expectations; PIB yields reflect long-term rate and inflation expectations.",
        ur: "T-bills قلیل مدتی (3، 6، 12 ماہ) ہیں، ڈسکاؤنٹ پر جاری کیے جاتے ہیں، بغیر کوپن کے۔ PIBs (پاکستان انویسٹمنٹ بانڈز) طویل مدتی (2، 3، 5، 10، 20، 30 سال) ہیں، نیم سالانہ کوپن ادا کرتے ہیں، اور حکومت کی درمیانی سے طویل مدتی فنانسنگ کے لیے استعمال ہوتے ہیں۔",
        rm: "T-bills qaleel muddat ke (3, 6, 12 maah) hain, discount par jaari kiye jaate hain, baghair coupon ke. PIBs (Pakistan Investment Bonds) taweel muddat ke (2, 3, 5, 10, 20, 30 saal) hain, neem saalana coupon ada karte hain, aur hukoomat ki darmiyanī se taweel muddat ki financing ke liye istemal hote hain.",
      },
    },
  ],
};
