import { expect, test, type Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { openAccountZine, requireAccount } from "./account";
import { deleteZine, savedTitle } from "./db";
import { addImage } from "./images";

// Account saves that fail, and what the editor says about it. Failures are faked in the browser
// (offline, routed responses), so the server and the local database stay healthy; each test checks
// the document is intact and that it reaches the database once the failure clears.

const ZINE_API = "**/api/zines/*";
const R2 = /r2\.cloudflarestorage\.com/;

let zineId = "";

// Each test signs in through Clerk, some twice; on a busy machine that outruns the default.
test.describe.configure({ timeout: 120_000 });

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

// Account saves fail as a dropped connection until unrouted.
async function holdSaves(page: Page): Promise<void> {
  await page.route(ZINE_API, (route) => (route.request().method() === "PUT" ? route.abort("failed") : route.fallback()));
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

test("signed out mid-edit: Sign in goes through sign-in and back, and the edit is saved", async ({ page }) => {
  // The server rejects the session while Clerk in the browser still thinks it's live.
  await page.route(ZINE_API, (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ status: 401, json: { success: false, error: "Sign in to save" } })
      : route.fallback(),
  );
  await rename(page, "Session ended");
  await openStatus(page);
  await expect(page.getByText("You've been signed out")).toBeVisible();
  expect(await storeTitle(page)).toBe("Session ended");

  await page.unroute(ZINE_API);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
  expect(decodeURIComponent(page.url())).toContain(`/zines/${zineId}`);

  // The test signs in with a ticket, outside Clerk's sign-in form, so follow the redirect the
  // form would take once it finishes.
  const back = new URL(page.url()).searchParams.get("redirect_url") ?? "";
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL ?? "" });
  await page.goto(back);
  await expect(page).toHaveURL(new RegExp(`/zines/${zineId}$`));
  await expect(page.getByRole("textbox", { name: "Zine title" })).toHaveValue("Session ended");
  await expect.poll(() => savedTitle(zineId), { timeout: 15_000 }).toBe("Session ended");
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

test("session ends mid-edit: back from sign-in, the unsaved edit is restored and saved", async ({ page }) => {
  // The edit hasn't reached the server when the session ends (signed out in another tab, or
  // expired). Saves are held throughout, so timing can't let it slip through. Clerk refreshes
  // the page, which sends a signed-out visitor to sign in.
  await holdSaves(page);
  await rename(page, "Kept through sign-in");
  await expect(page.getByRole("button", { name: "Not saved" })).toBeVisible({ timeout: 10_000 });
  await page.evaluate(() => window.Clerk.signOut(() => undefined));
  await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });

  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL ?? "" });
  await page.goto(`/zines/${zineId}`);
  await expect(page.getByRole("textbox", { name: "Zine title" })).toHaveValue("Kept through sign-in");
  // Saves were held the whole time, so this came from the copy kept in the browser. Now let it save.
  await page.unroute(ZINE_API);
  await page.evaluate(() => window.__zine?.store.getState().retrySave());
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => savedTitle(zineId)).toBe("Kept through sign-in");
});

test("session ends right after an undo: the undo is what comes back", async ({ page }) => {
  await rename(page, "First");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
  await rename(page, "Second");
  await expect.poll(() => savedTitle(zineId), { timeout: 10_000 }).toBe("Second");

  await holdSaves(page);
  await page.evaluate(() => window.__zine?.store.getState().undo());
  expect(await storeTitle(page)).toBe("First");
  await expect(page.getByRole("button", { name: "Not saved" })).toBeVisible({ timeout: 10_000 });
  await page.evaluate(() => window.Clerk.signOut(() => undefined));
  await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });

  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL ?? "" });
  await page.goto(`/zines/${zineId}`);
  await expect(page.getByRole("textbox", { name: "Zine title" })).toHaveValue("First");
  // Saves were held the whole time, so this came from the copy kept in the browser. Now let it save.
  await page.unroute(ZINE_API);
  await page.evaluate(() => window.__zine?.store.getState().retrySave());
  await expect.poll(() => savedTitle(zineId), { timeout: 15_000 }).toBe("First");
});

test("deleting an image that won't upload lets the rest save", async ({ page }) => {
  await page.route(R2, (route) => (route.request().method() === "PUT" ? route.fulfill({ status: 403, body: "" }) : route.fallback()));
  const layerId = await addImage(page, 600, 400);
  await openStatus(page);
  await expect(page.getByText("An image didn't upload")).toBeVisible();
  await page.keyboard.press("Escape");

  await rename(page, "Without the photo");
  await page.evaluate((id) => {
    const store = window.__zine?.store.getState();
    store?.select([id]);
    store?.removeSelected();
  }, layerId);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => savedTitle(zineId)).toBe("Without the photo");
});

test("an image missing from this browser says so, offers no Retry, and deleting it unblocks saving", async ({ page }) => {
  await page.route(R2, (route) => (route.request().method() === "PUT" ? route.fulfill({ status: 403, body: "" }) : route.fallback()));
  const layerId = await addImage(page, 600, 400);
  await expect(page.getByRole("button", { name: "Not saved" })).toBeVisible({ timeout: 10_000 });

  // The bytes vanish from this browser before they ever reached storage.
  await page.evaluate(async (id) => {
    const assetId = window.__zine?.store
      .getState()
      .zine?.spreads.flatMap((s) => s.layers)
      .find((l) => l.id === id && l.kind === "image");
    if (!assetId || assetId.kind !== "image") throw new Error("no image layer");
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("zine-builder");
      open.onsuccess = () => {
        const tx = open.result.transaction("blobs", "readwrite");
        tx.objectStore("blobs").delete(assetId.assetId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
    window.__zine?.store.getState().retrySave();
  }, layerId);

  await openStatus(page);
  await expect(page.getByText("An image is missing")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("img", { name: /This image is missing/ })).toBeVisible();

  await page.evaluate((id) => {
    const store = window.__zine?.store.getState();
    store?.select([id]);
    store?.removeSelected();
  }, layerId);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
});
