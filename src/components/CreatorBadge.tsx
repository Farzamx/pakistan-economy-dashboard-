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
      className="glass-card fixed bottom-3 right-3 z-40 whitespace-nowrap px-3 py-1.5 text-[10px] text-white/40 transition-colors hover:text-white/70 sm:bottom-5 sm:right-5 sm:text-[11px]"
    >
      Farzam Arif <span className="text-white/20">•</span> Economic Intelligence
      Dashboard
    </motion.div>
  );
}
