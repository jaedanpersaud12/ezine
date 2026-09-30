import type { TBBox } from "fabric";
import type { SheetSpec, SnapLine } from "@/lib/editor/fabric/ZineCanvas";

// Smart guides. Per axis, exactly one thing owns a dragged layer's position each frame: the cursor
// or a guide. A guide takes over when a matching part of the layer comes within `attach` and keeps
// the axis until the raw, cursor-driven position is more than `release` away; then the cursor owns
// it again. Nothing else (speed, history) decides, so the same pointer path always lands the same.
//
// Edges only meet edge lines (trim, bleed, safe, fold, other layers' edges) and centres only meet
// centre lines (page and spread centres, other layers' centres). Fewer, more meaningful guides mean
// fewer places for the cursor and a guide to trade the layer back and forth.

type AxisTargets = { edges: number[]; centres: number[] };
type Targets = { x: AxisTargets; y: AxisTargets };

// Which part of the box is held (0 = start edge, 1 = centre, 2 = end edge) and to which line.
export type AxisLock = { part: 0 | 1 | 2; at: number };
export type SnapLock = { x: AxisLock | null; y: AxisLock | null };

export const NO_LOCK: SnapLock = { x: null, y: null };

const unique = (values: number[]): number[] => [...new Set(values.map((v) => Math.round(v * 1000) / 1000))];

export function snapTargets(sheet: SheetSpec, others: TBBox[]): Targets {
  const { widthMm: w, heightMm: h, bleedMm: b, safeMm: s, pages } = sheet;
  const pageW = w / pages;
  const xEdges = [-b, 0, w, w + b];
  const xCentres = [w / 2];
  for (let p = 0; p < pages; p++) {
    xEdges.push(p * pageW + s, (p + 1) * pageW - s);
    xCentres.push(p * pageW + pageW / 2);
  }
  if (pages === 2) xEdges.push(pageW); // the fold
  const yEdges = [-b, 0, h, h + b, s, h - s];
  const yCentres = [h / 2];
  for (const o of others) {
    xEdges.push(o.left, o.left + o.width);
    xCentres.push(o.left + o.width / 2);
    yEdges.push(o.top, o.top + o.height);
    yCentres.push(o.top + o.height / 2);
  }
  return {
    x: { edges: unique(xEdges), centres: unique(xCentres) },
    y: { edges: unique(yEdges), centres: unique(yCentres) },
  };
}

function snapAxis(
  parts: [number, number, number],
  targets: AxisTargets,
  lock: AxisLock | null,
  attach: number,
  release: number,
): { delta: number; lock: AxisLock | null } {
  // The current owner keeps the axis until the cursor has clearly left.
  if (lock && Math.abs(lock.at - parts[lock.part]) <= release) {
    return { delta: lock.at - parts[lock.part], lock };
  }
  let best: { delta: number; lock: AxisLock } | null = null;
  const consider = (part: 0 | 1 | 2, lines: number[]): void => {
    for (const at of lines) {
      const d = at - parts[part];
      if (Math.abs(d) <= attach && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, lock: { part, at } };
    }
  };
  consider(0, targets.edges);
  consider(2, targets.edges);
  consider(1, targets.centres);
  return best ?? { delta: 0, lock: null };
}

// `box` is where the cursor puts the layer; returns how far a guide moves it and who owns each axis.
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
