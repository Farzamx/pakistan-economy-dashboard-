import type { GlossaryTerm } from "@/lib/academy/glossary/types";

export const remittancesTerm: GlossaryTerm = {
  slug: "remittances",
  term: { en: "Remittances", ur: "ترسیلاتِ زر", rm: "Taraselaat-e-Zar" },
  category: "international-trade",
  relatedTermSlugs: ["current-account", "forex-reserves", "pkr", "bop"],
  relatedLessonSlugs: [],
  definition: {
    en: "Money sent by workers living abroad back to their home country, recorded as a credit in the current account of the receiving country's balance of payments.",
    ur: "بیرون ملک مقیم کارکنوں کی طرف سے اپنے وطن بھیجی گئی رقم، جو وصول کنندہ ملک کے ادائیگیوں کے توازن کے جاری کھاتے میں کریڈٹ کے طور پر درج ہوتی ہے۔",
    rm: "Baeron mulk muqeem kaarkuno ki taraf se apne watan bheyji gayi raqam, jo wasal kunanda mulk ke adaaigiyon ke tawazun ke jaari khaate mein credit ke tor par darj hoti hai.",
  },
  beginnerExplanation: {
    en: "When a Pakistani working in Saudi Arabia, UAE, UK, or the US sends money home to their family, that is a remittance. For Pakistan, remittances are massive — roughly USD 27 billion per year. This makes them Pakistan's single largest source of foreign exchange, bigger than all export earnings put together (before accounting for import costs). Remittances flow mostly through two channels: banking (Roshan Digital Account, Swift) and hawala/hundi (informal transfer networks).",
    ur: "جب سعودی عرب، UAE، برطانیہ یا امریکہ میں کام کرنے والا پاکستانی اپنے خاندان کو پیسے بھیجتا ہے، وہ ترسیل ہے۔ پاکستان کے لیے، ترسیلاتِ زر بہت بڑی ہیں — سالانہ تقریباً 27 بلین USD۔ یہ پاکستان کے غیر ملکی زرمبادلہ کا سب سے بڑا واحد ذریعہ ہیں۔",
    rm: "Jab Saudi Arabia, UAE, Britain ya Amreeka mein kaam karne wala Pakistani apne khaandaan ko paise bhejta hai, woh tarseel hai. Pakistan ke liye, taraselaat-e-zar bahut bari hain — saalana taqreeban 27 billion USD. Yeh Pakistan ke ghair mulki zar-e-mubadla ka sab se bara wahid zariya hain.",
  },
  pakistanContext: {
    en: "Pakistan consistently receives USD 25–30 billion in remittances annually, mostly from: Saudi Arabia (~25%), UAE (~20%), UK (~15%), USA (~10%), and other Gulf states. During the 2022–2023 FX crisis, remittances became even more critical as they helped partially offset the current account deficit. The SBP introduced the 'Roshan Digital Account' (RDA) to attract remittances from overseas Pakistanis into formal banking. The government launched 'Pakistan Remittance Initiative (PRI)' to incentivise bank transfers over hawala.",
    ur: "پاکستان سالانہ مسلسل 25–30 بلین USD ترسیلات وصول کرتا ہے، زیادہ تر: سعودی عرب (~25٪)، UAE (~20٪)، UK (~15٪)، USA (~10٪)۔ 2022–2023 FX بحران میں، ترسیلاتِ زر اور بھی اہم ہو گئیں۔ SBP نے 'روشن ڈیجیٹل اکاؤنٹ' متعارف کرایا۔",
    rm: "Pakistan saalana musalsal 25–30 billion USD taraselaat wasal karta hai, zyada tar: Saudi Arabia (~25%), UAE (~20%), UK (~15%), USA (~10%). 2022–2023 FX bohran mein, taraselaat-e-zar aur bhi aham ho gayin. SBP ne 'Roshan Digital Account' mutaarif karaaya.",
  },
  example: {
    en: "If a Pakistani nurse working in the UAE earns AED 8,000/month and sends AED 5,000 (≈USD 1,360) home each month, that single worker contributes USD 16,320 per year to Pakistan's remittance inflows. With ~9 million overseas Pakistanis, even modest per-person transfers aggregate into tens of billions of dollars — a lifeline for Pakistan's external accounts.",
    ur: "اگر UAE میں کام کرنے والی پاکستانی نرس ماہانہ AED 8,000 کماتی ہے اور AED 5,000 (≈USD 1,360) گھر بھیجتی ہے، تو وہ اکیلا کارکن سالانہ USD 16,320 پاکستان کی ترسیلاتِ زر میں لاتا ہے۔ ~90 لاکھ بیرون ملک پاکستانیوں کے ساتھ، کل اربوں ڈالر بنتے ہیں۔",
    rm: "Agar UAE mein kaam karne wali Pakistani nurse maahana AED 8,000 kamati hai aur AED 5,000 (≈USD 1,360) ghar bhejti hai, to woh akela kaarkun saalana USD 16,320 Pakistan ki taraselaat-e-zar mein laata hai. ~90 lakh baeron mulk Pakistaniyon ke saath, kul arbon dollar bante hain.",
  },
  faq: [
    {
      question: { en: "What is the difference between remittances through banking and hawala?", ur: "بینکنگ اور حوالہ کے ذریعے ترسیلات میں کیا فرق ہے؟", rm: "Banking aur hawala ke zariye taraselaat mein kya farq hai?" },
      answer: {
        en: "Banking remittances (Swift, Roshan Digital Account, Western Union through banks) are official, tracked, and included in Pakistan's official BOP statistics. Hawala/hundi is an informal trust-based network: a sender pays money to a hawala broker in the UAE; the broker contacts a counterpart in Lahore who pays the recipient. No money physically crosses borders. Hawala is faster and cheaper but not captured in official statistics — meaning Pakistan's true remittance inflows may exceed official numbers.",
        ur: "بینکنگ ترسیلات (Swift، روشن ڈیجیٹل اکاؤنٹ) سرکاری، ٹریک شدہ، اور پاکستان کے سرکاری BOP اعداد و شمار میں شامل ہیں۔ حوالہ/ہنڈی غیر رسمی اعتماد پر مبنی نیٹ ورک ہے: بھیجنے والا UAE میں ایک حوالہ بروکر کو ادائیگی کرتا ہے؛ بروکر لاہور میں ہم منصب سے رابطہ کرتا ہے جو وصول کنندہ کو ادائیگی کرتا ہے۔",
        rm: "Banking taraselaat (Swift, Roshan Digital Account) sarkari, track shuda, aur Pakistan ke sarkari BOP adaad-o-shumaar mein shamil hain. Hawala/hundi ghair rasmi aitmaad par mabni network hai: bheejne wala UAE mein ek hawala broker ko adaaigi karta hai; broker Lahore mein hum mansab se raabta karta hai jo wasal kunanda ko adaaigi karta hai.",
      },
    },
  ],
};
