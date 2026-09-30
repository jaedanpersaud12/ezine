import { expect, test } from "@playwright/test";
import {
  addRect,
  canvasObjects,
  docLayers,
  drag,
  expectInSync,
  handle,
  openEditor,
  select,
  settle,
  toScreen,
} from "./helpers";

// Canvas ↔ document consistency: alignment, resizing and multi-selection must leave what Fabric
// draws and what the zine stores in exact agreement. Spread 1 is pages 2–3 (296 × 210 mm).

test.describe("alignment", () => {
  test("aligning a multi-selection moves every layer to the shared edge", async ({ page }) => {
    await openEditor(page);
    const a = await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
    const b = await addRect(page, { x: 200, y: 140, width: 40, height: 50 });
    await select(page, [a, b]);

    await page.getByRole("button", { name: "Align left", exact: true }).click();
    await settle(page);

    const objects = await canvasObjects(page);
    const lefts = objects.map((o) => o.bounds.left);
    expect(lefts[0]).toBeCloseTo(45, 1);
    expect(lefts[1]).toBeCloseTo(45, 1);
    await expectInSync(page);

    // Still both selected, and the selection still works as a unit.
    const selected = await page.evaluate(() => window.__zine?.store.getState().selection);
    expect(selected).toEqual([a, b]);
  });

  test("undo after a multi-align puts both layers back", async ({ page }) => {
    await openEditor(page);
    const a = await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
    const b = await addRect(page, { x: 200, y: 140, width: 40, height: 50 });
    await select(page, [a, b]);
    await page.getByRole("button", { name: "Align bottom", exact: true }).click();
    await settle(page);
    await page.keyboard.press("Meta+z");
    await settle(page);

    const layers = await docLayers(page);
    expect(layers.map((l) => [l.x, l.y])).toEqual([
      [60, 60],
      [200, 140],
    ]);
    await expectInSync(page);
  });

  test("text aligns by its real height after the type size changes", async ({ page }) => {
    await openEditor(page, 0);
    await page.keyboard.press("t");
    const at = await toScreen(page, 30, 40);
    await page.mouse.click(at.x, at.y);
    await page.keyboard.type("NIGHT SHIFT");
    await page.keyboard.press("Escape");
    await settle(page);

    const size = page.getByRole("textbox", { name: "Size" });
    await size.fill("20");
    await size.press("Enter");
    await settle(page);
    await page.getByRole("button", { name: "Align bottom (to page)" }).click();
    await settle(page);

    const [obj] = await canvasObjects(page);
    expect(obj.bounds.bottom).toBeCloseTo(210, 1);
    await expectInSync(page);
  });
});

test.describe("resizing", () => {
  test("corner-resizing a shape bakes the scale into its size", async ({ page }) => {
    await openEditor(page);
    const id = await addRect(page, { x: 100, y: 100, width: 40, height: 30 });
    await select(page, [id]);
    const from = await handle(page, "br");
    await drag(page, from, { x: from.x + 80, y: from.y + 60 });

    const [layer] = await docLayers(page);
    expect(layer.width).toBeGreaterThan(40);
    const [obj] = await canvasObjects(page);
    expect(obj.scaleX).toBe(1);
    expect(obj.scaleY).toBe(1);
    await expectInSync(page);
  });

  test("dragging a handle past the opposite edge doesn't flip the layer", async ({ page }) => {
    await openEditor(page);
    const id = await addRect(page, { x: 100, y: 100, width: 40, height: 30 });
    await select(page, [id]);
    const from = await handle(page, "mr");
    const across = await toScreen(page, 40, 100);
    await drag(page, from, across);

    const [layer] = await docLayers(page);
    const [obj] = await canvasObjects(page);
    expect(layer.flipX).toBe(false);
    expect(obj.flipX).toBe(false);
    await expectInSync(page);
  });

  test("resizing a multi-selection keeps every layer in sync", async ({ page }) => {
    await openEditor(page);
    const a = await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
    const b = await addRect(page, { x: 120, y: 110, width: 40, height: 50 });
    await select(page, [a, b]);
    const from = await handle(page, "br");
    await drag(page, from, { x: from.x + 120, y: from.y + 90 });

    await expectInSync(page);
    const before = await docLayers(page);

    // Clicking away must not move anything.
    const empty = await toScreen(page, 270, 20);
    await page.mouse.click(empty.x, empty.y);
    await settle(page);
    expect(await docLayers(page)).toEqual(before);
    await expectInSync(page);
    for (const o of await canvasObjects(page)) {
      expect(o.scaleX).toBe(1);
      expect(o.scaleY).toBe(1);
    }
  });

  test("rotating a multi-selection keeps every layer in sync", async ({ page }) => {
    await openEditor(page);
    const a = await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
    const b = await addRect(page, { x: 120, y: 110, width: 40, height: 50 });
    await select(page, [a, b]);
    const from = await handle(page, "mtr");
    const centre = await toScreen(page, 92.5, 85);
    await drag(page, from, { x: centre.x + 160, y: centre.y });

    const layers = await docLayers(page);
    expect(Math.abs(layers[0].rotation)).toBeGreaterThan(30);
    await expectInSync(page, 0.3);
  });

  test("scaling text from a corner scales the type and keeps its box", async ({ page }) => {
    await openEditor(page, 0);
    await page.keyboard.press("t");
    const at = await toScreen(page, 20, 40);
    await page.mouse.click(at.x, at.y);
    await page.keyboard.type("Hello");
    await page.keyboard.press("Escape");
    await settle(page);

    const before = (await docLayers(page))[0];
    const from = await handle(page, "br");
    await drag(page, from, { x: from.x + 60, y: from.y + 60 });

    const after = (await docLayers(page))[0];
    expect(after.fontSizePt ?? 0).toBeGreaterThan(before.fontSizePt ?? 0);
    const [obj] = await canvasObjects(page);
    expect(obj.scaleX).toBe(1);
    await expectInSync(page);
  });

  test("typing a width in the inspector resizes the canvas object", async ({ page }) => {
    await openEditor(page);
    const id = await addRect(page, { x: 100, y: 100, width: 40, height: 30 });
    await select(page, [id]);
    const w = page.getByRole("textbox", { name: "W", exact: true });
    await w.fill("80");
    await w.press("Enter");
    await settle(page);

    const [layer] = await docLayers(page);
    expect(layer.width).toBe(80);
    expect(layer.height).toBe(60); // proportions linked by default
    await expectInSync(page);
  });
});

test.describe("moving", () => {
  test("arrow keys nudge a multi-selection without scattering it", async ({ page }) => {
    await openEditor(page);
    const a = await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
    const b = await addRect(page, { x: 200, y: 140, width: 40, height: 50 });
    await select(page, [a, b]);
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("ArrowDown");
    await settle(page);

    const layers = await docLayers(page);
    expect(layers.map((l) => [l.x, l.y])).toEqual([
      [70, 61],
      [210, 141],
    ]);
    await expectInSync(page);
  });

  test("dragging near the trim snaps the edge onto it", async ({ page }) => {
    await openEditor(page);
    const id = await addRect(page, { x: 100, y: 100, width: 40, height: 30 });
    await select(page, [id]);
    const from = await toScreen(page, 100, 100);
    // Left edge lands ~0.6 mm from the trim at x = 0: close enough to snap.
    const to = await toScreen(page, 20.6, 100);
    await drag(page, from, to);

    const [layer] = await docLayers(page);
    expect(layer.x - layer.width / 2).toBeCloseTo(0, 2);
    await expectInSync(page);
  });
});
