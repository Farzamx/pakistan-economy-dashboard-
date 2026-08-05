import { T } from "@/components/T";

export default function InvestmentGrowthExplorerHero() {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <span className="text-label text-neon-blue">
        <T tKey="investmentGrowthExplorer.eyebrow" />
      </span>
      <h1 className="text-display text-white light:text-slate-900">
        <T tKey="investmentGrowthExplorer.title" />
      </h1>
      <p className="max-w-2xl text-base leading-relaxed text-white/60 light:text-slate-500">
        <T tKey="investmentGrowthExplorer.subtitle" />
      </p>
    </div>
  );
}
