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

export type TranslationValue = string | ((...args: string[]) => string);

export interface Translations {
  topNav: {
    overview: string; markets: string; calendar: string;
    research: string; academy: string; riskIntel: string; premium: string;
    decisionLab: string;
  };

  nav: {
    main: string; analytics: string; premiumTools: string;
    overview: string; riskIntel: string; gdp: string; inflation: string; prices: string;
    monetaryPolicy: string; globalMarkets: string; realEconomy: string; reserves: string;
    liveFX: string; exchangeRate: string; remittances: string; externalSector: string; news: string;
    healthScore: string; macroSnapshot: string; intelligenceFeed: string; calendar: string; research: string;
    comparisons: string; budgetTracker: string; provincialBudget: string;
    economicCalendar: string; workshop: string; academy: string; freeSubscription: string;
    rankings: string; indicators: string; settings: string;
    logoName: string; logoSubtitle: string; liveData: string; psxLabel: string;
    memberBadge: string; memberSince: string; premiumAccess: string;
    executiveSummary: string; macroeconomy: string; tools: string;
    bonds: string; yieldCurve: string; commodities: string; researchLibrary: string;
    personalInflationCalculator: string; decisionSupportLab: string;
  };

  hero: {
    eyebrow: string; title1: string; title2: string; description: string;
    trust1: string; trust2: string; trust3: string;
    welcomeBack: string; createAccount: string; login: string;
    benefitComparisons: string; benefitBudget: string; benefitProvincial: string; benefitPremium: string;
    upcomingCalendar: string; criticalAlerts: string; noCriticalAlerts: string;
    riskStatus: string; latestRelease: string; nextRelease: string;
    morningBrief: string; nextUp: string; topRisks: string;
  };

  settings: {
    title: string; done: string; appearance: string; language: string;
    preferences: string; about: string;
    darkMode: string; darkModeDesc: string; lightMode: string; lightModeDesc: string;
    preferencesLink: string; preferencesGuest: string; loginLink: string;
    aboutName: string; aboutSources: string;
  };

  common: {
    loading: string; error: string; live: string; updated: string; source: string;
    learnMore: string; viewAll: string; search: string; filter: string; close: string;
    save: string; cancel: string; login: string; logout: string; signup: string;
    back: string; subscribe: string; noData: string; retry: string;
    previous: string; forecast: string; actual: string; pending: string; today: string;
    notAvailable: string; comingSoon: string;
    whyItMatters: string; faq: string; relatedPages: string;
    openDashboard: string; chartUnavailable: string;
    home: string; exportPng: string; exportCsv: string; fiscalYear: string;
    high: string; medium: string; low: string; all: string;
    confirmed: string; estimated: string; perCitizen: string;
    value: string; share: string; category: string;
    daysRemaining: string; released: string; upcoming: string;
    viewFull: string; minutes: string; months: string;
    dataUnavailable: string; noMatches: string; default: string;
  };

  dashboard: {
    title: string; subtitle: string; overview: string; riskIntelligence: string;
    gdp: string; inflation: string; priceIndices: string; monetaryPolicy: string;
    globalMarkets: string; realEconomy: string; foreignReserves: string; liveFX: string;
    exchangeRate: string; remittances: string; externalSector: string; newsIntelligence: string;
    marketStatus: string; marketStatusUpdated: string;
    monetaryExternal: string; monetaryExternalDesc: string;
    globalMarketsDesc: string;
    realEconomyFiscal: string; realEconomyFiscalDesc: string;
    liveExchangeRates: string; liveExchangeRatesDesc: string;
    sbpReserves: string; commercialBanks: string; totalReserves: string; importCover: string;
    quarterlyGdpChart: string; weeklyInflationChart: string; recentTrend: string; trend24Month: string;
    sbpEasyDataQuarterly: string; sbpEasyDataMonthly: string; pbsWeekly: string;
    sbpEasyDataOnDemand: string;
    healthScoreFallback: string;
    previousClose: string;
  };

