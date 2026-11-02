// Stacking math for a book cloned from leaf.glb.
// Contract: ~/Projects/zine-assets/leaf-kit/README.md. Blender can't know the leaf
// count, so each leaf's height on the right and left stacks is worked out here.

export type LeafKind = "page" | "cover";

// Leaf thickness in leaf.glb units; the leaf is scaled (w, w, h), so real thickness is this × w.
const UNIT_THICKNESS: Record<LeafKind, number> = { page: 0.0015, cover: 0.004 };

// Extra gap between leaves so neighbouring faces don't z-fight.
const Z_FIGHT_GAP = 0.00004;

export function leafKind(index: number, leafCount: number): LeafKind {
  return index === 0 || index === leafCount - 1 ? "cover" : "page";
}

export function smoothstep(p: number): number {
  return p * p * (3 - 2 * p);
}

export type Stack = {
  thickness: number[];
  right: number[];
  left: number[];
};

// Leaf i rests at right[i] before it's turned and left[i] after, measured from the book's base.
// `maxThicknessM` squeezes a thick book's leaves so the whole block is no deeper than that.
export function buildStack(leafCount: number, widthM: number, maxThicknessM?: number): Stack {
  const paper = Array.from({ length: leafCount }, (_, i) => UNIT_THICKNESS[leafKind(i, leafCount)] * widthM);
  const total = paper.reduce((sum, t) => sum + t, 0);
  // The z-fight gaps count towards the cap too.
  const room = maxThicknessM === undefined ? Infinity : Math.max(0, maxThicknessM - Z_FIGHT_GAP * leafCount);
  const squeeze = total > room ? room / total : 1;
  const thickness = paper.map((t) => t * squeeze + Z_FIGHT_GAP);

  const right: number[] = new Array<number>(leafCount);
  let below = 0;
  for (let i = leafCount - 1; i >= 0; i--) {
    right[i] = below + thickness[i] / 2;
    below += thickness[i];
  }

  const left: number[] = new Array<number>(leafCount);
  below = 0;
  for (let i = 0; i < leafCount; i++) {
    left[i] = below + thickness[i] / 2;
    below += thickness[i];
  }

  return { thickness, right, left };
}

// Lifts that raise the right and left stacks so both tops sit level, for a book read flat
// open. 0 and 0 means each stack rests on the base.
export type StackLift = { right: number; left: number };

export const NO_LIFT: StackLift = { right: 0, left: 0 };

// How far to raise each stack so the open spread's two pages sit at the same height. Without
// it a thick book's right-hand page stands a whole block above the left, and a picture across
// the gutter breaks apart. Leaves mid-turn count towards each side by how far they've gone.
export function levelLift(stack: Stack, progress: readonly number[]): StackLift {
  let right = 0;
  let left = 0;
  progress.forEach((p, i) => {
    const t = smoothstep(p);
    right += stack.thickness[i] * (1 - t);
    left += stack.thickness[i] * t;
  });
  const top = Math.max(right, left);
  return { right: top - right, left: top - left };
}

export function leafHeight(stack: Stack, index: number, progress: number, lift: StackLift = NO_LIFT): number {
  const t = smoothstep(progress);
  const right = stack.right[index] + lift.right;
  const left = stack.left[index] + lift.left;
  return right + (left - right) * t;
}

// Sides are 1-based: leaf i carries recto 2i+1 and verso 2i+2.
export function spreadLabel(opened: number, leafCount: number): string {
  if (opened === 0) return "Front cover";
  if (opened === leafCount) return "Back cover";
  return `Pages ${opened * 2}–${opened * 2 + 1}`;
}
