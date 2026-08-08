// A non-interactive, static replica of the real Decision Support Lab's
// "Your Economic Profile" form (src/components/decisionSupportLab/
// EconomicProfileOnboarding.tsx) — same section structure, same field
// names, same completion-badge convention, styled with the marketing
// page's own tokens for visual consistency with the rest of this page.
//
// Built as a replica rather than embedding the real component live: the
// real one writes every keystroke straight to the visitor's stored profile
// (localStorage/Supabase) with no read-only mode, so embedding it live and
// interactive on a public, pre-signup page would let anonymous visitors
// start mutating real profile state — the exact case the "faithful static
// replica" fallback in the brief calls for. All inputs below are disabled;
// nothing here reads or writes any storage.
// Sample values, not real user data — this whole component is aria-hidden
// and every input below is disabled, but an empty "—" placeholder in every
// field reads as broken rather than as a preview. Filling Personal/Income
// with a plausible profile (leaving Household/Savings blank) shows what the
// real form looks like mid-use without implying these are anyone's actual
// numbers — the "PREVIEW" pill on the heading makes that explicit too.
const SECTIONS = [
  {
    title: "Personal",
    open: true,
    fields: [
      { label: "City", value: "Lahore" },
      { label: "Province", value: "Punjab" },
      { label: "Filer Status", value: "Filer" },
    ],
  },
  {
    title: "Income",
    open: true,
    fields: [
      { label: "Monthly Income", value: "PKR 250,000" },
      { label: "Income Type", value: "Salaried" },
      { label: "Last Raise", value: "Jan 2025" },
    ],
  },
  {
    title: "Household",
    open: false,
    fields: [
      { label: "Household Size", value: "" },
      { label: "Monthly Spending", value: "" },
    ],
  },
  { title: "Savings", open: false, fields: [{ label: "Current Savings", value: "" }] },
];

export default function EconomicIdentityReplica() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border p-5 sm:p-6"
      style={{ borderColor: "var(--ink-raised)", background: "var(--ink-raised)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold" style={{ fontFamily: "var(--font-marketing-heading)", color: "var(--paper)" }}>
              Your Economic Profile
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
              style={{ fontFamily: "var(--font-marketing-data)", background: "var(--indigo)", color: "var(--paper)" }}
            >
              Preview
            </span>
          </div>
          <p className="mt-1 max-w-md text-[13px]" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}>
            Fill this in once — every tool in the Lab reads it automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border px-3 py-1.5" style={{ borderColor: "var(--muted)" }}>
          <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--indigo)" }}>
            40%
          </span>
          <span className="text-[11px]" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}>
            complete
          </span>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(232, 234, 242, 0.1)" }}>
        <div className="h-full rounded-full" style={{ width: "40%", background: "var(--indigo)" }} />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-lg border p-3.5" style={{ borderColor: "var(--ink-raised)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--paper)" }}>
                {section.title}
              </span>
              <span aria-hidden="true" style={{ color: "var(--muted)", transform: section.open ? "rotate(90deg)" : "none" }}>
                ›
              </span>
            </div>
            {section.open && (
              <div className="mt-3 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2">
                {section.fields.map((field) => (
                  <div key={field.label}>
                    <span className="text-[10px] uppercase tracking-[0.08em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
                      {field.label}
                    </span>
                    <div className="mt-1 rounded-md border px-2.5 py-2" style={{ borderColor: "var(--ink-raised)" }}>
                      <input
                        disabled
                        readOnly
                        tabIndex={-1}
                        value={field.value}
                        placeholder="—"
                        className="w-full bg-transparent text-[13px] outline-none"
                        style={{ fontFamily: "var(--font-marketing-body)", color: field.value ? "var(--paper)" : "var(--muted)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
