"use client";

import { motion } from "framer-motion";

interface Props {
  rightSlot?: React.ReactNode;
}

export default function Hero({ rightSlot }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-card glow-blue relative overflow-hidden p-8 sm:p-12"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-neon-purple/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-neon-blue/20 blur-3xl" />

      {/* Top-right slot — Data Sources button lives here */}
      {rightSlot && (
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          {rightSlot}
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-blue">
        Live Economic Overview
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
        Pakistan Economic{" "}
        <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
          Intelligence Center
        </span>
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-white/60 sm:text-base">
        A real-time command center tracking the indicators that drive
        Pakistan&apos;s economy &mdash; growth, prices, reserves, currency and
        remittances, all in one place.
      </p>
    </motion.section>
  );
}
