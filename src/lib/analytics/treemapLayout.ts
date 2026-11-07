// Squarified treemap layout (Bruls, Huizing & van Wijk, 2000).
//
// Each item's rectangle has an AREA proportional to its value. Used for the CPI
// basket: a group's area is its fixed 2015-16 basket WEIGHT — never an
// inflation rate or a contribution. Pure so the geometry can be tested: areas
// proportional, nothing overlapping, nothing outside the bounds.

export interface TreemapItem {
  id: string;
  /** Must be > 0; items with a non-positive value are dropped (they would have no area). */
  value: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TreemapCell extends Rect {
  id: string;
  value: number;
}

/** Worst aspect ratio (>= 1) of the row if laid along a side of length `side`. */
function worst(rowAreas: readonly number[], side: number): number {
  const sum = rowAreas.reduce((s, a) => s + a, 0);
  const max = Math.max(...rowAreas);
  const min = Math.min(...rowAreas);
  const s2 = side * side;
  return Math.max((s2 * max) / (sum * sum), (sum * sum) / (s2 * min));
}

export function squarify(items: readonly TreemapItem[], bounds: Rect): TreemapCell[] {
  const live = items.filter((i) => i.value > 0 && Number.isFinite(i.value)).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  if (live.length === 0 || bounds.w <= 0 || bounds.h <= 0) return [];
  const total = live.reduce((s, i) => s + i.value, 0);
  const scale = (bounds.w * bounds.h) / total;
  const areas = live.map((i) => i.value * scale);

  const out: TreemapCell[] = [];
  let { x, y, w, h } = bounds;
  let i = 0;
  while (i < live.length) {
    const side = Math.min(w, h);
    let end = i + 1;
    while (end < live.length && worst(areas.slice(i, end + 1), side) <= worst(areas.slice(i, end), side)) end++;
    const row = areas.slice(i, end);
    const rowSum = row.reduce((s, a) => s + a, 0);
    if (w >= h) {
      // Lay the row as a column on the left.
      const colW = rowSum / h;
      let cy = y;
      row.forEach((a, k) => {
        const ch = a / colW;
        out.push({ id: live[i + k].id, value: live[i + k].value, x, y: cy, w: colW, h: ch });
        cy += ch;
      });
      x += colW;
      w -= colW;
    } else {
      // Lay the row along the top.
      const rowH = rowSum / w;
      let cx = x;
      row.forEach((a, k) => {
        const cw = a / rowH;
        out.push({ id: live[i + k].id, value: live[i + k].value, x: cx, y, w: cw, h: rowH });
        cx += cw;
      });
      y += rowH;
      h -= rowH;
    }
    i = end;
  }
  return out;
}
