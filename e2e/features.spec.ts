import { expect, test, type Page } from "@playwright/test";
import { addRect, openEditor, select, settle } from "./helpers";

async function state(page: Page) {
  return page.evaluate(() => {
    const s = window.__zine?.store.getState();
    return {
      spreadIndex: s?.spreadIndex ?? -1,
      selection: s?.selection ?? [],
      layersPerSpread: s?.zine?.spreads.map((sp) => sp.layers.map((l) => l.id)) ?? [],
      spreadIds: s?.zine?.spreads.map((sp) => sp.id) ?? [],
    };
  });
}

// Text drawn on the canvas that isn't a layer: the page numbers.
async function folioTexts(page: Page): Promise<{ text: string; left: number }[]> {
  return page.evaluate(() => {
    const z = window.__zine;
    return (z?.stage?.canvas.getObjects() ?? [])
      .filter((o) => !z?.idOf(o) && "text" in o)
      .map((o) => ({ text: String((o as unknown as { text: string }).text), left: o.getBoundingRect().left }));
  });
}

test("page numbers appear on inside pages only, in the outer corners", async ({ page }) => {
  await openEditor(page, 1);
  await page.locator("aside").getByRole("radio", { name: "Outer" }).click();
  await expect.poll(() => folioTexts(page)).toHaveLength(2);
  const folios = (await folioTexts(page)).sort((a, b) => a.left - b.left);
  expect(folios.map((f) => f.text)).toEqual(["2", "3"]);
  expect(folios[0].left).toBeLessThan(20); // left page, outer (left) edge
  expect(folios[1].left).toBeGreaterThan(260); // right page, outer (right) edge

  await page.evaluate(() => window.__zine?.store.getState().setSpread(0));
  await settle(page);
  expect(await folioTexts(page)).toHaveLength(0); // covers stay clean

  await page.evaluate(() => window.__zine?.store.getState().setSpread(3));
  await expect.poll(async () => (await folioTexts(page)).map((f) => f.text).sort()).toEqual(["6", "7"]);
});

test("⌥⌘→ carries the selected layer to the next spread and follows it", async ({ page }) => {
  await openEditor(page, 1);
  const id = await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
  await select(page, [id]);
  await page.keyboard.press("Alt+Meta+ArrowRight");
  await settle(page);
  const s = await state(page);
  expect(s.spreadIndex).toBe(2);
  expect(s.layersPerSpread[1]).toEqual([]);
  expect(s.layersPerSpread[2]).toEqual([id]);
  expect(s.selection).toEqual([id]);
});

test("the sidebar and layers panel resize by dragging, and remember it", async ({ page }) => {
  await openEditor(page);
  const aside = page.locator("aside");
  const before = (await aside.boundingBox())?.width ?? 0;
  const handle = await page.getByRole("separator", { name: "Resize sidebar" }).boundingBox();
  if (!handle) throw new Error("no handle");
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 200);
  await page.mouse.down();
  await page.mouse.move(handle.x - 80, handle.y + 200, { steps: 8 });
  await page.mouse.up();
  const after = (await aside.boundingBox())?.width ?? 0;
  expect(after - before).toBeGreaterThan(70);

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__zine?.stage));
  expect(Math.round((await aside.boundingBox())?.width ?? 0)).toBe(Math.round(after));
});

test("arrow keys in the spread strip open neighbours, ⌥arrow moves the spread", async ({ page }) => {
  await openEditor(page, 1);
  const strip = page.getByRole("navigation", { name: "Spreads" });
  await strip.getByRole("button", { name: "2–3", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await settle(page);
  expect((await state(page)).spreadIndex).toBe(2);
  await expect(strip.getByRole("button", { name: "4–5", exact: true })).toBeFocused();

  const before = (await state(page)).spreadIds;
  await page.keyboard.press("Alt+ArrowRight");
  await settle(page);
  const s = await state(page);
  expect(s.spreadIds[3]).toBe(before[2]);
  expect(s.spreadIndex).toBe(3);
});
