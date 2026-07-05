"use client";

import { motion } from "framer-motion";
import HeroAuthCta from "@/components/HeroAuthCta";
import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  rightSlot?: React.ReactNode;
}

export default function Hero({ rightSlot }: Props) {
  const { t } = useLanguage();
  const trustSignals = [t("hero.trust1"), t("hero.trust2"), t("hero.trust3")];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-card glow-blue relative overflow-hidden p-6 sm:p-9"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-neon-purple/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-neon-blue/20 blur-3xl" />

      {rightSlot && (
        <div className="relative mb-2 flex justify-end sm:absolute sm:right-6 sm:top-6 sm:mb-0">
          {rightSlot}
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-blue">
        {t("hero.eyebrow")}
      </p>
      <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">
        {t("hero.title1")}{" "}
        <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
          {t("hero.title2")}
        </span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">
        {t("hero.description")}
      </p>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
        {trustSignals.map((signal) => (
          <li key={signal} className="flex items-center gap-1.5 text-xs text-white/45 light:text-slate-500">
            <span className="text-emerald-400">✓</span>
            {signal}
          </li>
        ))}
      </ul>

      <HeroAuthCta />
    </motion.section>
  );
}
