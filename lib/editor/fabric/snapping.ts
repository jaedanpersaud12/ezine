import type { TBBox } from "fabric";
import type { SheetSpec, SnapLine } from "@/lib/editor/fabric/ZineCanvas";

// Smart guides: while dragging, a layer's edges and centre snap to the sheet (trim, bleed, safe
// area, page centres, fold) and to the other layers on the spread.

type Targets = { x: number[]; y: number[] };

export function snapTargets(sheet: SheetSpec, others: TBBox[]): Targets {
  const { widthMm: w, heightMm: h, bleedMm: b, safeMm: s, pages } = sheet;
  const pageW = w / pages;
  const x = [-b, 0, w, w + b, w / 2];
  for (let p = 0; p < pages; p++) x.push(p * pageW + s, (p + 1) * pageW - s, p * pageW + pageW / 2);
  const y = [-b, 0, h, h + b, h / 2, s, h - s];
  for (const o of others) {
    x.push(o.left, o.left + o.width / 2, o.left + o.width);
    y.push(o.top, o.top + o.height / 2, o.top + o.height);
  }
  return { x, y };
}

function nearest(edges: number[], targets: number[], threshold: number): { delta: number; at: number } | null {
  let best: { delta: number; at: number } | null = null;
  for (const e of edges) {
    for (const t of targets) {
      const d = t - e;
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, at: t };
    }
  }
  return best;
}

export function snapBox(box: TBBox, targets: Targets, threshold: number): { dx: number; dy: number; lines: SnapLine[] } {
  const sx = nearest([box.left, box.left + box.width / 2, box.left + box.width], targets.x, threshold);
  const sy = nearest([box.top, box.top + box.height / 2, box.top + box.height], targets.y, threshold);
  const lines: SnapLine[] = [];
  if (sx) lines.push({ axis: "x", at: sx.at });
  if (sy) lines.push({ axis: "y", at: sy.at });
  return { dx: sx?.delta ?? 0, dy: sy?.delta ?? 0, lines };
}
