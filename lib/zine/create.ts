import { DEFAULT_FONT_ID } from "@/lib/zine/fonts";
import { DEFAULT_INK, DEFAULT_PAPER } from "@/lib/zine/palettes";
import {
  SCHEMA_VERSION,
  type DrawLayer,
  type ImageLayer,
  type Layer,
  type ShapeLayer,
  type Spread,
  type TextLayer,
  type Zine,
} from "@/lib/zine/schema";
import { TRIMS } from "@/lib/book/trim";

export function newId(): string {
  return crypto.randomUUID();
}

export function newSpread(): Spread {
  return { id: newId(), background: null, layers: [] };
}

// Saddle stitch: 2 leaves = 4 pages per folded sheet, so the leaf count stays even.
export function newZine(leaves = 8): Zine {
  const a5 = TRIMS.a5;
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    title: "Untitled zine",
    trim: { presetId: a5.id, widthMm: a5.widthMm, heightMm: a5.heightMm },
    binding: "saddle",
    bleedMm: 3,
    safeMm: 5,
    paper: { color: DEFAULT_PAPER },
    spreads: Array.from({ length: leaves + 1 }, newSpread),
    assets: {},
    updatedAt: new Date().toISOString(),
  };
}

const base = {
  rotation: 0,
  opacity: 1,
  blend: "normal",
  flipX: false,
  flipY: false,
  locked: false,
  hidden: false,
} as const;

type At = { x: number; y: number };

export function newTextLayer(at: At, text = "Say something"): TextLayer {
  return {
    ...base,
    id: newId(),
    name: text.slice(0, 24),
    kind: "text",
    x: at.x,
    y: at.y,
    width: 80,
    height: 12,
    text,
    fontFamily: DEFAULT_FONT_ID,
    fontSizePt: 28,
    fontWeight: 700,
    italic: false,
    lineHeight: 1.1,
    letterSpacing: 0,
    align: "left",
    color: DEFAULT_INK,
  };
}

export function newShapeLayer(shape: ShapeLayer["shape"], at: At, width: number, height: number): ShapeLayer {
  const names: Record<ShapeLayer["shape"], string> = {
    rect: "Rectangle",
    ellipse: "Ellipse",
    triangle: "Triangle",
    line: "Line",
  };
  const isLine = shape === "line";
  return {
    ...base,
    id: newId(),
    name: names[shape],
    kind: "shape",
    shape,
    x: at.x,
    y: at.y,
    width: Math.max(width, 1),
    height: isLine ? 1 : Math.max(height, 1),
    fill: isLine ? null : DEFAULT_INK,
    stroke: isLine ? DEFAULT_INK : null,
    strokeWidthMm: isLine ? 1 : 0.5,
    cornerRadiusMm: 0,
  };
}

export function newImageLayer(
  assetId: string,
  name: string,
  srcWidthPx: number,
  srcHeightPx: number,
  at: At,
  width: number,
): ImageLayer {
  return {
    ...base,
    id: newId(),
    name,
    kind: "image",
    assetId,
    x: at.x,
    y: at.y,
    width,
    height: (width * srcHeightPx) / srcWidthPx,
    srcWidthPx,
    srcHeightPx,
    filters: { grayscale: false, brightness: 0, contrast: 0, tint: null, invert: false },
  };
}

export function newDrawLayer(
  path: DrawLayer["path"],
  at: At,
  naturalWidth: number,
  naturalHeight: number,
  stroke: string,
  strokeWidthMm: number,
): DrawLayer {
  return {
    ...base,
    id: newId(),
    name: "Drawing",
    kind: "draw",
    x: at.x,
    y: at.y,
    width: naturalWidth,
    height: naturalHeight,
    path,
    naturalWidth,
    naturalHeight,
    stroke,
    strokeWidthMm,
  };
}

export function cloneLayer<T extends Layer>(layer: T, offsetMm = 4): T {
  return { ...structuredClone(layer), id: newId(), x: layer.x + offsetMm, y: layer.y + offsetMm };
}
