"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * Title/intro banner only — the KPI tiles that used to live here moved to
 * their own CalendarStatistics section, positioned lower on the page
 * (see EconomicCalendarWorkspace's render order). An investor-grade
 * calendar should lead with "what just happened" and "what's next," not
 * summary counts — Recent Releases now occupies the slot directly below
 * this Hero instead.
 */
export default function EconomicCalendarHero() {
  const { t } = useLanguage();
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-card p-6 sm:p-9"
    >
      <p className="text-label text-neon-blue">{t("calendar.title")}</p>
      <h1 className="text-headline mt-2.5 text-white light:text-slate-900">
        {t("calendar.heroMain")} {t("calendar.heroGradient")}
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">
        {t("calendar.subtitle")}
      </p>
    </motion.section>
  );
}
