import { T } from "@/components/T";
import ToolCard from "@/components/decisionSupportLab/ToolCard";
import { DECISION_SUPPORT_TOOLS } from "@/lib/decisionSupportLab/tools";

export default function ToolGrid() {
  return (
    <section>
      <h2 className="text-headline text-white light:text-slate-900">
        <T tKey="decisionSupportLab.toolsTitle" />
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-white/55 light:text-slate-500">
        <T tKey="decisionSupportLab.toolsSubtitle" />
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DECISION_SUPPORT_TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}
