"use client";

import dynamic from "next/dynamic";
import type { PersonalInflationResult } from "@/lib/personalInflation/engine";

// Recharts is a heavy dependency — deferred out of the initial calculator
// bundle and only fetched once the results section actually mounts (results
// only exist after the user has entered an allocation), per the brief's
// "lazy-load heavy charts" requirement. ssr:false because ResponsiveContainer
// needs a real DOM measurement pass; a server-rendered chart would just be
// discarded and re-rendered on hydration anyway.
const PersonalInflationChartsInner = dynamic(() => import("@/components/personalInflation/PersonalInflationChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[400px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  result: PersonalInflationResult;
}

export default function PersonalInflationCharts({ result }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <PersonalInflationChartsInner result={result} />
    </div>
  );
}
