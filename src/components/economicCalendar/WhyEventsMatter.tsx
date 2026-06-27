interface Topic {
  title: string;
  body: string;
}

const TOPICS: Topic[] = [
  {
    title: "Why inflation matters",
    body: "Inflation erodes how far a household's income stretches and is the single number SBP weighs most heavily when setting interest rates. Rising inflation typically precedes a tighter policy rate; falling inflation opens room for cuts.",
  },
  {
    title: "Why policy rates matter",
    body: "The SBP policy rate sets the benchmark cost of borrowing across the entire economy — mortgages, business loans, and government debt all reprice off it. A rate decision can move markets within minutes of being announced.",
  },
  {
    title: "Why reserves matter",
    body: "Foreign exchange reserves are the buffer that lets SBP defend the Rupee and meet external debt obligations. Falling reserves signal mounting pressure; rising reserves give the currency more room to stabilize.",
  },
  {
    title: "Why trade balance matters",
    body: "The gap between exports and imports determines how much foreign currency the economy generates versus consumes. A widening trade deficit increases demand for Dollars and pressures both reserves and the exchange rate.",
  },
  {
    title: "Why current account matters",
    body: "The current account is the broadest measure of money flowing in and out of Pakistan internationally — trade, remittances, and investment income combined. A persistent deficit must be financed by borrowing or reserve drawdowns, making it one of the most closely watched signals of external vulnerability.",
  },
];

export default function WhyEventsMatter() {
  return (
    <section className="glass-card flex flex-col gap-5 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">Why These Events Matter</h2>
        <p className="mt-1 text-sm text-white/50 light:text-slate-500">
          A plain-English guide to the releases that move Pakistan&apos;s markets and policy decisions.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOPICS.map((topic) => (
          <div key={topic.title} className="rounded-xl border border-white/5 light:border-slate-100 bg-white/[0.02] light:bg-slate-50 p-4">
            <p className="text-sm font-semibold text-white light:text-slate-900">{topic.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{topic.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
