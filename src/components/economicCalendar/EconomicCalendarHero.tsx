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
      className="glass-card glow-blue relative overflow-hidden p-6 sm:p-9"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-neon-purple/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-neon-blue/20 blur-3xl" />

      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-blue">{t("calendar.title")}</p>
      <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">
        {t("calendar.heroMain")}{" "}
        <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">{t("calendar.heroGradient")}</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">
        {t("calendar.subtitle")}
      </p>
    </motion.section>
  );
}
