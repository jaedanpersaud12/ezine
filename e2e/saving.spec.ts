import { expect, test, type Page } from "@playwright/test";
import { openAccountZine, requireAccount } from "./account";
import { deleteZine, savedTitle } from "./db";
import { addImage } from "./images";

// Account saves that fail, and what the editor says about it. Failures are faked in the browser
// (offline, routed responses), so the server and the local database stay healthy; each test checks
// the document is intact and that it reaches the database once the failure clears.

const ZINE_API = "**/api/zines/*";
const R2 = /r2\.cloudflarestorage\.com/;

let zineId = "";

test.beforeEach(async ({ page }) => {
  requireAccount();
  zineId = await openAccountZine(page);
});

test.afterEach(async () => {
  if (zineId) await deleteZine(zineId);
  zineId = "";
});

async function rename(page: Page, title: string): Promise<void> {
  await page.getByRole("textbox", { name: "Zine title" }).fill(title);
}

async function openStatus(page: Page): Promise<void> {
  const status = page.getByRole("button", { name: "Not saved" });
  await expect(status).toBeVisible({ timeout: 10_000 });
  await status.click();
}

async function storeTitle(page: Page): Promise<string | undefined> {
  return page.evaluate(() => window.__zine?.store.getState().zine?.title);
}

test("offline: says so, keeps the edit, and saves when the connection is back", async ({ page, context }) => {
  await context.setOffline(true);
  await rename(page, "Written on a train");
  await openStatus(page);
  await expect(page.getByText("You're offline")).toBeVisible();
  expect(await storeTitle(page)).toBe("Written on a train");

  await context.setOffline(false);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => savedTitle(zineId)).toBe("Written on a train");
});

test("signed out mid-edit: says so and offers sign-in, without losing the edit", async ({ page }) => {
  await page.route(ZINE_API, (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ status: 401, json: { success: false, error: "Sign in to save" } })
      : route.fallback(),
  );
  await rename(page, "Session ended");
  await openStatus(page);
  await expect(page.getByText("You've been signed out")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  expect(await storeTitle(page)).toBe("Session ended");
});

test("server error: says so, and Retry saves once the server recovers", async ({ page }) => {
  await page.route(ZINE_API, (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ status: 500, json: { success: false, error: "Internal server error" } })
      : route.fallback(),
  );
  await rename(page, "Through the outage");
  await openStatus(page);
  await expect(page.getByText("Couldn't reach the server")).toBeVisible();
  expect(await storeTitle(page)).toBe("Through the outage");

  await page.unroute(ZINE_API);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect.poll(() => savedTitle(zineId)).toBe("Through the outage");
});

test("storage refuses an image: marked on its layer, and Retry uploads and saves", async ({ page }) => {
  // Storage is faked both ways, so the test never writes to the real bucket.
  let refuse = true;
  await page.route(R2, (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ status: refuse ? 403 : 200, body: "" })
      : route.fallback(),
  );
  const layerId = await addImage(page, 600, 400);
  await openStatus(page);
  await expect(page.getByText("An image didn't upload")).toBeVisible();
  await page.keyboard.press("Escape");

  const marker = page.getByRole("button", { name: "This image didn't upload. Retry" });
  await expect(marker).toBeVisible();
  const layers = await page.evaluate(() => window.__zine?.store.getState().zine?.spreads.flatMap((s) => s.layers.map((l) => l.id)));
  expect(layers).toContain(layerId);

  refuse = false;
  await marker.click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(marker).toBeHidden();
});
