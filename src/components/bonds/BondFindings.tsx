import { Disclosure } from "@/components/shell/Disclosure";
import type { BondInsight } from "@/lib/bonds/snapshot";
import { formatDate } from "@/lib/policyRate/format";

const UNIT: Record<BondInsight["evidence"][number]["unit"], (v: number) => string> = {
  "%": (v) => `${v.toFixed(2)}%`,
  bp: (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1).replace(/\.0$/, "")} bp`,
  pp: (v) => `${v.toFixed(2)} pp`,
  "Rs bn": (v) => `Rs ${v.toLocaleString("en-US")}bn`,
  x: (v) => `${v.toFixed(2)}×`,
  auctions: (v) => v.toLocaleString("en-US"),
};

/** The findings: one sentence each, with the figures it is computed from and its caveat one click away. Server-compatible. */
export default function BondFindings({ insights }: { insights: BondInsight[] }) {
  if (insights.length === 0) return <p className="text-[13px] text-pe-text-3">No findings can be computed from the available auctions.</p>;
  return (
    <ul className="flex flex-col divide-y divide-pe-border" data-testid="bond-findings">
      {insights.map((i) => (
        <li key={i.id} className="py-2.5 first:pt-0 last:pb-0">
          <p className="text-[14px] leading-relaxed text-pe-text">{i.text}</p>
          <Disclosure summary="Figures and caveat" className="mt-0.5">
            <ul className="grid gap-x-6 gap-y-0.5 text-[12px] sm:grid-cols-2">
              {i.evidence.map((e, j) => (
                <li key={j} className="flex justify-between gap-3 tabular-nums">
                  <span className="text-pe-text-2">
                    {e.label} · {formatDate(e.date)}
                  </span>
                  <span className="text-pe-text">{UNIT[e.unit](e.value)}</span>
                </li>
              ))}
            </ul>
            {i.caveat && <p className="mt-2 text-[12px] text-pe-text-3">{i.caveat}</p>}
          </Disclosure>
        </li>
      ))}
    </ul>
  );
}
