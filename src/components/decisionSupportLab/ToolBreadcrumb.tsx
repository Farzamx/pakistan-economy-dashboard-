// Section D1 — replaces the old bare "← Decision Support Lab" link on
// every tool page with "Decision Lab / Category / Tool"; the first
// segment keeps the "←" so it still reads as the persistent "back to
// lab" affordance, it's just no longer the ONLY wayfinding on the page.
import Link from "next/link";
import { T } from "@/components/T";
import { DECISION_SUPPORT_TOOLS, TOOL_CATEGORIES } from "@/lib/decisionSupportLab/tools";

interface Props {
  toolId: string;
}

export default function ToolBreadcrumb({ toolId }: Props) {
  const tool = DECISION_SUPPORT_TOOLS.find((t) => t.id === toolId);
  const category = tool ? TOOL_CATEGORIES.find((c) => c.id === tool.category) : undefined;

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-white/40 light:text-slate-400">
      <Link href="/decision-support-lab" className="hover:text-neon-blue">
        ← <T tKey="decisionSupportLab.title" />
      </Link>
      {category && (
        <>
          <span aria-hidden="true">/</span>
          <span>
            <T tKey={category.titleKey} />
          </span>
        </>
      )}
      {tool && (
        <>
          <span aria-hidden="true">/</span>
          <span className="text-white/70 light:text-slate-600">
            <T tKey={tool.titleKey} />
          </span>
        </>
      )}
    </nav>
  );
}