  kpi: {
    gdpGrowth: string; quarterlyGDP: string; cpiInflation: string; coreInflation: string;
    wpiInflation: string; weeklyInflation: string; policyRate: string; foreignReserves: string;
    usdPkr: string; sarPkr: string; eurPkr: string; gbpPkr: string;
    currentAccount: string; tradeBalance: string; exports: string; imports: string;
    remittances: string; moneySupply: string; privateCredit: string; bankReserves: string;
    lsm: string; reer: string; fdi: string; fiscalBalance: string;
    tbill3m: string; pib3y: string; psxEtf: string;
    gold: string; silver: string; brentCrude: string; wtiCrude: string; naturalGas: string;
    externalDebt: string;
    learnMore: string; sourceNote: string;
    sourcePrimary: string; sourceSecondary: string; sourceNone: string;
    sourceFallback: string; sourceCurrently: string;
  };

  calendar: {
    title: string; subtitle: string; upcoming: string; past: string; today: string;
    thisWeek: string; thisMonth: string; allEvents: string; noEvents: string;
    subscribe: string; addToCalendar: string; monthly: string; quarterly: string;
    weekly: string; annual: string; scheduled: string; released: string; delayed: string;
    searchPlaceholder: string; allCategories: string; allImportance: string;
    allUpcoming: string; currentWeek: string; remainingThisMonth: string;
    highImpact: string; mediumImpact: string; lowImpact: string;
    previousCol: string; forecastCol: string; actualCol: string;
    pending: string; daysRemaining: string;
    statistics: string; upcomingEvents: string; highImpactEvents: string;
    nextMajor: string; nextMajorDesc: string;
    thisWeekTitle: string; thisWeekDesc: string; thisWeekEmpty: string;
    remainingTitle: string; remainingDesc: string; remainingEmpty: string;
    recentReleases: string; recentReleasesDesc: string;
    totalEvents: string; releasedEvents: string;
    searchReleased: string; releasedOnly: string; noEventsMatch: string; allYears: string;
    historicalContext: string;
    whyMatters: string; whyMattersDesc: string;
    marketReaction: string; potentialReaction: string; basedOnRelease: string;
    affectedIndicators: string; expectedFocus: string; goDeeper: string;
    viewFullCalendar: string; viewArchive: string; icsLink: string;
    surpriseAnalysis: string; vsForecasted: string; surprise: string; notRecorded: string;
    relatedEvents: string; relatedCalendar: string;
    dataQuality: string;
    dsSource: string; dsLastUpdated: string; dsConfidence: string;
    dsFreq: string; dsNextExpected: string; dsDateTime: string;
    dsConfirmed: string; dsOfficial: string; dsEstimated: string; dsManual: string;
    dsConfirmedDesc: string; dsOfficialDesc: string; dsEstimatedDesc: string; dsManualDesc: string;
    examplePreview: string; notRealAlert: string; nextScheduled: string;
    viewFull: string; subscribeToFeed: string; exploreMore: string; historicalArchive: string;
    eventCount: string; releasedBadge: string; upcomingBadge: string;
    archiveTitle: string; archiveDesc: string;
    heroMain: string; heroGradient: string;
    importance: string; dateRange: string;
    weeklyOutlookTitle: string;
    marketImpactTitle: string; marketImpactDesc: string; marketNotReleased: string;
    whyMattersSubtitle: string;
    topic1Title: string; topic1Body: string;
    topic2Title: string; topic2Body: string;
    topic3Title: string; topic3Body: string;
    topic4Title: string; topic4Body: string;
    topic5Title: string; topic5Body: string;
    calFaq1Q: string; calFaq1A: string; calFaq2Q: string; calFaq2A: string;
    calFaq3Q: string; calFaq3A: string; calFaq4Q: string; calFaq4A: string;
    calFaq5Q: string; calFaq5A: string; calFaq6Q: string; calFaq6A: string;
    archiveFaq1Q: string; archiveFaq1A: string; archiveFaq2Q: string; archiveFaq2A: string;
    archiveFaq3Q: string; archiveFaq3A: string; archiveFaq4Q: string; archiveFaq4A: string;
    exploreLink: string; archiveHeroDesc: string;
  };

  budget: {
    title: string; subtitle: string; federalBudget: string; debtServicing: string;
    defence: string; psdp: string; subsidies: string; fiscalDeficit: string;
    provincialTransfers: string; education: string; health: string;
    workshopTitle: string; description: string; fiscalYear: string;
    totalOutlay: string; fbr: string; debtShare: string; shareOfBudget: string;
    whereDoesGo: string; whereDoesGoDesc: string;
    historicalExplorer: string; historicalExplorerDesc: string;
    budgetInsights: string; exploreByCategory: string;
    rs100Title: string; rs100Desc: string;
    exportPng: string; exportCsv: string; sourceNote: string; federalNote: string;
    nominal: string; percentOfGdp: string;
    lookingForProvincial: string; lookingForProvincialDesc: string;
    budgetBrief: string; viewFullWorkshop: string;
    whyItMatters: string; faq: string; relatedCategories: string; sourceCitations: string;
    fyValue: string; shareOfTotal: string; shareOfGdp: string; trendTitle: string; note: string;
    romanUrdu: string; hideRomanUrdu: string;
    workshopDescription: string; workshopDesc: string;
    budgetEstimateNote: string;
  };

