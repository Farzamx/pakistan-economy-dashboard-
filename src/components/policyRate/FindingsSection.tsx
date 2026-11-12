// Section 10: "What the data shows". Plain facts from the figures above, each with its period and source (src/lib/policyRate/findings.ts).
// Nothing here says why the Monetary Policy Committee acted or what will happen next. Server component.

import { Callout } from "@/components/analytics/ChartFrame";
import { LeadMore } from "@/components/shell/Disclosure";
import { buildFindings } from "@/lib/policyRate/findings";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

export default function FindingsSection({ model }: { model: PolicyRateViewModel }) {
  const findings = buildFindings(model);
  if (findings.length === 0) {
    return <Callout tone="limit" title="No findings can be stated right now">They are computed from the policy-rate history, which could not be loaded.</Callout>;
  }
  return (
    <ul className="flex flex-col divide-y divide-pe-border rounded-[var(--pe-radius)] border border-pe-border">
      {findings.map((f) => (
        <li key={f.id} className="px-4 py-3">
          <LeadMore leadClassName="text-[14px] leading-relaxed text-pe-text">{f.text}</LeadMore>
          <p className="mt-1 font-mono text-[11px] text-pe-text-3">
            {f.period} · {f.source}
          </p>
        </li>
      ))}
    </ul>
  );
}
