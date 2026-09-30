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
export function buildStack(leafCount: number, widthM: number): Stack {
  const thickness = Array.from(
    { length: leafCount },
    (_, i) => UNIT_THICKNESS[leafKind(i, leafCount)] * widthM + Z_FIGHT_GAP,
  );

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

export function leafHeight(stack: Stack, index: number, progress: number): number {
  const t = smoothstep(progress);
  return stack.right[index] + (stack.left[index] - stack.right[index]) * t;
}

// Sides are 1-based: leaf i carries recto 2i+1 and verso 2i+2.
export function spreadLabel(opened: number, leafCount: number): string {
  if (opened === 0) return "Front cover";
  if (opened === leafCount) return "Back cover";
  return `Pages ${opened * 2}–${opened * 2 + 1}`;
}