  provincial: {
    workshopTitle: string; description: string; fiscalYear: string;
    allProvinces: string; rankings: string; growthExplorer: string; compareAll: string;
    totalBudget: string; development: string; education: string; health: string;
    agriculture: string; debtServicing: string; federalTransfers: string; ownRevenue: string;
    whereDoesGo: string; whereDoesGoDesc: string;
    donut: string; treemap: string; table: string;
    dataNotes: string; related: string;
    rs100Title: string; rs100Desc: string;
    debtTitle: string; debtServiceLabel: string; yoyChange: string;
    debtPerCitizen: string; notComparable: string;
    perCitizen: string; populationNote: string;
    category: string; rsBillion: string; share: string; otherNote: string;
    rankingDashboard: string; rankingDesc: string;
    trendMode: string; growthMode: string; perCapitaMode: string; rankingMode: string;
    fullHistory: string; last5Years: string; last10Years: string;
    noData: string; partialData: string; value: string; notAvailable: string;
    capital: string; totalBudgetLabel: string; viewWorkshop: string;
    intelligenceTitle: string; intelligenceDesc: string;
    compareTitle: string; compareDesc: string; whyItMatters: string; faq: string;
    tableTotal: string; tableDevelopment: string; tableCurrent: string;
    tableEducation: string; tableHealth: string; tableDebt: string;
    tableTransfers: string; tableOwnRevenue: string; compareOnMetrics: string;
    growthExplorerTitle: string; growthExplorerDesc: string;
    growthSince: string; cagrFull: string; largestIncrease: string; largestDecline: string;
    noDecline: string; yoyChangeDesc: string; perCitizenTitle: string;
    toLabel: string; gapYear: string; allFourProvinces: string;
    perCapitaChartNote: string; sourceBudgetDocs: string; rankingNote: string;
    rankingsSuffix: string; notAvailableYear: string; compareMetricsLink: string;
    intelligencePageDesc: string; compareAllFour: string; compareAllFourDesc: string;
    deepDivesLabel: string; crossCompLabel: string; rankingsToolsLabel: string;
    compareTableTitle: string; compareTableDesc: string; budgetEstimate: string;
    noVerifiedFigure: string; provincialInsights: string; historicalInsights: string;
  };

  comparisons: {
    title: string; subtitle: string; description: string;
    externalSector: string; monetaryConditions: string; international: string;
    assetAllocation: string; economicStructure: string;
    buildTitle: string; buildDesc: string; indicatorA: string; indicatorB: string;
    loading: string; compareBtn: string; pickDifferent: string;
    perfTitle: string; perfDesc: string; startFrom: string; disclaimer: string;
    time1Y: string; time3Y: string; time5Y: string; time10Y: string; timeMax: string;
    modeRaw: string; modePct: string; modeIndex: string;
    dataUnavailable: string; dataUnavailableDesc: string; noOverlap: string;
    gdpUnavailable: string; worldBankSource: string;
    whyItMatters: string; faq: string; relatedComparisons: string; viewAll: string;
    agriculture: string; industry: string; services: string;
    sourcesLabel: string; noOverlapDetailed: string; unavailableError: string;
    perfKseNote: string;
  };

