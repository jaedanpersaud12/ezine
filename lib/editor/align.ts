import { spreadGeometry, type Layer, type Zine } from "@/lib/zine/schema";

export type AlignEdge = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

type Box = { left: number; top: number; right: number; bottom: number };

// Axis-aligned bounds of a rotated layer, in spread mm.
export function layerBounds(l: Layer): Box {
  const r = (l.rotation * Math.PI) / 180;
  const hw = (Math.abs(l.width * Math.cos(r)) + Math.abs(l.height * Math.sin(r))) / 2;
  const hh = (Math.abs(l.width * Math.sin(r)) + Math.abs(l.height * Math.cos(r))) / 2;
  return { left: l.x - hw, right: l.x + hw, top: l.y - hh, bottom: l.y + hh };
}

// The page a layer sits on (by its centre), as a box; covers have one page.
export function pageBoxFor(zine: Zine, spreadIndex: number, l: Layer): Box {
  const g = spreadGeometry(zine, spreadIndex);
  const pageW = g.widthMm / g.pages;
  const page = Math.min(g.pages - 1, Math.max(0, Math.floor(l.x / pageW)));
  return { left: page * pageW, right: (page + 1) * pageW, top: 0, bottom: g.heightMm };
}

function union(boxes: Box[]): Box {
  return {
    left: Math.min(...boxes.map((b) => b.left)),
    top: Math.min(...boxes.map((b) => b.top)),
    right: Math.max(...boxes.map((b) => b.right)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  };
}

// New centres for `layers` aligned to `edge`. One layer aligns to its page; several align to each other.
export function alignLayers(zine: Zine, spreadIndex: number, layers: Layer[], edge: AlignEdge): Map<string, { x: number; y: number }> {
  const target = layers.length === 1 ? pageBoxFor(zine, spreadIndex, layers[0]) : union(layers.map(layerBounds));
  const out = new Map<string, { x: number; y: number }>();
  for (const l of layers) {
    const b = layerBounds(l);
    let { x, y } = l;
    if (edge === "left") x += target.left - b.left;
    if (edge === "right") x += target.right - b.right;
    if (edge === "hcenter") x += (target.left + target.right) / 2 - (b.left + b.right) / 2;
    if (edge === "top") y += target.top - b.top;
    if (edge === "bottom") y += target.bottom - b.bottom;
    if (edge === "vcenter") y += (target.top + target.bottom) / 2 - (b.top + b.bottom) / 2;
    out.set(l.id, { x, y });
  }
  return out;
}

// Scale and centre an image-like layer so it covers its page out to the bleed.
export function fillPage(zine: Zine, spreadIndex: number, l: Layer): Pick<Layer, "x" | "y" | "width" | "height" | "rotation"> {
  const page = pageBoxFor(zine, spreadIndex, l);
  const b = zine.bleedMm;
  const w = page.right - page.left + b * 2;
  const h = page.bottom - page.top + b * 2;
  const s = Math.max(w / l.width, h / l.height);
  return { x: (page.left + page.right) / 2, y: (page.top + page.bottom) / 2, width: l.width * s, height: l.height * s, rotation: 0 };
}

// Stretch across the whole spread (both pages) out to the bleed: for art that runs over the fold.
export function fillSpread(zine: Zine, spreadIndex: number, l: Layer): Pick<Layer, "x" | "y" | "width" | "height" | "rotation"> {
  const g = spreadGeometry(zine, spreadIndex);
  const b = zine.bleedMm;
  const w = g.widthMm + b * 2;
  const h = g.heightMm + b * 2;
  const s = Math.max(w / l.width, h / l.height);
  return { x: g.widthMm / 2, y: g.heightMm / 2, width: l.width * s, height: l.height * s, rotation: 0 };
}
