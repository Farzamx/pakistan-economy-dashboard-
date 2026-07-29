// PBS's official 12-group CPI basket taxonomy (Base 2015-16) — the single
// canonical source of group numbers/names shared by the PBS PDF sync
// (syncCpiFromPbs.ts), the cpi_category_breakdown storage layer
// (src/lib/data/cpiCategoryBreakdown.ts), and the Personal Inflation
// Calculator UI. See migration 0043 for why these 12 groups (not the
// calculator brief's ad hoc 14-category suggestion) are the ones used.
//
// PBS abbreviates group names inconsistently between report months (e.g.
// "Food & Non-alcoholic Bev." one month, potentially "Food & Non-Alcoholic
// Beverages" another) — the sync layer always writes the CANONICAL name
// below, keyed by group_no, rather than whatever string it happened to
// extract from that month's PDF, so `group_name` is stable for the UI to
// match against.
export interface CpiGroupMeta {
  groupNo: number;
  /** Canonical display name — stable across PBS's month-to-month abbreviation drift. */
  name: string;
  /** Stable identifier for UI state/URLs/localStorage — independent of display-name wording. */
  slug: string;
  /** Chart/UI accent color (distinct hues, colorblind-conscious ordering). */
  color: string;
}

export const CPI_GROUPS: CpiGroupMeta[] = [
  { groupNo: 1, name: "Food & Non-Alcoholic Beverages", slug: "food-non-alcoholic-beverages", color: "#4f8ef7" },
  { groupNo: 2, name: "Alcoholic Beverages & Tobacco", slug: "alcoholic-beverages-tobacco", color: "#9b6bd9" },
  { groupNo: 3, name: "Clothing & Footwear", slug: "clothing-footwear", color: "#f2994a" },
  { groupNo: 4, name: "Housing, Water, Electricity, Gas & Fuels", slug: "housing-utilities-fuel", color: "#eb5757" },
  { groupNo: 5, name: "Furnishing & Household Equipment Maintenance", slug: "furnishing-household", color: "#56ccc0" },
  { groupNo: 6, name: "Health", slug: "health", color: "#27ae60" },
  { groupNo: 7, name: "Transport", slug: "transport", color: "#f2c94c" },
  { groupNo: 8, name: "Communication", slug: "communication", color: "#2f80ed" },
  { groupNo: 9, name: "Recreation & Culture", slug: "recreation-culture", color: "#bb6bd9" },
  { groupNo: 10, name: "Education", slug: "education", color: "#219653" },
  { groupNo: 11, name: "Restaurants & Hotels", slug: "restaurants-hotels", color: "#e07a5f" },
  { groupNo: 12, name: "Miscellaneous", slug: "miscellaneous", color: "#828282" },
];

export const CPI_GROUP_BY_NO: ReadonlyMap<number, CpiGroupMeta> = new Map(CPI_GROUPS.map((g) => [g.groupNo, g]));

export function canonicalGroupName(groupNo: number): string {
  return CPI_GROUP_BY_NO.get(groupNo)?.name ?? `Group ${groupNo}`;
}
