import SectionReveal from "@/components/marketing/SectionReveal";

const ITEMS = [
  {
    eyebrow: "Track",
    title: "Live indicators",
    body: "Inflation, reserves, the rupee, PSX and more — tracked from source data and updated on the schedule each one actually publishes on.",
  },
  {
    eyebrow: "Understand",
    title: "Research and analysis",
    body: "Context for what moved and why, drawn from the same official releases the numbers themselves come from — not commentary layered on top of a guess.",
  },
  {
    eyebrow: "Decide",
    title: "Decision Support Lab",
    body: "Calculators that turn official data into a specific answer about your own income, savings and inflation exposure.",
  },
];

export default function WhatPeicDoes() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 py-16 min-[1024px]:px-10 min-[1024px]:py-24">
      <SectionReveal className="grid grid-cols-1 gap-6 min-[1024px]:grid-cols-3 min-[1024px]:gap-8">
        {ITEMS.map((item) => (
          <div key={item.eyebrow} className="flex flex-col gap-3 rounded-xl border p-6" style={{ borderColor: "var(--ink-raised)", background: "var(--ink-raised)" }}>
            <span
              className="text-[11px] uppercase tracking-[0.14em]"
              style={{ fontFamily: "var(--font-marketing-data)", color: "var(--cyan)" }}
            >
              {item.eyebrow}
            </span>
            <h2 className="text-[22px] font-bold leading-tight" style={{ fontFamily: "var(--font-marketing-heading)", color: "var(--paper)" }}>
              {item.title}
            </h2>
            <p className="text-[15px] leading-relaxed" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}>
              {item.body}
            </p>
          </div>
        ))}
      </SectionReveal>
    </section>
  );
}
