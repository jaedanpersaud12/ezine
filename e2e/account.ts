import { expect, test, type Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { localDbUrl } from "./db";

// Skips the calling test unless signed-in testing is set up: a Clerk test user
// (E2E_CLERK_USER_EMAIL, on the development instance) and the local database.
export function requireAccount(): void {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !localDbUrl(),
    "Signed-in tests need E2E_CLERK_USER_EMAIL and the local database (see AGENTS.md)",
  );
}

// Signs in as the test user and opens a new zine in the account. Returns its id.
export async function openAccountZine(page: Page): Promise<string> {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) throw new Error("E2E_CLERK_USER_EMAIL is not set");
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/");
  await page.getByRole("button", { name: "New zine" }).click();
  // Creating the zine is a server action plus a server-rendered page; slow when the suite is busy.
  await expect(page).toHaveURL(/\/zines\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  await page.waitForFunction(() => Boolean(window.__zine?.stage && window.__zine.store.getState().zine));
  return page.url().split("/").at(-1) ?? "";
}
