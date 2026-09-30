import { expect, test } from "@playwright/test";

// The signed-out path through the site: front door, a zine saved in this browser, and the way
// back to it. (Signing in hands off to Clerk, so the test stops at the modal.)

test("landing → start a zine → it saves in this browser → continue it from the landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Make a zine in your browser." })).toBeVisible();
  await page.getByRole("link", { name: "Start a zine" }).click();

  await expect(page).toHaveURL(/\/new$/);
  const title = page.getByRole("textbox", { name: "Zine title" });
  await expect(title).toHaveValue("Untitled zine");
  await title.fill("Night Shift");
  await expect(page.getByText("Saved in this browser")).toBeVisible();

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: "Continue your zine" }).click();
  await expect(page.getByRole("textbox", { name: "Zine title" })).toHaveValue("Night Shift");
});

test("an edit made just before leaving the editor is still there when you come back", async ({ page }) => {
  await page.goto("/new");
  const title = page.getByRole("textbox", { name: "Zine title" });
  await expect(title).toHaveValue("Untitled zine");
  await title.fill("Left in a hurry");
  // Straight out, inside the autosave delay.
  await page.getByRole("link", { name: "Home" }).click();
  await page.getByRole("link", { name: "Continue your zine" }).click();
  await expect(page.getByRole("textbox", { name: "Zine title" })).toHaveValue("Left in a hurry");
});

test("signing in from the editor opens Clerk without leaving the zine", async ({ page }) => {
  await page.goto("/new");
  await expect(page.getByRole("textbox", { name: "Zine title" })).toHaveValue("Untitled zine");
  await page.getByRole("button", { name: "Sign in to save" }).click();
  await expect(page.getByRole("heading", { name: /sign in to/i })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/new$/);
});

test("account pages send signed-out visitors to sign in", async ({ page }) => {
  await page.goto("/zines/00000000-0000-4000-8000-000000000000");
  await expect(page).toHaveURL(/\/sign-in/);
});
