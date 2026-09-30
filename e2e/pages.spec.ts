import { expect, test, type Page } from "@playwright/test";
import { addRect, docLayers, openEditor, select, settle } from "./helpers";

// Page management from the spread strip: right-click actions and drag to reorder.

async function spreadIds(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__zine?.store.getState().zine?.spreads.map((s) => s.id) ?? []);
}

async function pageCount(page: Page): Promise<number> {
  return page.evaluate(() => ((window.__zine?.store.getState().zine?.spreads.length ?? 1) - 1) * 2);
}

const strip = (page: Page) => page.getByRole("navigation", { name: "Spreads" });

test("right-click → delete removes that sheet (4 pages), and undo brings it back", async ({ page }) => {
  await openEditor(page);
  const before = await spreadIds(page);
  await strip(page).getByRole("button", { name: "4–5", exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete pages 4–7" }).click();
  await settle(page);
  expect(await pageCount(page)).toBe(12);
  expect(await spreadIds(page)).toEqual([...before.slice(0, 2), ...before.slice(4)]);

  await page.keyboard.press("Meta+z");
  await settle(page);
  expect(await spreadIds(page)).toEqual(before);
});

test("right-click → move right swaps the spread with its neighbour", async ({ page }) => {
  await openEditor(page);
  const before = await spreadIds(page);
  await strip(page).getByRole("button", { name: "2–3", exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Move right" }).click();
  await settle(page);
  expect(await spreadIds(page)).toEqual([before[0], before[2], before[1], ...before.slice(3)]);
});

test("right-click → duplicate copies the spread's layers and keeps whole sheets", async ({ page }) => {
  await openEditor(page);
  await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
  await strip(page).getByRole("button", { name: "2–3", exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: /Duplicate/ }).click();
  await settle(page);
  expect(await pageCount(page)).toBe(20);
  const layers = await page.evaluate(() => window.__zine?.store.getState().zine?.spreads.map((s) => s.layers.length));
  expect(layers?.slice(1, 4)).toEqual([1, 1, 0]);
});

test("dragging a spread thumbnail reorders the pages", async ({ page }) => {
  await openEditor(page);
  const before = await spreadIds(page);
  const from = await strip(page).getByRole("button", { name: "2–3", exact: true }).boundingBox();
  const to = await strip(page).getByRole("button", { name: "6–7", exact: true }).boundingBox();
  if (!from || !to) throw new Error("thumbnails missing");
  await page.mouse.move(from.x + from.width / 2, from.y + 20);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(from.x + from.width / 2 + ((to.x + to.width * 0.7 - from.x - from.width / 2) * i) / 20, from.y + 20);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await settle(page);
  const after = await spreadIds(page);
  expect(after[0]).toBe(before[0]);
  expect(after.at(-1)).toBe(before.at(-1));
  expect(after.indexOf(before[1])).toBe(3);
});

test("right-clicking a layer row selects it and offers layer actions", async ({ page }) => {
  await openEditor(page);
  const a = await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
  const b = await addRect(page, { x: 120, y: 60, width: 30, height: 20 });
  await select(page, [b]);
  const rows = page.locator("aside").getByRole("listitem");
  await rows.last().click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await settle(page);
  expect((await docLayers(page)).map((l) => l.id)).toEqual([b]);
  void a;
});

test("the page count in Book is editable from any spread, in whole sheets", async ({ page }) => {
  await openEditor(page, 0); // front cover: where you land
  const field = page.locator("aside").getByRole("textbox", { name: "Page count" });
  await field.fill("24");
  await field.press("Enter");
  await settle(page);
  expect(await pageCount(page)).toBe(24);

  await field.fill("30"); // rounds to the nearest four
  await field.press("Enter");
  await settle(page);
  expect(await pageCount(page)).toBe(32);

  await page.locator("aside").getByRole("button", { name: "Remove 4 pages" }).click();
  await settle(page);
  expect(await pageCount(page)).toBe(28);
  await page.locator("aside").getByRole("button", { name: "Add 4 pages" }).click();
  await settle(page);
  expect(await pageCount(page)).toBe(32);

  // The back cover stays last.
  const backId = await page.evaluate(() => window.__zine?.store.getState().zine?.spreads.at(-1)?.id);
  await field.fill("8");
  await field.press("Enter");
  await settle(page);
  expect(await pageCount(page)).toBe(8);
  expect(await page.evaluate(() => window.__zine?.store.getState().zine?.spreads.at(-1)?.id)).toBe(backId);
});
