import { T } from "@/components/T";

export interface EducationalPanelProps {
  whatDoesThisMean: string;
  whyDifferent: string;
  howCalculated: string;
  sources: string[];
}

/**
 * The Lab's shared "learn more" block — every tool's result page renders
 * these same four questions (What does this mean? / Why is your result
 * different? / How is it calculated? / Official data sources) through
 * this one component, with only the four content strings varying per
 * tool. Kept as plain stacked sections (not a JS accordion) — matches the
 * FAQ pattern already used on Budget/Provincial Budget pages, and avoids
 * open/closed state for content meant to be read once, not browsed.
 */
export default function EducationalPanel({ whatDoesThisMean, whyDifferent, howCalculated, sources }: EducationalPanelProps) {
  return (
    <section className="glass-card flex flex-col gap-5 rounded-xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white light:text-slate-900">
        <T tKey="decisionSupportLab.educationTitle" />
      </h2>

      <div>
        <p className="text-sm font-semibold text-white/85 light:text-slate-800">
          <T tKey="decisionSupportLab.eduWhatQuestion" />
        </p>
        <p className="mt-1 text-sm leading-relaxed text-white/60 light:text-slate-500">{whatDoesThisMean}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-white/85 light:text-slate-800">
          <T tKey="decisionSupportLab.eduWhyQuestion" />
        </p>
        <p className="mt-1 text-sm leading-relaxed text-white/60 light:text-slate-500">{whyDifferent}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-white/85 light:text-slate-800">
          <T tKey="decisionSupportLab.eduHowQuestion" />
        </p>
        <p className="mt-1 text-sm leading-relaxed text-white/60 light:text-slate-500">{howCalculated}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-white/85 light:text-slate-800">
          <T tKey="decisionSupportLab.eduSourcesQuestion" />
        </p>
        <ul className="mt-1 list-inside list-disc text-sm leading-relaxed text-white/60 light:text-slate-500">
          {sources.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
