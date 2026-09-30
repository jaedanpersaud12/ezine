import { expect, test, type Page } from "@playwright/test";
import { docLayers, openEditor, settle, toScreen } from "./helpers";
import { addImage } from "./images";

// How a drag *feels*. Every frame, the image's position is owned either by the cursor (it sits
// exactly where the grab point says) or by a guide (it's been pulled onto one). Jitter is the two
// fighting: ownership flipping and flipping straight back. These tests replay hand-like drags and
// check that never happens.

type Point = { x: number; y: number };
type Owner = "cursor" | "guide";

type Frame = { owner: Owner; px: number; py: number };

async function replay(page: Page, path: Point[], msPerMove = 16): Promise<Frame[]> {
  await page.evaluate(() => {
    const c = window.__zine?.stage?.canvas;
    const log: { px: number; py: number; ox: number; oy: number }[] = [];
    (window as unknown as { __log: typeof log }).__log = log;
    c?.on("object:moving", ({ target, e }) => {
      queueMicrotask(() => {
        const r = c.upperCanvasEl.getBoundingClientRect();
        const v = c.viewportTransform;
        const p = e as PointerEvent;
        log.push({ px: p.clientX, py: p.clientY, ox: r.left + v[0] * target.left + v[4], oy: r.top + v[3] * target.top + v[5] });
      });
    });
  });
  await page.mouse.move(path[0].x, path[0].y);
  await page.mouse.down();
  for (const p of path.slice(1)) {
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(msPerMove);
  }
  await page.mouse.up();
  await settle(page);

  const log = await page.evaluate(() => (window as unknown as { __log: { px: number; py: number; ox: number; oy: number }[] }).__log);
  // Every drag here grabs the image at its centre, so a cursor-owned frame has the centre under the pointer.
  return log.map((f) => ({ owner: Math.hypot(f.ox - f.px, f.oy - f.py) > 0.25 ? "guide" : "cursor", px: f.px, py: f.py }));
}

// The cursor and a guide trading the image: ownership flips and flips straight back while the
// pointer has barely moved (under the 6 px release distance). A guide briefly holding the image as
// the cursor sweeps through it is normal snapping, not a fight.
function fights(frames: Frame[]): number {
  let n = 0;
  for (let i = 2; i < frames.length; i++) {
    const [a, b, c] = [frames[i - 2], frames[i - 1], frames[i]];
    if (a.owner === c.owner && a.owner !== b.owner && Math.hypot(c.px - a.px, c.py - a.py) < 6) n++;
  }
  return n;
}

function sweep(start: Point, dx: number, frames: number, wobble: number): Point[] {
  const path: Point[] = [];
  for (let i = 0; i <= frames; i++) path.push({ x: start.x + (dx * i) / frames, y: start.y + Math.sin(i / 5) * wobble });
  return path;
}

test("sweeping an image across every guide never fights the cursor", async ({ page }) => {
  await openEditor(page);
  await addImage(page);
  const [layer] = await docLayers(page);
  const start = await toScreen(page, layer.x, layer.y);
  // Pick it up off every guide first (1 px nudge), then sweep left and back with a wobbling hand.
  const frames = await replay(page, [
    start,
    { x: start.x, y: start.y + 20 },
    ...sweep({ x: start.x, y: start.y + 20 }, -700, 140, 3),
    ...sweep({ x: start.x - 700, y: start.y + 20 }, 700, 140, 3),
  ]);
  expect(frames.length).toBeGreaterThan(200);
  expect(fights(frames)).toBe(0);
  // Guides only hold briefly as edges pass them; the cursor owns the image almost all the time.
  expect(frames.filter((f) => f.owner === "cursor").length / frames.length).toBeGreaterThan(0.8);
});

test("a slow, careful approach settles on the trim and stays put", async ({ page }) => {
  await openEditor(page);
  await addImage(page);
  const [layer] = await docLayers(page);
  const halfW = layer.width / 2;
  const start = await toScreen(page, layer.x, layer.y);
  const near = await toScreen(page, halfW + 2.5, layer.y);
  const end = await toScreen(page, halfW + 0.3, layer.y);
  const frames = await replay(page, [
    ...sweep(start, near.x - start.x, 30, 0),
    ...sweep(near, end.x - near.x, 40, 1),
  ], 30);
  expect(fights(frames)).toBe(0);
  const [after] = await docLayers(page);
  expect(after.x - after.width / 2).toBeCloseTo(0, 2);
});

test("with snapping off the image only ever follows the cursor", async ({ page }) => {
  await openEditor(page);
  await addImage(page);
  await page.getByRole("button", { name: /Snapping on/ }).click();
  const [layer] = await docLayers(page);
  const start = await toScreen(page, layer.x, layer.y);
  const frames = await replay(page, sweep(start, -500, 100, 3));
  expect(frames.every((f) => f.owner === "cursor")).toBe(true);
});
