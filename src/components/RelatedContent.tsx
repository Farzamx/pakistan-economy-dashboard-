import ProtectedLink from "@/components/ProtectedLink";
import type { RelatedGroup } from "@/lib/relatedContent";

interface RelatedContentProps {
  groups: RelatedGroup[];
}

/**
 * Renders one or more labeled rows of pill-style links — same visual pattern
 * as the existing same-category "Related Comparisons"/"Related Budget
 * Categories" sections, reused here for cross-category links (indicators,
 * provincial pages, budget topics) computed by src/lib/relatedContent.ts.
 *
 * Uses ProtectedLink, not next/link's <Link>, directly — some generated
 * groups (e.g. provincial "Rankings & Tools"/"Browse by Province") link
 * into premium tool pages, and this component has no way to know in
 * advance which links in a given render will or won't, so every link gets
 * the same protected-aware wrapper rather than deciding per-link.
 */
export default function RelatedContent({ groups }: RelatedContentProps) {
  const visible = groups.filter((g) => g.links.length > 0);
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((group) => (
        <section key={group.heading} className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/35 light:text-slate-500">
            {group.heading}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.links.map((link) => (
              <ProtectedLink
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/10 light:border-slate-200 bg-white/[0.02] light:bg-white px-4 py-2 text-xs font-medium text-white/60 light:text-slate-600 transition-colors hover:border-neon-blue/40 hover:text-white light:hover:text-slate-900"
              >
                {link.label} →
              </ProtectedLink>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
