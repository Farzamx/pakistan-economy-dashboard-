import Link from "next/link";
import SectionReveal from "@/components/marketing/SectionReveal";
import EconomicIdentityReplica from "@/components/marketing/sections/EconomicIdentityReplica";

// Real tool names/routes, read directly from src/lib/decisionSupportLab/tools.ts
// — never invented. One from each major category for a representative spread.
const TOOLS = [
  { name: "Personal Inflation Calculator", href: "/decision-support-lab/personal-inflation" },
  { name: "Purchasing Power Calculator", href: "/decision-support-lab/purchasing-power" },
  { name: "Emergency Fund Planner", href: "/decision-support-lab/emergency-fund-planner" },
  { name: "Personal Economic Health Score", href: "/decision-support-lab/health-score" },
  { name: "Asset Comparison Lab", href: "/decision-support-lab/asset-comparison-lab" },
];

export default function DecisionSupportLabSection() {
  return (
    <section id="platform" className="mkt-content-scrim mx-auto w-full max-w-[1200px] px-5 py-16 min-[1024px]:px-10 min-[1024px]:py-24">
      <SectionReveal className="grid grid-cols-1 gap-10 min-[1024px]:grid-cols-2 min-[1024px]:items-start min-[1024px]:gap-16">
        <div className="flex flex-col gap-5">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
            The flagship
          </span>
          <h2 className="text-[28px] font-bold leading-tight min-[1024px]:text-[36px]" style={{ fontFamily: "var(--font-marketing-heading)", color: "var(--paper)" }}>
            Decision Support Lab
          </h2>
          <p className="max-w-[46ch] text-[15px] leading-relaxed min-[1024px]:text-[16px]" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}>
            Twenty-six calculators built on the same official data as the rest of the platform — set your numbers once, and every tool reuses them automatically.
          </p>
          <ul className="flex flex-col gap-2.5">
            {TOOLS.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className="text-[14px] underline decoration-dotted underline-offset-4 transition-colors"
                  style={{ fontFamily: "var(--font-marketing-body)", color: "var(--paper)" }}
                >
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/overview"
            className="mt-2 flex w-fit min-h-[44px] items-center justify-center rounded-lg px-6 py-3 text-[15px] font-semibold"
            style={{ fontFamily: "var(--font-marketing-body)", background: "var(--indigo)", color: "var(--paper)" }}
          >
            Open the platform
          </Link>
        </div>

        <EconomicIdentityReplica />
      </SectionReveal>
    </section>
  );
}
