"use client";

import { motion } from "framer-motion";

export default function CreatorBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
      whileHover={{ boxShadow: "0 0 28px rgba(168, 85, 247, 0.45)" }}
      style={{ boxShadow: "0 0 12px rgba(56, 189, 248, 0.15)" }}
      // Section F1: a decorative attribution badge should never sit between
      // a visitor and real content — pointer-events-none means it can never
      // intercept a click meant for whatever's underneath it, and the lower
      // opacity keeps it from visually competing with page content it
      // happens to float over.
      className="glass-card pointer-events-none fixed bottom-3 right-3 z-40 whitespace-nowrap px-3 py-1.5 text-[10px] text-white/30 opacity-70 light:text-slate-400 sm:bottom-5 sm:right-5 sm:text-[11px]"
    >
      Farzam Arif <span className="text-white/20 light:text-slate-300">•</span> Economic Intelligence
      Dashboard
    </motion.div>
  );
}
