import { expect, test, type Page } from "@playwright/test";
import { docLayers, expectInSync, openEditor, settle, toScreen } from "./helpers";
import { addImage } from "./images";

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
  // Slow and steady: ~0.1 px/ms, well under the snapping speed limit.
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await page.waitForTimeout(10);
  }
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
  // ~400 paced pointer moves: slow on purpose, and slower still when the suite runs in parallel.
  test.setTimeout(90_000);
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
    await page.mouse.move(spot.x, spot.y, { steps: 4 });
    await page.waitForTimeout(30);
    const seen: number[] = [];
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(spot.x + (i % 2 ? 1 : -1), spot.y + (i % 3) - 1);
      await page.waitForTimeout(20);
      seen.push(await page.evaluate(() => window.__zine?.stage?.canvas.getActiveObject()?.left ?? 0));
    }
    const jumps = seen.slice(1).filter((v, i) => Math.abs(v - seen[i]) > 1.5 / zoom + 0.3).length;
    if (jumps > 1) flickers.push(`${edge.toFixed(2)}mm: ${jumps} jumps`);
  }
  await page.mouse.up();
  expect(flickers).toEqual([]);
});
