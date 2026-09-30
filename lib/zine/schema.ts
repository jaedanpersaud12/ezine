import { z } from "zod";

// The zine document: the one source of truth the editor, the 3D reader and (later) PDF export read.
// All geometry is in mm (ZB-1). Layers live on spreads, not pages, so art can run across the gutter.
//
// Spreads line up with the reader: spread 0 is the front cover (one page), spreads 1…N-1 are the
// facing pages [2k | 2k+1], and spread N is the back cover (one page). N = leaf count.

export const SCHEMA_VERSION = 1;

export const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-burn",
  "color-dodge",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const layerBase = {
  id: z.string(),
  name: z.string(),
  // Centre of the layer in spread mm, measured from the top-left trim corner.
  x: z.number(),
  y: z.number(),
  // Displayed size in mm, before rotation.
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  blend: z.enum(BLEND_MODES),
  flipX: z.boolean(),
  flipY: z.boolean(),
  locked: z.boolean(),
  hidden: z.boolean(),
};

export const imageFiltersSchema = z.object({
  grayscale: z.boolean(),
  brightness: z.number().min(-1).max(1),
  contrast: z.number().min(-1).max(1),
  // Riso-style ink tint: multiplies the image by one colour.
  tint: hex.nullable(),
  invert: z.boolean(),
});

export const imageLayerSchema = z.object({
  ...layerBase,
  kind: z.literal("image"),
  assetId: z.string(),
  // Source pixels, kept so effective dpi can be computed at any size.
  srcWidthPx: z.number().positive(),
  srcHeightPx: z.number().positive(),
  filters: imageFiltersSchema,
});

export const textLayerSchema = z.object({
  ...layerBase,
  kind: z.literal("text"),
  text: z.string(),
  fontFamily: z.string(),
  fontSizePt: z.number().positive(),
  fontWeight: z.number().int().min(100).max(900),
  italic: z.boolean(),
  lineHeight: z.number().positive(),
  // Thousandths of an em, as Fabric uses.
  letterSpacing: z.number(),
  align: z.enum(["left", "center", "right", "justify"]),
  color: hex,
});

export const shapeLayerSchema = z.object({
  ...layerBase,
  kind: z.literal("shape"),
  shape: z.enum(["rect", "ellipse", "triangle", "line"]),
  fill: hex.nullable(),
  stroke: hex.nullable(),
  strokeWidthMm: z.number().min(0),
  cornerRadiusMm: z.number().min(0),
});

export const drawLayerSchema = z.object({
  ...layerBase,
  kind: z.literal("draw"),
  // Fabric path commands in the coordinates they were drawn in.
  path: z.array(z.array(z.union([z.string(), z.number()]))),
  naturalWidth: z.number().positive(),
  naturalHeight: z.number().positive(),
  stroke: hex,
  strokeWidthMm: z.number().positive(),
});

export const layerSchema = z.discriminatedUnion("kind", [
  imageLayerSchema,
  textLayerSchema,
  shapeLayerSchema,
  drawLayerSchema,
]);

export const spreadSchema = z.object({
  id: z.string(),
  // null = bare paper.
  background: hex.nullable(),
  layers: z.array(layerSchema),
});

export const assetSchema = z.object({
  id: z.string(),
  kind: z.enum(["image", "font"]),
  name: z.string(),
  mime: z.string(),
  widthPx: z.number().optional(),
  heightPx: z.number().optional(),
  // Fonts only: the CSS family name it's registered under.
  family: z.string().optional(),
});

export const zineSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string(),
  title: z.string(),
  trim: z.object({
    presetId: z.string().nullable(),
    widthMm: z.number().min(40).max(420),
    heightMm: z.number().min(40).max(420),
  }),
  binding: z.literal("saddle"),
  bleedMm: z.number().min(0).max(10),
  safeMm: z.number().min(0).max(30),
  paper: z.object({ color: hex }),
  spreads: z.array(spreadSchema).min(3),
  assets: z.record(z.string(), assetSchema),
  updatedAt: z.string(),
});

export type BlendMode = (typeof BLEND_MODES)[number];
export type ImageFilters = z.infer<typeof imageFiltersSchema>;
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;
export type ShapeLayer = z.infer<typeof shapeLayerSchema>;
export type DrawLayer = z.infer<typeof drawLayerSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type LayerKind = Layer["kind"];
export type Spread = z.infer<typeof spreadSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type Zine = z.infer<typeof zineSchema>;

// ── Geometry ────────────────────────────────────────────────────────────────

export type SpreadRole = "front" | "inner" | "back";

export type SpreadGeometry = {
  role: SpreadRole;
  pages: number;
  widthMm: number;
  heightMm: number;
  // 1-based page numbers, left to right.
  sides: number[];
};

export function leafCount(zine: Zine): number {
  return zine.spreads.length - 1;
}

export function pageCount(zine: Zine): number {
  return leafCount(zine) * 2;
}

export function spreadGeometry(zine: Zine, index: number): SpreadGeometry {
  const last = zine.spreads.length - 1;
  const { widthMm, heightMm } = zine.trim;
  if (index === 0) return { role: "front", pages: 1, widthMm, heightMm, sides: [1] };
  if (index === last) return { role: "back", pages: 1, widthMm, heightMm, sides: [pageCount(zine)] };
  return { role: "inner", pages: 2, widthMm: widthMm * 2, heightMm, sides: [index * 2, index * 2 + 1] };
}

export function spreadLabel(zine: Zine, index: number): string {
  const g = spreadGeometry(zine, index);
  if (g.role === "front") return "Front cover";
  if (g.role === "back") return "Back cover";
  return `${g.sides[0]}–${g.sides[1]}`;
}

// Effective resolution of an image layer at its current printed size.
export function effectiveDpi(layer: ImageLayer): number {
  const inchesWide = layer.width / 25.4;
  const inchesHigh = layer.height / 25.4;
  return Math.min(layer.srcWidthPx / inchesWide, layer.srcHeightPx / inchesHigh);
}

export const LOW_DPI = 200;
