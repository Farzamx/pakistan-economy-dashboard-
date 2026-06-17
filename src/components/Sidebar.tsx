"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SettingsModal from "@/components/SettingsModal";

const NAV_ITEMS = [
  { label: "Overview",        href: "#overview" },
  { label: "Risk Intel",      href: "#risk-intelligence" },
  { label: "GDP",             href: "#gdp" },
  { label: "Inflation",       href: "#inflation" },
  { label: "Prices",          href: "#price-indices" },
  { label: "Monetary Policy", href: "#monetary-policy" },
  { label: "Global Markets",  href: "#global-markets" },
  { label: "Fin. Markets",    href: "#financial-markets" },
  { label: "Real Economy",    href: "#real-economy" },
  { label: "Reserves",        href: "#reserves" },
  { label: "Live FX",         href: "#live-fx" },
  { label: "Exchange Rate",   href: "#exchange-rate" },
  { label: "Remittances",     href: "#remittances" },
  { label: "External Sector", href: "#external-sector" },
  { label: "News",            href: "#news-intelligence" },
];

export default function Sidebar() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col gap-8 border-r border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-6 backdrop-blur-xl light:backdrop-blur-none sm:flex sticky top-0 h-screen overflow-y-auto hide-scrollbar light:shadow-[1px_0_0_0_#E2E6EF]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="glow-blue flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple text-lg font-bold text-white">
            P
          </div>
          <div>
            <p className="text-sm font-semibold text-white light:text-slate-900">Pakistan EIC</p>
            <p className="text-xs text-white/40 light:text-slate-400">Economic Dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <motion.a
              key={item.label}
              href={item.href}
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-white/50 light:text-slate-500 transition-colors hover:bg-white/5 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
            >
              {item.label}
            </motion.a>
          ))}

          {/* Settings — opens modal, not a nav link */}
          <motion.button
            type="button"
            onClick={() => setSettingsOpen(true)}
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white/50 light:text-slate-500 transition-colors hover:bg-white/5 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
          >
            <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="2.5" />
              <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" strokeLinecap="round" />
            </svg>
            Settings
          </motion.button>
        </nav>

        {/* Footer note */}
        <div className="mt-auto rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.03] light:bg-slate-50 p-4 text-xs text-white/40 light:text-slate-400">
          Live data from SBP EasyData &amp; World Bank.
        </div>
      </aside>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
