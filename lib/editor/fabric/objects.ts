import {
  Ellipse,
  FabricImage,
  FabricText,
  type FabricObject,
  filters,
  Line,
  Path,
  Rect,
  Textbox,
  type TMat2D,
  Triangle,
  util,
} from "fabric";
import { assetUrl, ensureFont, resolveFontFamily } from "@/lib/editor/assets";
import { foliosOf, type FolioItem } from "@/lib/zine/folios";
import type { DrawLayer, ImageFilters, ImageLayer, Layer, ShapeLayer, TextLayer, Zine } from "@/lib/zine/schema";

// The bridge between document layers (mm) and Fabric objects. Fabric works directly in mm: the
// canvas viewport transform does the mm → px zoom, so nothing here knows about screen pixels.

export const PT_TO_MM = 25.4 / 72;

const ids = new WeakMap<FabricObject, string>();

export function layerIdOf(obj: FabricObject): string | undefined {
  return ids.get(obj);
}

function common(layer: Layer): Partial<FabricObject> {
  return {
    left: layer.x,
    top: layer.y,
    angle: layer.rotation,
    opacity: layer.opacity,
    globalCompositeOperation: layer.blend === "normal" ? "source-over" : layer.blend,
    flipX: layer.flipX,
    flipY: layer.flipY,
    visible: !layer.hidden,
    selectable: !layer.locked,
    evented: !layer.locked,
    // Fabric defaults to a 1-unit stroke, which here is a phantom 1 mm that inflates bounds.
    // Shapes and drawings set their real stroke after this.
    strokeWidth: 0,
  };
}

function shapeProps(layer: ShapeLayer): Record<string, unknown> {
  return {
    fill: layer.fill ?? "transparent",
    stroke: layer.stroke ?? undefined,
    strokeWidth: layer.stroke ? layer.strokeWidthMm : 0,
    strokeUniform: true,
    strokeLineCap: "round",
  };
}

function textProps(layer: TextLayer, zine: Zine): Record<string, unknown> {
  return {
    text: layer.text,
    width: layer.width,
    fontFamily: resolveFontFamily(zine, layer.fontFamily),
    fontSize: layer.fontSizePt * PT_TO_MM,
    fontWeight: layer.fontWeight,
    fontStyle: layer.italic ? "italic" : "normal",
    lineHeight: layer.lineHeight,
    charSpacing: layer.letterSpacing,
    textAlign: layer.align,
    fill: layer.color,
    scaleX: 1,
    scaleY: 1,
  };
}

function imageFilters(f: ImageFilters): InstanceType<(typeof filters)["BaseFilter"]>[] {
  const list: InstanceType<(typeof filters)["BaseFilter"]>[] = [];
  if (f.grayscale) list.push(new filters.Grayscale());
  if (f.brightness !== 0) list.push(new filters.Brightness({ brightness: f.brightness }));
  if (f.contrast !== 0) list.push(new filters.Contrast({ contrast: f.contrast }));
  if (f.invert) list.push(new filters.Invert());
  if (f.tint) list.push(new filters.BlendColor({ color: f.tint, mode: "multiply", alpha: 1 }));
  return list;
}

function sizeProps(obj: FabricObject, layer: Layer): Record<string, unknown> {
  switch (layer.kind) {
    case "image":
      return { scaleX: layer.width / obj.width, scaleY: layer.height / obj.height };
    case "draw":
      return {
        scaleX: layer.width / layer.naturalWidth,
        scaleY: layer.height / layer.naturalHeight,
        stroke: layer.stroke,
        strokeWidth: layer.strokeWidthMm,
      };
    case "shape":
      if (layer.shape === "ellipse") return { rx: layer.width / 2, ry: layer.height / 2, scaleX: 1, scaleY: 1 };
      if (layer.shape === "line") return { x1: -layer.width / 2, x2: layer.width / 2, y1: 0, y2: 0, scaleX: 1, scaleY: 1 };
      if (layer.shape === "rect")
        return { width: layer.width, height: layer.height, rx: layer.cornerRadiusMm, ry: layer.cornerRadiusMm, scaleX: 1, scaleY: 1 };
      return { width: layer.width, height: layer.height, scaleX: 1, scaleY: 1 };
    case "text":
      return {};
  }
}

async function build(layer: Layer, zine: Zine, waitForFonts: boolean): Promise<FabricObject | null> {
  switch (layer.kind) {
    case "text": {
      if (waitForFonts) await ensureFont(zine, layer.fontFamily, layer.fontWeight, layer.italic);
      return new Textbox(layer.text, { ...textProps(layer, zine), minWidth: 2, splitByGrapheme: false });
    }
    case "shape": {
      if (layer.shape === "rect") return new Rect();
      if (layer.shape === "ellipse") return new Ellipse();
      if (layer.shape === "triangle") return new Triangle();
      return new Line([-layer.width / 2, 0, layer.width / 2, 0], { lockScalingY: true });
    }
    case "image": {
      const asset = zine.assets[layer.assetId];
      const url = asset ? await assetUrl(asset) : null;
      if (!url) return new Rect({ fill: "transparent", stroke: "red", strokeWidth: 0.3, width: layer.width, height: layer.height });
      const img = await FabricImage.fromURL(url);
      img.filters = imageFilters(layer.filters);
      img.applyFilters();
      return img;
    }
    case "draw":
      return new Path(layer.path as ConstructorParameters<typeof Path>[0], {
        fill: null,
        strokeLineCap: "round",
        strokeLineJoin: "round",
        strokeUniform: true,
      });
  }
}

