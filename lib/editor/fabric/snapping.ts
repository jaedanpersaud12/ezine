import type { TBBox } from "fabric";
import type { SheetSpec, SnapLine } from "@/lib/editor/fabric/ZineCanvas";

// Smart guides: while dragging, a layer's edges and centre snap to the sheet (trim, bleed, safe
// area, page centres, fold) and to the other layers on the spread.
//
// Snapping is sticky. A guide catches an edge within `attach` and then holds it until the raw
// (pointer-driven) position is more than `release` away. Without that, a hand's 1 px wobble at
// the threshold — or between guides a few mm apart, like bleed and trim — flips the layer back
// and forth every frame.

type Targets = { x: number[]; y: number[] };

// Which edge of the box (0 = start, 1 = centre, 2 = end) is held to which guide.
export type AxisLock = { edge: 0 | 1 | 2; at: number };
export type SnapLock = { x: AxisLock | null; y: AxisLock | null };

export const NO_LOCK: SnapLock = { x: null, y: null };

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
  return { x: [...new Set(x)], y: [...new Set(y)] };
}

function snapAxis(
  edges: [number, number, number],
  targets: number[],
  lock: AxisLock | null,
  attach: number,
  release: number,
): { delta: number; lock: AxisLock | null } {
  if (lock && Math.abs(lock.at - edges[lock.edge]) <= release) {
    return { delta: lock.at - edges[lock.edge], lock };
  }
  let best: { delta: number; lock: AxisLock } | null = null;
  edges.forEach((e, i) => {
    for (const t of targets) {
      const d = t - e;
      if (Math.abs(d) <= attach && (!best || Math.abs(d) < Math.abs(best.delta))) {
        best = { delta: d, lock: { edge: i as 0 | 1 | 2, at: t } };
      }
    }
  });
  return best ?? { delta: 0, lock: null };
}

// `box` is the raw position the pointer asks for; returns how far to move it and the new lock.
export function snapBox(
  box: TBBox,
  targets: Targets,
  lock: SnapLock,
  attach: number,
  release: number,
): { dx: number; dy: number; lines: SnapLine[]; lock: SnapLock } {
  const x = snapAxis([box.left, box.left + box.width / 2, box.left + box.width], targets.x, lock.x, attach, release);
  const y = snapAxis([box.top, box.top + box.height / 2, box.top + box.height], targets.y, lock.y, attach, release);
  const lines: SnapLine[] = [];
  if (x.lock) lines.push({ axis: "x", at: x.lock.at });
  if (y.lock) lines.push({ axis: "y", at: y.lock.at });
  return { dx: x.delta, dy: y.delta, lines, lock: { x: x.lock, y: y.lock } };
}
