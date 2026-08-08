"use client";

// The Decision Support Lab's gateway (Phase 5.5 brief Part 1/2) — replaces
// EconomicIdentityPanel.tsx/EconomicIdentityGuestPrompt.tsx entirely.
// Modular, collapsible sections (native <details>, same pattern as
// InflationRateField's "Advanced Options"), each independently editable,
// live-saving (no Save button — same convention as the panel this
// replaces), each with its own completion badge plus an overall one.
// Every field writes straight to the Unified Economic Profile —
// setEconomicProfile() is the only mutation path, consistent with the
// "single source of truth" rule this whole phase is built around.
import { useState } from "react";
import Link from "next/link";
import { useEconomicProfile, setEconomicProfile, DEFAULT_ECONOMIC_PROFILE, type FilerStatus, type Province, type IncomeType, type HousingStatus, type RiskTolerance } from "@/lib/decisionSupportLab/economicProfile";
import { getOverallCompletionPct, getSectionOutcome, type ProfileSectionId } from "@/lib/decisionSupportLab/profileCompletion";
import { getAffectedTools } from "@/lib/decisionSupportLab/toolFieldRegistry";
import CityCombobox from "@/components/decisionSupportLab/CityCombobox";
import type { PakistanCity } from "@/data/pakistanCities";
import type { EconomicProfile } from "@/lib/supabase/economicProfile";

function numberField(value: number): string {
  return value === 0 ? "" : String(value);
}

/** Section B2: every field gets this, not just three — a quiet "affects N tools" micro-label that expands (hover or tap) into the actual tool names as links, instead of a static count nobody can act on. */
function AffectsHint({ field }: { field: keyof EconomicProfile }) {
  const [open, setOpen] = useState(false);
  const affected = getAffectedTools(field);
  if (affected.length === 0) return null;
  return (
    <span className="relative ml-1.5 inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-[11px] text-white/30 underline decoration-dotted underline-offset-2 hover:text-neon-blue light:text-slate-400"
      >
        affects {affected.length} tool{affected.length === 1 ? "" : "s"}
      </button>
      {open && (
        <span className="glass-card absolute left-0 top-full z-20 mt-1 flex w-52 flex-col gap-1 rounded-lg border border-[var(--border-subtle)] p-2 text-left normal-case shadow-xl">
          {affected.map((tool) => (
            <Link key={tool.toolId} href={`/decision-support-lab/${tool.toolId}`} className="rounded px-1.5 py-1 text-xs text-white/70 hover:bg-white/5 hover:text-neon-blue light:text-slate-600">
              {tool.toolName}
            </Link>
          ))}
        </span>
      )}
    </span>
  );
}

/** Section B1: outcome framing instead of a bare percentage — a green check when done, otherwise what finishing the section actually unlocks. */
function SectionBadge({ sectionId, profile }: { sectionId: ProfileSectionId; profile: EconomicProfile }) {
  const outcome = getSectionOutcome(sectionId, profile);
  if (outcome.complete) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
        <span aria-hidden="true">✓</span> Done
      </span>
    );
  }
  if (outcome.unlocksToolCount === 0) return null;
  return (
    <span className="text-xs text-amber-300/80">
      Unlocks {outcome.unlocksToolCount} more tool{outcome.unlocksToolCount === 1 ? "" : "s"}
    </span>
  );
}

interface NumberInputProps {
  id: string;
  label: string;
  field: keyof EconomicProfile;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  placeholder?: string;
}