  auth: {
    signIn: string; signInSubtitle: string; createAccount: string; createAccountSubtitle: string;
    email: string; password: string; forgotPassword: string; resetPassword: string;
    sendResetLink: string; backToSignIn: string; noAccount: string; haveAccount: string;
    continueWith: string;
    logoName: string; logoSubtitle: string;
    welcomeBack: string; loginSubtitle: string;
    signupTitle: string; signupSubtitle: string;
    forgotPasswordTitle: string; forgotPasswordSubtitle: string;
    resetPasswordTitle: string; resetPasswordSubtitle: string;
    noAccountLink: string; createOneLink: string; haveAccountLink: string; backToLoginLink: string;
    emailPlaceholder: string; atLeast8: string;
    confirmPassword: string; confirmNewPassword: string; newPassword: string;
    signingIn: string; creatingAccount: string; sending: string; updating: string;
    logInBtn: string; createAccountBtn: string; sendResetLinkBtn: string; updatePasswordBtn: string;
    accountCreated: string; resetEmailSent: string;
    termsNote: string;
    benefitBudget: string; benefitCompare: string; benefitProvincial: string;
    benefitPreferences: string; benefitPremium: string;
    guestTitle: string; guestDesc: string;
  };

  subscription: {
    title: string; subtitle: string; emailPlaceholder: string;
    subscribe: string; success: string; error: string; privacy: string;
    notificationsTitle: string; neverMiss: string; officialDesc: string;
    sbpSource: string; pbsSource: string; mofSource: string; otherSource: string;
    trustOfficial: string; trustVerified: string; trustFast: string;
    trustNoSpam: string; trustUnsubscribe: string; trustFree: string;
    monetaryDecisions: string; workerRemittances: string; largeLSM: string;
    consumerPrices: string; tradeBalance: string;
    currentAccount: string; foreignReserves: string; gdpGrowthData: string;
    fiscalData: string; kseData: string; spiData: string; wpiData: string; fdiData: string;
    audienceText: string;
    errInvalidEmail: string; errTooMany: string; errAlreadyConfirmed: string;
    errBlocked: string; errServer: string; tryAgainIn: string;
    alreadySubscribed: string; alreadySubscribedDesc: string;
    checkInbox: string; checkInboxDesc: string;
    resent: string; resending: string; resendBtn: string; changeEmail: string;
    privacyNote: string; manageLink: string; managePrompt: string;
    manageTitle: string; manageDesc: string; unsubscribeBtn: string;
    manageFooter: string; backToCalendar: string;
    oneEmail: string; oneEmailDesc: string; youllReceive: string; subscribing: string;
    coreInflation: string; monetaryPolicyReports: string;
    tbillAuctions: string; pibAuctions: string;
  };

  modal: {
    close: string;
    logoutTitle: string; logoutDesc: string; cancel: string; loggingOut: string; logout: string;
    psxTitle: string; psxDesc: string; psxSubDesc: string; gotIt: string; comingSoon: string;
    dsTitle: string; dsSubtitle: string; dsLegend: string;
    dsVerified: string; dsDelayed: string; dsCached: string; dsFallback: string; dsUnavailable: string;
    dsColIndicator: string; dsColSource: string; dsColMethod: string; dsColId: string;
    dsColPrimary: string; dsColUpdated: string; dsColFreq: string; dsColStatus: string;
    dsHoverNote: string; dsLive: string; dsAsNeeded: string;
  };

  search: {
    placeholder: string; noMatches: string;
  };

  tooltip: {
    whatIs: string; whyMatters: string; howToRead: string;
    translating: string; hideRomanUrdu: string; showRomanUrdu: string; romanUrdu: string;
    unavailable: string;
  };

  assistant: {
    title: string; badge: string; placeholder: string; send: string;
    translating: string; hide: string; show: string; romanUrdu: string;
    searched: string; searchedNone: string; sources: string; footer: string;
    highConf: string; medConf: string; lowConf: string;
    error: string; askAnything: string;
    suggestedQ1: string; suggestedQ2: string; suggestedQ3: string; suggestedQ4: string; suggestedQ5: string;
  };

  prefs: {
    title: string; description: string;
    theme: string; defaultProvince: string; sectionsTitle: string; sectionsDesc: string;
    pinned: string; visible: string; hidden: string;
    unpin: string; pin: string; hide: string; show: string;
    noPinned: string; noneLeft: string; noneHidden: string;
    saving: string; mode: string;
  };

  researchTeaser: {
    riskTitle: string; academyTitle: string; comparisonsTitle: string;
  };

  macroSnapshot: {
    title: string; liveFrom: string; driversTitle: string; marketsTitle: string;
  };

  riskIntel: {
    title: string; description: string;
    lastComputed: string; nextUpdate: string; updateNote: string;
    quant: string; transparency: string; lastCalculated: string;
    indicators: string; confidence: string;
    noneStale: string; stale: string; modelScore: string;
    keyRisks: string; strengths: string;
    lowRisk: string; elevatedRisk: string; highRisk: string; severeRisk: string;
    recession: string; default: string;
    currentSuffix: string; modelScoreNote: string;
  };

