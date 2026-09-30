import { expect, type Page } from "@playwright/test";

// Test helpers that talk to the editor through the dev-only window.__zine hook (lib/editor/testHooks.ts).
// Each Playwright test gets a fresh browser context, so a fresh IndexedDB and a new zine.

export type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };

export type CanvasObject = {
  id: string;
  bounds: Box;
  scaleX: number;
  scaleY: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  inGroup: boolean;
};

export type DocLayer = {
  id: string;
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  fontSizePt?: number;
};

export async function openEditor(page: Page, spread = 1): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.__zine?.stage && window.__zine.store.getState().zine));
  await page.evaluate((i) => window.__zine?.store.getState().setSpread(i), spread);
  await settle(page);
}

// Let React effects, font loads and Fabric renders catch up.
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await page.waitForTimeout(80);
}

export async function docLayers(page: Page): Promise<DocLayer[]> {
  return page.evaluate(() => {
    const s = window.__zine?.store.getState();
    const layers = s?.zine?.spreads[s.spreadIndex].layers ?? [];
    return layers.map((l) => ({
      id: l.id,
      kind: l.kind,
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
      rotation: l.rotation,
      flipX: l.flipX,
      flipY: l.flipY,
      fontSizePt: l.kind === "text" ? l.fontSizePt : undefined,
    }));
  });
}

// Every object on the canvas, in scene mm, measured the way Fabric draws it.
export async function canvasObjects(page: Page): Promise<CanvasObject[]> {
  return page.evaluate(() => {
    const z = window.__zine;
    if (!z?.stage) return [];
    return z.stage.canvas.getObjects().map((o) => {
      const r = o.getBoundingRect();
      return {
        id: z.idOf(o) ?? "",
        bounds: { left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height, width: r.width, height: r.height },
        scaleX: o.scaleX,
        scaleY: o.scaleY,
        angle: o.angle,
        flipX: o.flipX,
        flipY: o.flipY,
        inGroup: Boolean(o.group),
      };
    });
  });
}

type ShapeInit = { x: number; y: number; width: number; height: number; rotation?: number };

export async function addRect(page: Page, init: ShapeInit): Promise<string> {
  const id = await page.evaluate((i) => {
    const store = window.__zine?.store;
    if (!store) throw new Error("editor not ready");
    const id = crypto.randomUUID();
    store.getState().addLayer({
      id,
      name: "Rect",
      kind: "shape",
      shape: "rect",
      x: i.x,
      y: i.y,
      width: i.width,
      height: i.height,
      rotation: i.rotation ?? 0,
      opacity: 1,
      blend: "normal",
      flipX: false,
      flipY: false,
      locked: false,
      hidden: false,
      fill: "#1a1a1a",
      stroke: null,
      strokeWidthMm: 0,
      cornerRadiusMm: 0,
    });
    return id;
  }, init);
  await expect.poll(async () => (await canvasObjects(page)).some((o) => o.id === id)).toBe(true);
  await settle(page);
  return id;
}

export async function select(page: Page, ids: string[]): Promise<void> {
  await page.evaluate((list) => window.__zine?.store.getState().select(list), ids);
  await settle(page);
}

// Screen position of a scene point (mm).
export async function toScreen(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ([sx, sy]) => {
      const c = window.__zine?.stage?.canvas;
      if (!c) throw new Error("no canvas");
      const r = c.upperCanvasEl.getBoundingClientRect();
      const v = c.viewportTransform;
      return { x: r.left + v[0] * sx + v[4], y: r.top + v[3] * sy + v[5] };
    },
    [x, y] as const,
  );
}

// Screen position of a handle on the active selection ("tl", "br", "mr", "mtr", …).
export async function handle(page: Page, corner: string): Promise<{ x: number; y: number }> {
  return page.evaluate((key) => {
    const c = window.__zine?.stage?.canvas;
    const active = c?.getActiveObject();
    if (!c || !active) throw new Error("nothing selected");
    active.setCoords();
    const p = active.oCoords[key];
    const r = c.upperCanvasEl.getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  }, corner);
}

// Drag like a hand: ~60 fps, quick through the middle, then a slow settle onto the target
// (which is when snapping is allowed to catch).
export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const settleFrom = { x: to.x - Math.sign(to.x - from.x) * 6, y: to.y - Math.sign(to.y - from.y) * 6 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(from.x + ((settleFrom.x - from.x) * i) / 12, from.y + ((settleFrom.y - from.y) * i) / 12);
    await page.waitForTimeout(16);
  }
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(settleFrom.x + ((to.x - settleFrom.x) * i) / 6, settleFrom.y + ((to.y - settleFrom.y) * i) / 6);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await settle(page);
}

// Document and canvas must agree for every layer: position and size to within `tol` mm.
export async function expectInSync(page: Page, tol = 0.2): Promise<void> {
  const [layers, objects] = await Promise.all([docLayers(page), canvasObjects(page)]);
  for (const layer of layers) {
    const obj = objects.find((o) => o.id === layer.id);
    expect(obj, `object for ${layer.id}`).toBeTruthy();
    if (!obj) continue;
    const r = (layer.rotation * Math.PI) / 180;
    const w = Math.abs(layer.width * Math.cos(r)) + Math.abs(layer.height * Math.sin(r));
    const h = Math.abs(layer.width * Math.sin(r)) + Math.abs(layer.height * Math.cos(r));
    expect(obj.bounds.left + obj.bounds.width / 2, `${layer.kind} x`).toBeCloseTo(layer.x, 1);
    expect(obj.bounds.top + obj.bounds.height / 2, `${layer.kind} y`).toBeCloseTo(layer.y, 1);
    expect(Math.abs(obj.bounds.width - w), `${layer.kind} width`).toBeLessThan(tol);
    expect(Math.abs(obj.bounds.height - h), `${layer.kind} height`).toBeLessThan(tol);
  }
}