// `waitForFonts: false` returns text immediately in a fallback face (the editor re-measures once
// the real one loads); offscreen renders keep the default and wait, so pages come out right.
export async function createObject(
  layer: Layer,
  zine: Zine,
  { waitForFonts = true }: { waitForFonts?: boolean } = {},
): Promise<FabricObject | null> {
  try {
    const obj = await build(layer, zine, waitForFonts);
    if (!obj) return null;
    ids.set(obj, layer.id);
    applyLayer(obj, layer, zine, undefined);
    return obj;
  } catch (error) {
    console.error("Could not build layer", layer.id, error);
    return null;
  }
}

// Push a layer's state onto its object. `prev` lets expensive work (filters, fonts) be skipped.
export function applyLayer(obj: FabricObject, layer: Layer, zine: Zine, prev: Layer | undefined): Promise<void> | void {
  obj.set(common(layer));
  let pending: Promise<void> | undefined;

  if (layer.kind === "shape") obj.set(shapeProps(layer));
  if (layer.kind === "text") {
    obj.set(textProps(layer, zine));
    const p = prev?.kind === "text" ? prev : undefined;
    if (!p || p.fontFamily !== layer.fontFamily || p.fontWeight !== layer.fontWeight || p.italic !== layer.italic) {
      pending = ensureFont(zine, layer.fontFamily, layer.fontWeight, layer.italic).then(() => {
        // Re-measure now the real glyphs are available.
        (obj as Textbox).initDimensions();
        obj.setCoords();
        obj.dirty = true;
        obj.canvas?.requestRenderAll();
      });
    }
  }
  if (layer.kind === "image" && obj instanceof FabricImage) {
    const p = prev?.kind === "image" ? prev : undefined;
    if (!p || p.filters !== layer.filters) {
      obj.filters = imageFilters(layer.filters);
      obj.applyFilters();
    }
  }

  obj.set(sizeProps(obj, layer));
  obj.setCoords();
  obj.dirty = true;
  return pending;
}

// Read an object's on-canvas transform back into layer terms, baking scale into real sizes.
// Works inside a multi-selection too: the full matrix includes the group. The object's own flips
// are factored out first so they stay in flipX/flipY instead of leaking into the angle.
export function readTransform(obj: FabricObject, layer: Layer): Partial<Layer> {
  const unflip: TMat2D = [obj.flipX ? -1 : 1, 0, 0, obj.flipY ? -1 : 1, 0, 0];
  const d = util.qrDecompose(util.multiplyTransformMatrices(obj.calcTransformMatrix(), unflip));
  const sx = Math.abs(d.scaleX);
  const sy = Math.abs(d.scaleY);
  const base = { x: round(d.translateX, 3), y: round(d.translateY, 3), rotation: normaliseAngle(d.angle) };

  switch (layer.kind) {
    case "text": {
      // Side handles reflow (width changes, scale stays 1); corner handles scale the type.
      const next: Partial<TextLayer> = {
        ...base,
        width: Math.max(2, obj.width * sx),
        height: Math.max(0.1, obj.height * sy),
      };
      if (Math.abs(sy - 1) > 1e-3) next.fontSizePt = round(layer.fontSizePt * sy, 2);
      return next;
    }
    case "shape": {
      const w = layer.shape === "ellipse" ? (obj as Ellipse).rx * 2 : obj.width;
      const h = layer.shape === "ellipse" ? (obj as Ellipse).ry * 2 : obj.height;
      const next: Partial<ShapeLayer> = { ...base, width: Math.max(0.5, w * sx) };
      if (layer.shape !== "line") next.height = Math.max(0.5, h * sy);
      return next;
    }
    case "image":
    case "draw": {
      const next: Partial<ImageLayer | DrawLayer> = { ...base, width: obj.width * sx, height: obj.height * sy };
      return next;
    }
  }
}

// A text box's height comes from its content, not the document: report it when it drifts.
export function measuredTextHeight(obj: FabricObject, layer: Layer): number | null {
  if (layer.kind !== "text" || !(obj instanceof Textbox)) return null;
  const h = obj.height * Math.abs(obj.scaleY);
  return Math.abs(h - layer.height) > 0.05 ? round(h, 3) : null;
}

function normaliseAngle(a: number): number {
  const r = ((a % 360) + 360) % 360;
  return round(r > 180 ? r - 360 : r, 2);
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// Page numbers: plain, locked text above the artwork. Not layers, so they can't be selected.
export async function createFolioObjects(zine: Zine, items: FolioItem[]): Promise<FabricObject[]> {
  if (!items.length) return [];
  const f = foliosOf(zine);
  await ensureFont(zine, f.fontFamily, 400, false);
  return items.map(
    (item) =>
      new FabricText(item.text, {
        left: item.x,
        top: item.y,
        originX: item.align,
        originY: "bottom",
        fontFamily: resolveFontFamily(zine, f.fontFamily),
        fontSize: f.sizePt * PT_TO_MM,
        fill: f.color,
        strokeWidth: 0,
        selectable: false,
        evented: false,
        objectCaching: false,
      }),
  );
}