function NumberInput({ id, label, field, value, onChange, prefix, suffix, step = 1, placeholder = "0" }: NumberInputProps) {
  return (
    <div>
      <label htmlFor={id} className="text-label text-white/40 light:text-slate-400">
        {label}
        <AffectsHint field={field} />
      </label>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
        {prefix && <span className="text-sm text-white/40 light:text-slate-400">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={numberField(value)}
          placeholder={placeholder}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            onChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
          }}
          className="text-mono-num w-full bg-transparent text-sm tabular-nums text-white outline-none light:text-slate-900"
        />
        {suffix && <span className="text-sm text-white/40 light:text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

interface Section {
  id: ProfileSectionId;
  title: string;
  content: React.ReactNode;
}

export default function EconomicProfileOnboarding() {
  const { profile } = useEconomicProfile();
  const overallPct = getOverallCompletionPct(profile);
  const [provinceAutoFilled, setProvinceAutoFilled] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  // null = no explicit user choice yet this session — derive from real data
  // (so an async profile sync resolving after mount isn't fought); once the
  // user toggles it, their choice sticks regardless of the field's value.
  const [salaryOverride, setSalaryOverride] = useState<boolean | null>(null);
  const salarySameAsIncome = salaryOverride ?? profile.currentSalary === 0;

  const sections: Section[] = [
    {
      id: "personal",
      title: "Personal",
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ep-city" className="text-label text-white/40 light:text-slate-400">
              City
            </label>
            <CityCombobox
              id="ep-city"
              value={profile.city}
              onChange={(v) => setEconomicProfile({ city: v })}
              onSelectCity={(city: PakistanCity) => {
                setEconomicProfile({ city: city.name, province: city.province ?? profile.province });
                setProvinceAutoFilled(city.province !== null);
              }}
              placeholder="Enter your city"
            />
          </div>
          <div>
            <label htmlFor="ep-province" className="text-label text-white/40 light:text-slate-400">
              Province
              <AffectsHint field="province" />
            </label>
            <select
              id="ep-province"
              value={profile.province ?? ""}
              onChange={(e) => {
                setEconomicProfile({ province: (e.target.value || null) as Province | null });
                setProvinceAutoFilled(false);
              }}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
            >
              <option value="">Select province</option>
              <option value="punjab">Punjab</option>
              <option value="sindh">Sindh</option>
              <option value="kp">Khyber Pakhtunkhwa</option>
              <option value="balochistan">Balochistan</option>
            </select>
            {provinceAutoFilled && (
              <p className="mt-1 text-[11px] text-white/40 light:text-slate-400">
                Province set from city —{" "}
                <button type="button" onClick={() => setProvinceAutoFilled(false)} className="underline decoration-dotted underline-offset-2 hover:text-neon-blue">
                  change
                </button>
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ep-filer" className="text-label text-white/40 light:text-slate-400">
              Filer Status
              <AffectsHint field="filerStatus" />
            </label>
            <select
              id="ep-filer"
              value={profile.filerStatus}
              onChange={(e) => setEconomicProfile({ filerStatus: e.target.value as FilerStatus })}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
            >
              <option value="unknown">Prefer not to say</option>
              <option value="filer">Filer</option>
              <option value="non-filer">Non-filer</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: "income",
      title: "Income",
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberInput id="ep-income" label="Monthly Income" field="monthlyIncome" value={profile.monthlyIncome} onChange={(v) => setEconomicProfile({ monthlyIncome: v })} prefix="Rs" step={1000} placeholder="Enter monthly income" />
          <div>
            <label htmlFor="ep-income-type" className="text-label text-white/40 light:text-slate-400">
              Income Type
              <AffectsHint field="incomeType" />
            </label>
            <select
              id="ep-income-type"
              value={profile.incomeType ?? ""}
              onChange={(e) => setEconomicProfile({ incomeType: (e.target.value || null) as IncomeType | null })}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
            >
              <option value="">Select income type</option>
              <option value="salaried">Salaried</option>
              <option value="business">Business</option>
              <option value="freelance">Freelance</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="flex w-fit items-center gap-2 text-sm text-white/70 light:text-slate-600">
              <input
                type="checkbox"
                checked={salarySameAsIncome}
                onChange={(e) => {
                  setSalaryOverride(e.target.checked);
                  if (e.target.checked) setEconomicProfile({ currentSalary: 0 });
                }}
                className="h-3.5 w-3.5 rounded border-[var(--border-subtle)] accent-neon-blue"
              />
              Salary is the same as my monthly income
            </label>
          </div>
          {!salarySameAsIncome && (
            <NumberInput id="ep-salary" label="Current Salary" field="currentSalary" value={profile.currentSalary} onChange={(v) => setEconomicProfile({ currentSalary: v })} prefix="Rs" step={1000} placeholder="Enter current salary" />
          )}
          <NumberInput id="ep-last-raise" label="Last Raise" field="lastRaisePct" value={profile.lastRaisePct} onChange={(v) => setEconomicProfile({ lastRaisePct: v })} suffix="%" step={0.5} placeholder="Enter percentage" />
          <NumberInput id="ep-expected-raise" label="Expected Annual Raise" field="expectedAnnualRaisePct" value={profile.expectedAnnualRaisePct} onChange={(v) => setEconomicProfile({ expectedAnnualRaisePct: v })} suffix="%" step={0.5} placeholder="Enter percentage" />
        </div>
      ),
    },
    {
      id: "household",
      title: "Household",
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberInput id="ep-household-size" label="Household Size" field="householdSize" value={profile.householdSize} onChange={(v) => setEconomicProfile({ householdSize: Math.max(1, v) })} step={1} placeholder="1" />
          <NumberInput id="ep-spending" label="Monthly Spending" field="monthlySpending" value={profile.monthlySpending} onChange={(v) => setEconomicProfile({ monthlySpending: v })} prefix="Rs" step={1000} placeholder="Enter monthly spending" />
        </div>
      ),
    },
    {
      id: "housing",
      title: "Housing",
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-housing-status" className="text-label text-white/40 light:text-slate-400">
              Housing Status
              <AffectsHint field="housingStatus" />
            </label>
            <select
              id="ep-housing-status"
              value={profile.housingStatus ?? ""}
              onChange={(e) => setEconomicProfile({ housingStatus: (e.target.value || null) as HousingStatus | null })}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
            >
              <option value="">Select housing status</option>
              <option value="own">Own</option>
              <option value="rent">Rent</option>
              <option value="family">Living with family</option>
            </select>
          </div>
          <NumberInput id="ep-housing-cost" label="Monthly Housing Cost" field="monthlyHousingCost" value={profile.monthlyHousingCost} onChange={(v) => setEconomicProfile({ monthlyHousingCost: v })} prefix="Rs" step={1000} placeholder="Enter rent or mortgage" />
        </div>
      ),
    },
    {
      id: "savings",
      title: "Savings",
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberInput id="ep-savings" label="Current Savings" field="currentSavings" value={profile.currentSavings} onChange={(v) => setEconomicProfile({ currentSavings: v })} prefix="Rs" step={1000} placeholder="Enter current savings" />
        </div>
      ),
    },
    {
      id: "debt",
      title: "Debt",
      content: (
        <div className="flex flex-col gap-4">
          <label className="flex w-fit items-center gap-2 text-sm text-white/70 light:text-slate-600">
            <input type="checkbox" checked={profile.hasDebt} onChange={(e) => setEconomicProfile({ hasDebt: e.target.checked })} className="h-3.5 w-3.5 rounded border-[var(--border-subtle)] accent-neon-blue" />
            I have outstanding debt
          </label>
          {profile.hasDebt && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberInput id="ep-debt-amount" label="Debt Amount" field="debtAmount" value={profile.debtAmount} onChange={(v) => setEconomicProfile({ debtAmount: v })} prefix="Rs" step={1000} placeholder="Enter debt amount" />
              <NumberInput id="ep-debt-rate" label="Debt Interest Rate" field="debtInterestRate" value={profile.debtInterestRate} onChange={(v) => setEconomicProfile({ debtInterestRate: v })} suffix="%" step={0.5} placeholder="Enter interest rate" />
            </div>
          )}
        </div>
      ),
    },
    {
      id: "investments",
      title: "Investments",
      content: (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberInput id="ep-investment-amount" label="Current Investment Amount" field="currentInvestmentAmount" value={profile.currentInvestmentAmount} onChange={(v) => setEconomicProfile({ currentInvestmentAmount: v })} prefix="Rs" step={1000} placeholder="Enter investment amount" />
            <div>
              <label htmlFor="ep-risk" className="text-label text-white/40 light:text-slate-400">
                Risk Tolerance
                <AffectsHint field="riskTolerance" />
              </label>
              <select
                id="ep-risk"
                value={profile.riskTolerance ?? ""}
                onChange={(e) => setEconomicProfile({ riskTolerance: (e.target.value || null) as RiskTolerance | null })}
                className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
              >
                <option value="">Select risk tolerance</option>
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
          </div>
          <label className="flex w-fit items-center gap-2 text-sm text-white/70 light:text-slate-600">
            <input
              type="checkbox"
              checked={profile.ownsInvestmentProperty}
              onChange={(e) => setEconomicProfile({ ownsInvestmentProperty: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-[var(--border-subtle)] accent-neon-blue"
            />
            I own investment property
          </label>
          {profile.ownsInvestmentProperty && (
            <NumberInput
              id="ep-property-value"
              label="Investment Property Value"
              field="investmentPropertyValue"
              value={profile.investmentPropertyValue}
              onChange={(v) => setEconomicProfile({ investmentPropertyValue: v })}
              prefix="Rs"
              step={10000}
              placeholder="Enter property value"
            />
          )}
          <p className="text-xs text-white/40 light:text-slate-400">Detailed asset allocation is set from the Asset Allocation Explorer and Portfolio Purchasing Power tools.</p>
        </div>
      ),
    },
    {
      id: "foreignIncome",
      title: "Foreign Income",
      content: (
        <div className="flex flex-col gap-4">
          <label className="flex w-fit items-center gap-2 text-sm text-white/70 light:text-slate-600">
            <input
              type="checkbox"
              checked={profile.hasForeignIncome}
              onChange={(e) => setEconomicProfile({ hasForeignIncome: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-[var(--border-subtle)] accent-neon-blue"
            />
            I receive foreign currency income
          </label>
          {profile.hasForeignIncome && (
            <NumberInput
              id="ep-foreign-income"
              label="Foreign Income Amount (PKR equivalent)"
              field="foreignIncomeAmount"
              value={profile.foreignIncomeAmount}
              onChange={(v) => setEconomicProfile({ foreignIncomeAmount: v })}
              prefix="Rs"
              step={1000}
              placeholder="Enter monthly amount"
            />
          )}
        </div>
      ),
    },
    {
      id: "goals",
      title: "Goals",
      content: (
        <p className="text-sm text-white/50 light:text-slate-500">
          {profile.goals.length === 0
            ? "No financial goals set yet — add one from the Financial Planning Intelligence tools (Emergency Fund, Wealth Accumulation, and more)."
            : `${profile.goals.length} goal${profile.goals.length === 1 ? "" : "s"} configured.`}
        </p>
      ),
    },
  ];

  function handleExport() {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "peic-economic-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    if (!resetArmed) {
      setResetArmed(true);
      window.setTimeout(() => setResetArmed(false), 4000);
      return;
    }
    setEconomicProfile(DEFAULT_ECONOMIC_PROFILE);
    setResetArmed(false);
  }

  return (
    <section className="glass-card rounded-xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white light:text-slate-900">Your Economic Profile</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/55 light:text-slate-500">Fill this in once — every tool in the Lab reads it automatically, so you never enter the same figure twice.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-1.5">
          <span className="text-mono-num text-sm font-semibold tabular-nums text-neon-blue">{overallPct}%</span>
          <span className="text-xs text-white/40 light:text-slate-400">complete</span>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10 light:bg-slate-200" role="progressbar" aria-valuenow={overallPct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
        <div className="h-full rounded-full bg-neon-blue transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${overallPct}%` }} />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {sections.map((section) => (
          <details key={section.id} className="group rounded-lg border border-[var(--border-subtle)] p-3 sm:p-4" open={section.id === "personal" || section.id === "income"}>
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <span className="text-sm font-semibold text-white light:text-slate-900">{section.title}</span>
              <div className="flex items-center gap-2">
                <SectionBadge sectionId={section.id} profile={profile} />
                <span aria-hidden="true" className="text-white/40 transition-transform group-open:rotate-90">
                  ›
                </span>
              </div>
            </summary>
            <div className="mt-4">{section.content}</div>
          </details>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[var(--border-subtle)] pt-4">
        <button type="button" onClick={handleExport} className="text-xs font-medium text-white/50 underline decoration-dotted underline-offset-2 hover:text-neon-blue light:text-slate-500">
          Export my profile (JSON)
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={`text-xs font-medium underline decoration-dotted underline-offset-2 ${resetArmed ? "text-rose-400 hover:text-rose-300" : "text-white/50 hover:text-rose-400 light:text-slate-500"}`}
        >
          {resetArmed ? "Click again to confirm reset" : "Reset profile"}
        </button>
      </div>
    </section>
  );
}
