import { expect, test, type Page } from "@playwright/test";
import { addRect, docLayers, openEditor, select, settle } from "./helpers";

// Floating UI (dropdowns, tooltips, popovers) must never take space in, resize, scroll or shift
// the panel that opened it. They render in a portal at the end of <body>.

type Layout = { rect: string; scrollH: number; scrollW: number; scrollTop: number };

async function sidebarLayout(page: Page): Promise<Layout> {
  return page.evaluate(() => {
    const aside = document.querySelector("aside");
    const scroller = aside?.querySelector(".overflow-y-auto");
    if (!aside || !scroller) throw new Error("no sidebar");
    const r = aside.getBoundingClientRect();
    return {
      rect: [r.x, r.y, r.width, r.height].map(Math.round).join(","),
      scrollH: scroller.scrollHeight,
      scrollW: scroller.scrollWidth,
      scrollTop: scroller.scrollTop,
    };
  });
}

async function insideAside(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => Boolean(document.querySelector(sel)?.closest("aside")), selector);
}

test("opening a dropdown in the sidebar leaves the sidebar untouched", async ({ page }) => {
  await openEditor(page);
  const id = await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
  await select(page, [id]);
  const before = await sidebarLayout(page);

  await page.locator("aside").getByRole("button", { name: /^Blend/ }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await settle(page);
  expect(await sidebarLayout(page)).toEqual(before);
  expect(await insideAside(page, '[role="listbox"]')).toBe(false);

  await page.getByRole("option", { name: /Multiply/ }).click();
  await settle(page);
  expect((await docLayers(page))[0]).toBeTruthy();
  const blend = await page.evaluate(() => {
    const s = window.__zine?.store.getState();
    return s?.zine?.spreads[s.spreadIndex].layers[0].blend;
  });
  expect(blend).toBe("multiply");
  expect(await sidebarLayout(page)).toEqual(before);
});

test("a dropdown near the bottom of the screen opens upwards, fully visible", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await openEditor(page);
  const id = await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
  await select(page, [id]);
  const blend = page.locator("aside").getByRole("button", { name: /^Blend/ });
  await blend.scrollIntoViewIfNeeded();
  await blend.click();
  const box = await page.getByRole("listbox").boundingBox();
  expect(box).toBeTruthy();
  if (box) expect(box.y + box.height).toBeLessThanOrEqual(700);
});

test("colour popovers and tooltips float outside the layout", async ({ page }) => {
  await openEditor(page);
  const id = await addRect(page, { x: 60, y: 60, width: 30, height: 20 });
  await select(page, [id]);
  const before = await sidebarLayout(page);

  await page.locator("aside").getByRole("button", { name: /#1A1A1A/i }).first().click();
  await expect(page.getByRole("dialog", { name: "Fill" })).toBeVisible();
  expect(await insideAside(page, '[role="dialog"]')).toBe(false);
  expect(await sidebarLayout(page)).toEqual(before);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Rectangle" }).hover();
  await expect(page.getByRole("tooltip").first()).toBeVisible();
  const inToolbar = await page.evaluate(() => Boolean(document.querySelector('[role="tooltip"]')?.closest("[aria-label='Rectangle']")?.parentElement));
  expect(inToolbar).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
