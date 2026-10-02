import { expect, test, type Page } from "@playwright/test";
import { openAccountZine } from "./account";
import { ADMIN_EMAIL, requireAdminTests, ROLE_FLIP_EMAIL, setRole, signInAs, userIdOf } from "./admin";
import { deleteAssets, deleteZine, zineDoc } from "./db";
import { addImage } from "./images";

// The owner's area: who can reach it, what it lists, and that it can't change anything. Admin and
// non-admin test accounts come from global setup; the zine being looked at is made by the regular
// test user through the real editor, with storage faked.

const BASE = `http://localhost:${process.env.PORT ?? 3217}`;
const R2 = /r2\.cloudflarestorage\.com/;
const NOT_FOUND = "This page isn't here.";
// Unique per run, so zines left behind by an earlier run can't be mistaken for this one.
const TITLE = `Admin visible zine ${crypto.randomUUID().slice(0, 6)}`;
// A 1 x 1 PNG, standing in for the stored image.
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// Each test signs in through Clerk first; on a busy machine that outruns the default.
test.describe.configure({ timeout: 120_000 });

let zineId = "";
let regularUserId = "";
let assetId = "";

test.beforeAll(async ({ browser }) => {
  requireAdminTests();
  // Signing in and making a zine, on a machine that may be busy.
  test.setTimeout(240_000);
  const page = await browser.newPage({ baseURL: BASE });
  await page.route(R2, (route) => (route.request().method() === "PUT" ? route.fulfill({ status: 200, body: "" }) : route.fallback()));
  zineId = await openAccountZine(page);
  regularUserId = await page.evaluate(() => window.Clerk.user?.id ?? "");
  await page.getByRole("textbox", { name: "Zine title" }).fill(TITLE);
  await addImage(page, 600, 400);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 30_000 });
  assetId = await page.evaluate(() => Object.keys(window.__zine?.store.getState().zine?.assets ?? {})[0]);
  await page.close();
});

test.afterAll(async () => {
  if (assetId) await deleteAssets([assetId]);
  if (zineId) await deleteZine(zineId);
});

async function expectNotFound(page: Page, path: string): Promise<void> {
  const res = await page.goto(path);
  expect(res?.status(), path).toBe(404);
  await expect(page.getByRole("heading", { name: NOT_FOUND })).toBeVisible();
}

test("signed out, every admin page sends the visitor to sign in", async ({ page }) => {
  requireAdminTests();
  for (const path of ["/admin", `/admin/users/${regularUserId}`, `/admin/users/${regularUserId}/zines/${zineId}`]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/sign-in/);
  }
});

test("a signed-in user without the role gets 404s, and never sees an Admin link", async ({ page }) => {
  await signInAs(page, process.env.E2E_CLERK_USER_EMAIL ?? "");
  for (const path of ["/admin", `/admin/users/${regularUserId}`, `/admin/users/${regularUserId}/zines/${zineId}`]) {
    await expectNotFound(page, path);
  }
  expect((await page.request.get(`/api/admin/assets/${assetId}`)).status()).toBe(404);

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Your zines" }).or(page.getByRole("heading", { name: "Your zines" })).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);
});

test("signed out, the admin asset route is a 404 too", async ({ request }) => {
  requireAdminTests();
  expect((await request.get(`/api/admin/assets/${crypto.randomUUID()}`)).status()).toBe(404);
});

test("an admin sees the users, with figures, a way in from the library, and a table of fixed height", async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL);
  await page.goto("/");
  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await expect(page.getByRole("heading", { name: "Users", exact: true, level: 1 })).toBeVisible();
  for (const label of ["Users", "Zines", "Storage", "New users"]) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/have saved a zine/)).toBeVisible();
  await expect(page.getByText(/joined in the last 7 days/)).toBeVisible();

  // The regular test user made a zine, so their row says so.
  await page.getByRole("searchbox", { name: "Search users" }).fill(process.env.E2E_CLERK_USER_EMAIL ?? "");
  await page.getByRole("button", { name: "Search" }).click();
  const row = page.getByRole("row", { name: new RegExp((process.env.E2E_CLERK_USER_EMAIL ?? "").replace(/[+.]/g, "\\$&")) });
  await expect(row).toBeVisible();
  expect(Number(await row.getByRole("cell").nth(4).innerText())).toBeGreaterThanOrEqual(1);
  await page.screenshot({ path: "test-results/admin-users.png", fullPage: true });

  // The card is as tall with one row, or none, as with a full page.
  const height = async (path: string): Promise<number> => {
    await page.goto(path);
    await expect(page.locator('[data-slot="table-card"]')).toBeVisible();
    return (await page.locator('[data-slot="table-card"]').boundingBox())?.height ?? 0;
  };
  const full = await height("/admin");
  // Within a pixel: sub-pixel rounding of the row heights.
  expect(Math.abs((await height("/admin?q=e2e-admin2")) - full)).toBeLessThanOrEqual(1);
  expect(Math.abs((await height("/admin?q=zzzzzz-no-such-user")) - full)).toBeLessThanOrEqual(1);
  await expect(page.getByText("No one matches that search")).toBeVisible();
});

