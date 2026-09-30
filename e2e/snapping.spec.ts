import { expect, test, type Page } from "@playwright/test";
import { canvasObjects, docLayers, expectInSync, openEditor, settle, toScreen } from "./helpers";

// A generated photo, imported through the real file input.
async function addImage(page: Page, widthPx = 1200, heightPx = 900): Promise<string> {
  await page.evaluate(
    async ([w, h]) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      if (!g) throw new Error("no 2d");
      g.fillStyle = "#0078bf";
      g.fillRect(0, 0, w, h);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
      if (!blob) throw new Error("no blob");
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "photo.png", { type: "image/png" }));
      const input = document.getElementById("zine-file-input");
      if (!(input instanceof HTMLInputElement)) throw new Error("no input");
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [widthPx, heightPx] as const,
  );
  await expect.poll(async () => (await canvasObjects(page)).length).toBe(1);
  await settle(page);
  return (await docLayers(page))[0].id;
}

// Drag slowly (1 px per move, like a real hand) and record where the object sits after each move.
async function slowDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps: number): Promise<number[][]> {
  await page.evaluate(() => {
    const c = window.__zine?.stage?.canvas;
    const trail: number[][] = [];
    (window as unknown as { __trail: number[][] }).__trail = trail;
    c?.on("object:moving", ({ target }) => {
      queueMicrotask(() => trail.push([target.left, target.top]));
    });
  });
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
  await settle(page);
  return page.evaluate(() => (window as unknown as { __trail: number[][] }).__trail);
}

// While the pointer only moves one way, the image must never move the other way.
function reversals(values: number[], direction: 1 | -1): number {
  let count = 0;
  for (let i = 1; i < values.length; i++) if ((values[i] - values[i - 1]) * direction < -1e-6) count++;
  return count;
}

test("dragging an image slowly past the guides never jitters backwards", async ({ page }) => {
  await openEditor(page);
  const id = await addImage(page);
  const [layer] = await docLayers(page);
  expect(layer.id).toBe(id);

  // Sweep the image right-to-left across the fold, page centre, safe, trim and bleed lines.
  const from = await toScreen(page, layer.x, layer.y);
  const to = await toScreen(page, layer.x - 150, layer.y + 3);
  const trail = await slowDrag(page, from, to, 300);

  expect(trail.length).toBeGreaterThan(100);
  expect(reversals(trail.map((p) => p[0]), -1)).toBe(0);
  expect(reversals(trail.map((p) => p[1]), 1)).toBe(0);
  await expectInSync(page);
});

test("a snapped image lets go once dragged clearly past the guide", async ({ page }) => {
  await openEditor(page);
  await addImage(page);
  const [layer] = await docLayers(page);
  const left = layer.x - layer.width / 2;

  // Put the left edge 0.5 mm off the trim (snaps), then 14 mm past it: clear of the trim and
  // the 5 mm safe line, so nothing should be holding it.
  const from = await toScreen(page, layer.x, layer.y);
  const near = await toScreen(page, layer.x - left + 0.5, layer.y);
  await slowDrag(page, from, near, 60);
  expect((await docLayers(page))[0].x - layer.width / 2).toBeCloseTo(0, 2);

  const grab = await toScreen(page, layer.width / 2, layer.y);
  const past = await toScreen(page, layer.width / 2 + 14, layer.y);
  await slowDrag(page, grab, past, 40);
  const after = (await docLayers(page))[0];
  expect(after.x - after.width / 2).toBeCloseTo(14, 0);
});

test("hand wobble near the trim and bleed doesn't make the image flicker", async ({ page }) => {
  await openEditor(page);
  await addImage(page);
  const [layer] = await docLayers(page);
  const halfW = layer.width / 2;
  const zoom = await page.evaluate(() => window.__zine?.stage?.canvas.getZoom() ?? 1);

  // Grab the image at its centre and park its left edge at a series of spots between +3 mm and
  // -5 mm of the trim, wobbling ±1 px at each spot the way a hand does.
  const start = await toScreen(page, layer.x, layer.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const flickers: string[] = [];
  for (let edge = 3; edge >= -5; edge -= 0.25) {
    const spot = await toScreen(page, halfW + edge, layer.y);
    const seen: number[] = [];
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(spot.x + (i % 2 ? 1 : -1), spot.y + (i % 3) - 1);
      seen.push(await page.evaluate(() => window.__zine?.stage?.canvas.getActiveObject()?.left ?? 0));
    }
    const jumps = seen.slice(1).filter((v, i) => Math.abs(v - seen[i]) > 1.5 / zoom + 0.3).length;
    if (jumps > 1) flickers.push(`${edge.toFixed(2)}mm: ${jumps} jumps`);
  }
  await page.mouse.up();
  expect(flickers).toEqual([]);
});
