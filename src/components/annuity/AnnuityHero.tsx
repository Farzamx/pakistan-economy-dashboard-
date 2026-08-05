import { T } from "@/components/T";

export default function AnnuityHero() {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <span className="text-label text-neon-blue">
        <T tKey="annuity.eyebrow" />
      </span>
      <h1 className="text-display text-white light:text-slate-900">
        <T tKey="annuity.title" />
      </h1>
      <p className="max-w-2xl text-base leading-relaxed text-white/60 light:text-slate-500">
        <T tKey="annuity.subtitle" />
      </p>
    </div>
  );
}