test("search narrows the list, and clearing it brings everyone back", async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL);
  await page.goto("/admin");
  await page.getByRole("searchbox", { name: "Search users" }).fill("e2e-admin2");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=e2e-admin2/);
  await expect(page.getByRole("row", { name: new RegExp(ROLE_FLIP_EMAIL.replace(/[+.]/g, "\\$&")) })).toBeVisible();
  await expect(page.getByRole("row", { name: /e2e\+clerk_test@example\.com/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Clear search" }).first().click();
  await expect(page).toHaveURL(/\/admin$/);
});

test("an admin opens a user and sees their zines, and a user with none gets an explained empty state", async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL);
  await page.goto(`/admin/users/${regularUserId}`);
  const row = page.getByRole("row", { name: new RegExp(TITLE) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("148 × 210 mm");
  await page.screenshot({ path: "test-results/admin-user.png", fullPage: true });

  await page.goto(`/admin/users/${await userIdOf(ADMIN_EMAIL)}`);
  await expect(page.getByText("No saved zines")).toBeVisible();
  await expect(page.locator('[data-slot="table-card"]')).toBeVisible();
});

test("an admin reads any zine in a viewer with no editing UI, and nothing lands in their browser storage", async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL);
  let assetCalls = 0;
  await page.route("**/api/admin/assets/*", (route) => {
    assetCalls += 1;
    return route.fulfill({ json: { success: true, data: { url: PIXEL } } });
  });

  await page.goto(`/admin/users/${regularUserId}`);
  await page.getByRole("link", { name: new RegExp(`View ${TITLE}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/zines/${zineId}$`));
  await expect(page.getByRole("heading", { name: TITLE, level: 1 })).toBeVisible();
  await expect(page.getByText("Read-only")).toBeVisible();

  const viewer = page.getByTestId("zine-viewer");
  await expect(viewer.locator("canvas")).toBeVisible({ timeout: 60_000 });
  expect(assetCalls).toBeGreaterThanOrEqual(1);

  // None of the editor: no title field, no tools, no inspector.
  await expect(page.getByRole("textbox", { name: "Zine title" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Rectangle" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Preview" })).toHaveCount(0);

  // The viewed image isn't in this browser's blob store.
  const stored = await page.evaluate(async (id) => {
    const dbs = await indexedDB.databases();
    if (!dbs.some((d) => d.name === "zine-builder")) return [] as string[];
    return new Promise<string[]>((resolve, reject) => {
      const open = indexedDB.open("zine-builder");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        if (!open.result.objectStoreNames.contains("blobs")) return resolve([]);
        const req = open.result.transaction("blobs").objectStore("blobs").getAllKeys();
        req.onsuccess = () => resolve(req.result.map(String).filter((k) => k === id));
      };
    });
  }, assetId);
  expect(stored).toEqual([]);
  await page.screenshot({ path: "test-results/admin-viewer.png" });
});

test("the admin asset route gives a signed URL for any user's asset, to admins only, and only by GET", async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL);
  const ok = await page.request.get(`/api/admin/assets/${assetId}`);
  expect(ok.status()).toBe(200);
  expect(((await ok.json()) as { data: { url: string } }).data.url).toContain("X-Amz-Signature");
  expect((await page.request.get(`/api/admin/assets/${crypto.randomUUID()}`)).status()).toBe(404);
  expect((await page.request.get("/api/admin/assets/not-a-uuid")).status()).toBe(404);

  for (const method of ["put", "post", "delete", "patch"] as const) {
    expect((await page.request[method](`/api/admin/assets/${assetId}`, { data: {} })).status(), method).toBe(405);
  }
});

test("an admin still can't write to someone else's zine through the normal route", async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL);
  const doc = await zineDoc(zineId);
  expect(doc).not.toBeNull();
  const res = await page.request.put(`/api/zines/${zineId}`, { data: { ...doc, title: "Changed by an admin" } });
  expect(res.status()).toBe(404);
  expect((await zineDoc(zineId))?.title).toBe(TITLE);
});

test("taking the role away locks the user out on their next request", async ({ page }) => {
  const id = await userIdOf(ROLE_FLIP_EMAIL);
  await signInAs(page, ROLE_FLIP_EMAIL);
  try {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Users", exact: true, level: 1 })).toBeVisible();

    await setRole(id, null);
    await expectNotFound(page, "/admin");
    expect((await page.request.get(`/api/admin/assets/${assetId}`)).status()).toBe(404);
  } finally {
    await setRole(id, "admin");
  }
});
