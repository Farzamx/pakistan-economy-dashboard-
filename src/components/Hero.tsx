"use client";

import { motion } from "framer-motion";
import HeroAuthCta from "@/components/HeroAuthCta";

interface Props {
  rightSlot?: React.ReactNode;
}

const TRUST_SIGNALS = ["Official Government Sources", "Updated Automatically", "SBP • PBS • IMF • World Bank"];

export default function Hero({ rightSlot }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-card glow-blue relative overflow-hidden p-6 sm:p-9"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-neon-purple/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-neon-blue/20 blur-3xl" />

      {/* Top-right slot — Data Sources button lives here. Flows inline,
          right-aligned, above the tagline on mobile (pushing it down
          naturally) rather than absolutely overlapping it — the shorter
          Hero from the Hero Section Optimization pass left too little
          vertical room at small widths for a fixed top-4 corner position
          without colliding with "LIVE ECONOMIC OVERVIEW". Reverts to the
          original absolute corner badge at sm: and up, where there's
          always been enough width for the two to coexist. */}
      {rightSlot && (
        <div className="relative mb-2 flex justify-end sm:absolute sm:right-6 sm:top-6 sm:mb-0">
          {rightSlot}
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-blue">
        Live Economic Overview
      </p>
      <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">
        Pakistan Economic{" "}
        <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
          Intelligence Center
        </span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">
        A real-time command center tracking the indicators that drive
        Pakistan&apos;s economy &mdash; growth, prices, reserves, currency and
        remittances, all in one place.
      </p>

      {/* Trust section — Hero Section Optimization pass. Sits between the
          description and the auth CTA so credibility lands before any
          conversion ask. */}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
        {TRUST_SIGNALS.map((signal) => (
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
