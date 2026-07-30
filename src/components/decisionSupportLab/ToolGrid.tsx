import { T } from "@/components/T";
import ToolCard from "@/components/decisionSupportLab/ToolCard";
import { DECISION_SUPPORT_TOOLS, TOOL_CATEGORIES } from "@/lib/decisionSupportLab/tools";

interface Props {
  isAuthenticated: boolean;
}

export default function ToolGrid({ isAuthenticated }: Props) {
  return (
    <div className="flex flex-col gap-10">
      {TOOL_CATEGORIES.map((category) => {
        const tools = DECISION_SUPPORT_TOOLS.filter((t) => t.category === category.id);
        if (tools.length === 0) return null;
        return (
          <section key={category.id}>
            <h2 className="text-headline text-white light:text-slate-900">
              <T tKey={category.titleKey} />
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-white/55 light:text-slate-500">
              <T tKey={category.subtitleKey} />
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} isAuthenticated={isAuthenticated} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