  news: {
    title: string; description: string;
    refreshed: string; sources: string; breakingRefresh: string;
    unavailable: string; relevance: string; sourceRating: string; aiUnavailable: string;
    riskLow: string; riskMed: string; riskHigh: string;
    catAll: string; catPakistanEconomy: string; catImfDebt: string;
    catCentralBanks: string; catEnergy: string; catGeopolitics: string;
    catGlobalMacro: string; catMarkets: string;
    freshFresh: string; freshRecent: string; freshAging: string;
    sentBullish: string; sentBearish: string; sentNeutral: string;
  };

  health: {
    title: string; risk: string;
    statusStrong: string; statusModerate: string; statusWeak: string;
    riskLow: string; riskModerate: string; riskHigh: string;
    sentBullish: string; sentNeutral: string; sentBearish: string;
    topStrengths: string; topWeaknesses: string;
  };

  market: {
    statusLabel: string; updated: string;
  };

  popularInsights: {
    title: string; explore: string;
    comparison: string; budget: string; provincial: string;
    insightPakVsIndia: string; insightTaxMoney: string; insightDefence: string;
    insightEducation: string; insightHealth: string; insightPunjab: string;
    insightSindh: string; insightDebtDefence: string; insightRankings: string;
    insightExportsImports: string;
  };

  pinnedIndicators: {
    title: string;
  };

  seo: {
    whatThisMeans: string; whyItMatters: string; faq: string; relatedPages: string;
    openDashboard: string; chartUnavailable: string;
  };

  sitemap: {
    title: string; description: string;
    indicators: string; comparisons: string; budget: string; provincial: string; mainDashboard: string;
    openDashboard: string;
  };

  workshop: {
    title: string; subtitle: string; allCategories: string;
    fundamentals: string; banking: string; markets: string; international: string;
    advanced: string; beginner: string; intermediate: string; advanced_level: string;
    explanation: string; pakistanExample: string; realWorld: string;
    whyTraders: string; whyInvestors: string; relatedIndicators: string;
    faq: string; readMin: string; startLesson: string; nextLesson: string; prevLesson: string;
    backToCategory: string; backToWorkshop: string; lessons: string;
    premiumBadge: string; freeBadge: string; languageLabel: string;
    comingSoon: string; multilingual: string; switchLanguage: string;
    home: string;
  };

  academy: {
    title: string; subtitle: string; description: string;
    allCategories: string; lessons: string; readMin: string;
    beginner: string; intermediate: string; advanced: string;
    overview: string; whyItMatters: string; explanation: string;
    misconceptions: string; pakistanExample: string; realWorld: string; summary: string;
    relatedIndicators: string; relatedLessons: string;
    faq: string; quiz: string; quizStart: string; quizNext: string; quizSubmit: string;
    quizCorrect: string; quizIncorrect: string; quizScore: string;
    startLesson: string; nextLesson: string; prevLesson: string;
    backToCategory: string; backToAcademy: string;
    premiumBadge: string; freeBadge: string;
    premiumTitle: string; premiumDesc: string;
    lockTitle: string; lockDesc: string; createFreeAccount: string; logIn: string;
    glossaryTitle: string; glossarySubtitle: string; glossarySearch: string;
    glossaryNoResults: string; glossaryBrowseAll: string;
    termDefinition: string; termExplanation: string; termPakistanContext: string;
    termExample: string; termRelated: string;
    pathsTitle: string; pathsSubtitle: string; pathHours: string; pathLessons: string;
    startPath: string; continuePath: string;
    home: string; exploreAll: string; learnMore: string;
    categoriesTitle: string; categoriesSubtitle: string;
    heroEyebrow: string; heroTitle: string; heroSubtitle: string;
    statLessons: string; statCategories: string; statTerms: string;
    filterAll: string; filterFree: string; filterPremium: string;
    sortByPopular: string; sortByNewest: string; sortByLevel: string;
  };

  errors: {
    notFound: string; serverError: string; noData: string; loadFailed: string; retry: string;
  };

