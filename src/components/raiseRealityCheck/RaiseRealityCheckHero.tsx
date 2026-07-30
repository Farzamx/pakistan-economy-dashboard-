import { T } from "@/components/T";

export default function RaiseRealityCheckHero() {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <span className="text-label text-neon-blue">
        <T tKey="raiseRealityCheck.eyebrow" />
      </span>
      <h1 className="text-display text-white light:text-slate-900">
        <T tKey="raiseRealityCheck.title" />
      </h1>
      <p className="max-w-2xl text-base leading-relaxed text-white/60 light:text-slate-500">
        <T tKey="raiseRealityCheck.subtitle" />
      </p>
      <a
        href="#calculator-input"
        className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg bg-neon-blue px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
      >
        <T tKey="raiseRealityCheck.cta" />
        <span aria-hidden="true">↓</span>
      </a>
    </div>
  );
}
