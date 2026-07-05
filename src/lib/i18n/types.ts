export type Language = "en" | "ur" | "rm";

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
  font?: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl", font: "Noto Nastaliq Urdu" },
  { code: "rm", label: "Roman Urdu", nativeLabel: "Roman Urdu", dir: "ltr" },
];

// Flat translation value — a string or a function for interpolation
export type TranslationValue = string | ((...args: string[]) => string);

export interface Translations {
  nav: {
    main: string;
    analytics: string;
    premiumTools: string;
    overview: string;
    riskIntel: string;
    gdp: string;
    inflation: string;
    prices: string;
    monetaryPolicy: string;
    globalMarkets: string;
    realEconomy: string;
    reserves: string;
    liveFX: string;
    exchangeRate: string;
    remittances: string;
    externalSector: string;
    news: string;
    comparisons: string;
    budgetTracker: string;
    provincialBudget: string;
    economicCalendar: string;
    workshop: string;
    freeSubscription: string;
    rankings: string;
    indicators: string;
    settings: string;
  };
  settings: {
    title: string;
    done: string;
    appearance: string;
    language: string;
    preferences: string;
    about: string;
    darkMode: string;
    darkModeDesc: string;
    lightMode: string;
    lightModeDesc: string;
    preferencesLink: string;
    preferencesGuest: string;
    loginLink: string;
    aboutName: string;
    aboutSources: string;
  };
  common: {
    loading: string;
    error: string;
    live: string;
    updated: string;
    source: string;
    learnMore: string;
    viewAll: string;
    search: string;
    filter: string;
    close: string;
    save: string;
    cancel: string;
    login: string;
    logout: string;
    signup: string;
    back: string;
    subscribe: string;
    noData: string;
    retry: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    overview: string;
    riskIntelligence: string;
    gdp: string;
    inflation: string;
    priceIndices: string;
    monetaryPolicy: string;
    globalMarkets: string;
    realEconomy: string;
    foreignReserves: string;
    liveFX: string;
    exchangeRate: string;
    remittances: string;
    externalSector: string;
    newsIntelligence: string;
  };
  kpi: {
    gdpGrowth: string;
    quarterlyGDP: string;
    cpiInflation: string;
    coreInflation: string;
    wpiInflation: string;
    weeklyInflation: string;
    policyRate: string;
    foreignReserves: string;
    usdPkr: string;
    sarPkr: string;
    eurPkr: string;
    gbpPkr: string;
    currentAccount: string;
    tradeBalance: string;
    exports: string;
    imports: string;
    remittances: string;
    moneySupply: string;
    privateCredit: string;
    bankReserves: string;
    lsm: string;
    reer: string;
    fdi: string;
    fiscalBalance: string;
    tbill3m: string;
    pib3y: string;
    psxEtf: string;
    gold: string;
    silver: string;
    brentCrude: string;
    wtiCrude: string;
    naturalGas: string;
    externalDebt: string;
  };
  calendar: {
    title: string;
    subtitle: string;
    upcoming: string;
    past: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    allEvents: string;
    noEvents: string;
    subscribe: string;
    addToCalendar: string;
    monthly: string;
    quarterly: string;
    weekly: string;
    annual: string;
    scheduled: string;
    released: string;
    delayed: string;
  };
  budget: {
    title: string;
    subtitle: string;
    federalBudget: string;
    debtServicing: string;
    defence: string;
    psdp: string;
    subsidies: string;
    fiscalDeficit: string;
    provincialTransfers: string;
    education: string;
    health: string;
  };
  comparisons: {
    title: string;
    subtitle: string;
    externalSector: string;
    monetaryConditions: string;
    international: string;
    assetAllocation: string;
    economicStructure: string;
  };
  auth: {
    signIn: string;
    signInSubtitle: string;
    createAccount: string;
    createAccountSubtitle: string;
    email: string;
    password: string;
    forgotPassword: string;
    resetPassword: string;
    sendResetLink: string;
    backToSignIn: string;
    noAccount: string;
    haveAccount: string;
    continueWith: string;
  };
  subscription: {
    title: string;
    subtitle: string;
    emailPlaceholder: string;
    subscribe: string;
    success: string;
    error: string;
    privacy: string;
  };
  workshop: {
    title: string;
    subtitle: string;
    allCategories: string;
    fundamentals: string;
    banking: string;
    markets: string;
    international: string;
    advanced: string;
    beginner: string;
    intermediate: string;
    advanced_level: string;
    explanation: string;
    pakistanExample: string;
    realWorld: string;
    whyTraders: string;
    whyInvestors: string;
    relatedIndicators: string;
    faq: string;
    readMin: string;
    startLesson: string;
    nextLesson: string;
    prevLesson: string;
    backToCategory: string;
    backToWorkshop: string;
    lessons: string;
    premiumBadge: string;
    freeBadge: string;
    languageLabel: string;
  };
  errors: {
    notFound: string;
    serverError: string;
    noData: string;
    loadFailed: string;
    retry: string;
  };
}
