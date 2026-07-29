import { T } from "@/components/T";

export default function DecisionSupportHero() {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <span className="text-label text-neon-blue">
        <T tKey="decisionSupportLab.eyebrow" />
      </span>
      <h1 className="text-display max-w-3xl text-white light:text-slate-900">
        <T tKey="decisionSupportLab.title" />
      </h1>
      <p className="max-w-2xl text-base leading-relaxed text-white/60 light:text-slate-500">
        <T tKey="decisionSupportLab.subtitle" />
      </p>

      <div className="section-divider mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-xs font-medium text-white/40 light:text-slate-400">
        <span>
          <T tKey="decisionSupportLab.trustSources" />
        </span>
        <span className="text-white/20 light:text-slate-300">·</span>
        <span>
          <T tKey="decisionSupportLab.trustMethodology" />
        </span>
        <span className="text-white/20 light:text-slate-300">·</span>
        <span>SBP · PBS · World Bank · IMF</span>
      </div>
    </div>
  );
}
