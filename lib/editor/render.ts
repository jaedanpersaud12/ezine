import { StaticCanvas } from "fabric";
import { createFolioObjects, createObject } from "@/lib/editor/fabric/objects";
import { folioItems } from "@/lib/zine/folios";
import { spreadGeometry, type Zine } from "@/lib/zine/schema";

// Offscreen rendering of the document: spread thumbnails, 3D page textures and image export all
// go through the same layer builders the editor uses, so what you see is what you get.

type RenderOptions = { pxPerMm: number; bleed: boolean };

export async function renderSpread(zine: Zine, index: number, { pxPerMm, bleed }: RenderOptions): Promise<HTMLCanvasElement> {
  const g = spreadGeometry(zine, index);
  const spread = zine.spreads[index];
  const b = bleed ? zine.bleedMm : 0;
  const width = Math.round((g.widthMm + b * 2) * pxPerMm);
  const height = Math.round((g.heightMm + b * 2) * pxPerMm);

  const el = document.createElement("canvas");
  const canvas = new StaticCanvas(el, { width, height, enableRetinaScaling: false, renderOnAddRemove: false });
  canvas.backgroundColor = spread.background ?? zine.paper.color;
  canvas.viewportTransform = [pxPerMm, 0, 0, pxPerMm, b * pxPerMm, b * pxPerMm];

  const objects = await Promise.all(spread.layers.filter((l) => !l.hidden).map((l) => createObject(l, zine)));
  for (const obj of objects) if (obj) canvas.add(obj);
  for (const folio of await createFolioObjects(zine, folioItems(zine, index))) canvas.add(folio);
  canvas.renderAll();

  // Copy out before disposing, which tears down Fabric's element.
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  out.getContext("2d")?.drawImage(canvas.getElement(), 0, 0);
  await canvas.dispose();
  return out;
}

// One image per printed side (1-based), trimmed, for the 3D reader.
export async function renderPages(zine: Zine, pxPerMm: number): Promise<Map<number, HTMLCanvasElement>> {
  const pages = new Map<number, HTMLCanvasElement>();
  const pageW = Math.round(zine.trim.widthMm * pxPerMm);
  const pageH = Math.round(zine.trim.heightMm * pxPerMm);

  for (let i = 0; i < zine.spreads.length; i++) {
    const g = spreadGeometry(zine, i);
    const spread = await renderSpread(zine, i, { pxPerMm, bleed: false });
    g.sides.forEach((side, p) => {
      const page = document.createElement("canvas");
      page.width = pageW;
      page.height = pageH;
      page.getContext("2d")?.drawImage(spread, p * pageW, 0, pageW, pageH, 0, 0, pageW, pageH);
      pages.set(side, page);
    });
  }
  return pages;
}
