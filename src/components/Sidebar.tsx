"use client";

import { motion } from "framer-motion";

const navItems = [
  { label: "Overview", href: "#overview", active: true },
  { label: "GDP", href: "#gdp", active: false },
  { label: "Inflation", href: "#inflation", active: false },
  { label: "Reserves", href: "#reserves", active: false },
  { label: "Exchange Rate", href: "#exchange-rate", active: false },
  { label: "Remittances", href: "#remittances", active: false },
  { label: "Settings", href: "#", active: false },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-8 border-r border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl sm:flex">
      <div className="flex items-center gap-3">
        <div className="glow-blue flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple text-lg font-bold text-white">
          P
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Pakistan EIC</p>
          <p className="text-xs text-white/40">Economic Dashboard</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <motion.a
            key={item.label}
            href={item.href}
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={
              item.active
                ? "glow-blue rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-white"
                : "rounded-lg px-4 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            }
          >
            {item.label}
          </motion.a>
        ))}
      </nav>

      <div className="mt-auto rounded-xl border border-white/5 bg-white/[0.03] p-4 text-xs text-white/40">
        Phase 1 &mdash; mock data only. Live data sources coming soon.
      </div>
    </aside>
  );
}
