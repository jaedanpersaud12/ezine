import { expect, test, type Page } from "@playwright/test";
import { addRect, openEditor } from "./helpers";

// Failure states that don't need an account: missing pages, crashes inside the editor, and this
// browser refusing to store the draft. Each checks the document survives.

async function docJson(page: Page): Promise<string> {
  return page.evaluate(() => JSON.stringify(window.__zine?.store.getState().zine));
}

async function docTitle(page: Page): Promise<string | undefined> {
  return page.evaluate(() => window.__zine?.store.getState().zine?.title);
}

test("an unknown URL shows the app's own 404 with a way home", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page isn't here." })).toBeVisible();
  await page.getByRole("link", { name: "Go home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("a canvas crash keeps the editor and the document, and the canvas reloads", async ({ page }) => {
  await openEditor(page);
  await addRect(page, { x: 20, y: 20, width: 40, height: 30 });
  const before = await docJson(page);

  await page.evaluate(() => window.__zine?.crash("stage"));
  await expect(page.getByText("The canvas hit a problem.")).toBeVisible();
  expect(await docJson(page)).toBe(before);

  // The rest of the editor still works while the canvas is down.
  await page.getByRole("textbox", { name: "Zine title" }).fill("Still here");
  await expect.poll(() => docTitle(page)).toBe("Still here");
  await page.getByRole("list", { name: "Layers" }).getByLabel("Rect").click();
  await expect.poll(() => page.evaluate(() => window.__zine?.store.getState().selection.length)).toBe(1);

  await page.evaluate(() => window.__zine?.crash("stage", false));
  await page.getByRole("button", { name: "Reload canvas" }).click();
  await expect(page.getByText("The canvas hit a problem.")).toBeHidden();
  await page.waitForFunction(() => Boolean(window.__zine?.stage));
  const after = JSON.parse(await docJson(page)) as { title: string; spreads: unknown };
  const original = JSON.parse(before) as { spreads: unknown };
  expect(after.title).toBe("Still here");
  expect(after.spreads).toEqual(original.spreads);
});

test("a preview crash says so and hands back to the editor with the document intact", async ({ page }) => {
  await openEditor(page);
  await addRect(page, { x: 20, y: 20, width: 40, height: 30 });
  const before = await docJson(page);

  await page.evaluate(() => window.__zine?.crash("preview"));
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Preview couldn't start.")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Back to the editor" }).click();
  await expect(page.getByRole("dialog", { name: "3D preview" })).toBeHidden();
  await page.evaluate(() => window.__zine?.crash("preview", false));

  expect(await docJson(page)).toBe(before);
  await expect(page.getByText("The canvas hit a problem.")).toBeHidden();
});

test("signed out, a browser that refuses the write says it's out of space, and Retry saves", async ({ page }) => {
  // Every IndexedDB write throws while the flag is set, the way a full disk does.
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
      if ((window as { __failWrites?: boolean }).__failWrites) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      return put.apply(this, args);
    };
  });
  await openEditor(page);
  await page.evaluate(() => {
    (window as { __failWrites?: boolean }).__failWrites = true;
  });

  await page.getByRole("textbox", { name: "Zine title" }).fill("Full disk");
  const status = page.getByRole("button", { name: "Not saved" });
  await expect(status).toBeVisible();
  await status.click();
  await expect(page.getByText("This browser is out of space")).toBeVisible();
  expect(await docTitle(page)).toBe("Full disk");

  await page.evaluate(() => {
    (window as { __failWrites?: boolean }).__failWrites = false;
  });
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Saved in this browser")).toBeVisible();

  // It really was written: a reload brings the title back.
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Zine title" })).toHaveValue("Full disk");
});
