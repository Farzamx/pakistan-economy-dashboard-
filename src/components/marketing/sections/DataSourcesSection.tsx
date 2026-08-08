import Link from "next/link";
import SectionReveal from "@/components/marketing/SectionReveal";

// Text only, IBM Plex Mono — no logos (trademarks; a small site displaying
// them can read as an endorsement claim it hasn't earned).
const SOURCES = [
  { name: "SBP", full: "State Bank of Pakistan", frequency: "Daily / Weekly / Monthly" },
  { name: "PBS", full: "Pakistan Bureau of Statistics", frequency: "Weekly / Monthly" },
  { name: "PSX", full: "Tracked via a correlated ETF proxy (see methodology)", frequency: "Hourly" },
  { name: "IMF", full: "Referenced for context, not a live feed", frequency: "As cited" },
  { name: "World Bank", full: "World Bank Open Data", frequency: "Annual" },
];

export default function DataSourcesSection() {
  return (
    <section
      id="data-sources"
      className="mkt-content-scrim mx-auto w-full max-w-[1200px] scroll-mt-24 px-5 py-16 min-[1024px]:px-10 min-[1024px]:py-24"
    >
      <SectionReveal className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
            Sourcing
          </span>
          <h2 className="text-[28px] font-bold leading-tight min-[1024px]:text-[36px]" style={{ fontFamily: "var(--font-marketing-heading)", color: "var(--paper)" }}>
            Where the data comes from
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 min-[1024px]:grid-cols-5 min-[1024px]:gap-6">
          {SOURCES.map((source) => (
            <div key={source.name} className="rounded-lg border p-4" style={{ borderColor: "var(--ink-raised)" }}>
              <p className="text-[15px] font-medium" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--paper)" }}>
                {source.name}
              </p>
              <p className="mt-1 text-[12px] leading-snug" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}>
                {source.full}
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.06em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
                {source.frequency}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/methodology"
          className="w-fit text-[14px] underline decoration-dotted underline-offset-4"
          style={{ fontFamily: "var(--font-marketing-body)", color: "var(--paper)" }}
        >
          Read the full methodology →
        </Link>
      </SectionReveal>
    </section>
  );
}