  personalInflation: {
    eyebrow: string; title: string; subtitle: string; ctaCalculate: string;
    inputModePercent: string; inputModeSpending: string;
    totalAllocated: string; totalMustEqual: string; totalOk: string;
    monthlySpendingLabel: string; monthlySpendingTotal: string;
    monthlyBudgetLabel: string; remaining: string;
    statusOnTrack: string; statusUnder: string; statusOver: string;
    scenariosTitle: string; scenariosDesc: string; loadScenario: string;
    saveScenario: string; savedScenarios: string; scenarioNamePlaceholder: string;
    saveCurrentAsScenario: string; deleteScenario: string; noSavedScenarios: string;
    existingProfilesLabel: string; selectProfilePlaceholder: string;
    resetBtn: string;
    resultsTitle: string; officialCpiLabel: string; yourInflationLabel: string; differenceLabel: string;
    verdictHigher: string; verdictLower: string; verdictNeutral: string;
    explanationTitle: string;
    breakdownTitle: string; colCategory: string; colYourWeight: string;
    colOfficialWeight: string; colCategoryInflation: string; colContribution: string; colAmount: string;
    chartComparisonTitle: string; chartContributionTitle: string; chartCompositionTitle: string;
    shareTitle: string; shareDownload: string; shareCopyLink: string;
    shareToX: string; shareToLinkedIn: string; shareToWhatsApp: string; shareDownloadPdf: string; shareNative: string;
    shareCopied: string; shareCardFooter: string;
    dataQualityNote: string; dataAsOf: string; sourceLabel: string; verifiedBadge: string;
    notYetAvailableTitle: string; notYetAvailableDesc: string;
    scenarioStudentLabel: string; scenarioStudentDesc: string;
    scenarioFamilyLabel: string; scenarioFamilyDesc: string;
    scenarioRetiredLabel: string; scenarioRetiredDesc: string;
    scenarioSmallBusinessLabel: string; scenarioSmallBusinessDesc: string;
    faq: string;
    faq1Q: string; faq1A: string; faq2Q: string; faq2A: string;
    faq3Q: string; faq3A: string; faq4Q: string; faq4A: string; faq5Q: string; faq5A: string;
  };

  decisionSupportLab: {
    eyebrow: string; title: string; subtitle: string;
    trustSources: string; trustMethodology: string;
    toolsTitle: string; toolsSubtitle: string;
    statusAvailable: string; statusComingSoon: string; openTool: string;
    estimate: { phase2: string; phase3: string };
    tool: {
      personalInflation: { description: string };
      purchasingPower: { title: string; description: string };
      salaryPurchasingPower: { title: string; description: string };
      budgetAllocation: { title: string; description: string };
      inflationImpact: { title: string; description: string };
      savingsErosion: { title: string; description: string };
      futureValue: { title: string; description: string };
      presentValue: { title: string; description: string };
    };
    identityTitle: string; identityDesc: string;
    identityCity: string; identityCityPlaceholder: string;
    identityIncome: string; identitySpending: string; identityHousehold: string;
    identityFilerStatus: string; identityFilerUnknown: string; identityFilerYes: string; identityFilerNo: string;
    identityCurrency: string; identityCurrencyNote: string; identityCurrencyLabel: string;
    useIdentitySuggestion: string;
    explainTheMathTitle: string; explainSource: string; explainLastUpdated: string;
    explainAssumptions: string; explainLimitations: string; explainFrequency: string;
    educationTitle: string;
    eduWhatQuestion: string; eduWhyQuestion: string; eduHowQuestion: string; eduSourcesQuestion: string;
    downloadReport: string; generatingReport: string;
    decisionPanelTitle: string; whatHappenedQuestion: string; whyHappenedQuestion: string;
    whatToUnderstandQuestion: string; relatedToolsLabel: string; suggestedNextLabel: string;
    insightsTitle: string;
    dataNotYetAvailableTitle: string; dataNotYetAvailableDesc: string;
  };

  budgetAllocation: {
    eyebrow: string; title: string; subtitle: string; cta: string;
    compositionTitle: string;
  };

  purchasingPower: {
    eyebrow: string; title: string; subtitle: string; cta: string;
    amountLabel: string; baseYearLabel: string; targetYearLabel: string; sourceLabel: string;
    resultsTitle: string; purchasingPowerTodayLabel: string; inflationLossLabel: string;
    percentChangeLabel: string; realValueLabel: string; inflationAdjustedLabel: string;
    timelineTitle: string; waterfallTitle: string; comparisonTitle: string;
    asOfLabel: string; sourceOneLabel: string;
  };
}
