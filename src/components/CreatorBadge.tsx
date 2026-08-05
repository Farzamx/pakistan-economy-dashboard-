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
      // Section F1 (unchanged): pointer-events-none so this decorative
      // credit can never intercept a click meant for content underneath.
      // Phase M1 §6: text is now "Developed by Farzam Arif" everywhere — a
      // product credit line, not a watermark. Sizing/position below
      // min-[800px] is mobile-specific (smaller, slimmer, single line);
      // at min-[800px] and up every value matches what this component
      // already rendered before this change, so desktop is visually
      // identical to before.
      className="glass-card pointer-events-none fixed bottom-2 right-2 z-40 whitespace-nowrap px-2 py-1 text-[9px] text-white/30 opacity-70 light:text-slate-400 min-[800px]:bottom-5 min-[800px]:right-5 min-[800px]:px-3 min-[800px]:py-1.5 min-[800px]:text-[11px]"
    >
      Developed by Farzam Arif
    </motion.div>
  );
}
