// Pakistan indicator tiles for the homepage (PEIC redesign Phase 3).
// Server-compatible (no hooks).
//
// Every tile is built from a Kpi the overview page already fetched, plus
// that indicator's own freshness verdict from the project's existing engine.
// Nothing here recomputes a value, and a tile is never dropped for being
// stale: it renders with its real observation date and a visible stale
// badge, which is the honest state. Only a genuinely missing indicator
// (upstream returned nothing) is omitted, and the caller decides that by
// not passing a tile.

import Link from "next/link";
import type { Kpi } from "@/data/kpiData";
import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";
import { ChangeValue, FreshnessPill, SourceStamp } from "./valueDisplay";

export interface SnapshotTile {
  /** What the figure measures, in the page's own words. */
  label: string;
  kpi: Kpi;
  /** Existing indicator detail page. Empty when the page is not open to the public: the tile is then shown without a link. */
  href: string;
  /** Severity + label from the existing freshness verdict; omitted when the indicator has none. */
  freshness?: { severity: FreshnessResult["severity"]; label: string };
}

/** A tile is a link to its indicator page when that page is open to the public, otherwise plain content with the same layout. */
function Tile({ href, children }: { href: string; children: React.ReactNode }) {
  if (!href) return <div className="flex h-full flex-col gap-1 p-3">{children}</div>;
  return (
    <Link href={href} className="flex h-full flex-col gap-1 p-3 hover:bg-pe-surface-2">
      {children}
    </Link>
  );
}

export default function PakistanSnapshot({ tiles }: { tiles: SnapshotTile[] }) {
  if (tiles.length === 0) {
    return <p className="px-4 py-3 text-[13px] text-pe-text-3">Indicator data is unavailable right now.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-px bg-pe-border sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map(({ label, kpi, href, freshness }) => (
        <li key={label} className="bg-pe-surface">
          <Tile href={href}>
            <span className="flex items-start justify-between gap-2">
              <span className="text-[12px] font-medium text-pe-text-2">{label}</span>
              {freshness && freshness.severity !== "healthy" && (
                <FreshnessPill severity={freshness.severity} label={freshness.label} />
              )}
            </span>
            <span className="flex items-baseline gap-1">
              <span className="text-[22px] font-semibold leading-none tabular-nums text-pe-text">{kpi.value}</span>
              {kpi.unit && <span className="text-[13px] text-pe-text-2">{kpi.unit}</span>}
            </span>
            <ChangeValue change={kpi.change} className="text-[12px]" />
            <SourceStamp kpi={kpi} className="mt-auto pt-1" />
          </Tile>
        </li>
      ))}
    </ul>
  );
}
