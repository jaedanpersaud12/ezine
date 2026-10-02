import { clerkSetup } from "@clerk/testing/playwright";
import { ADMIN_EMAIL, ensureTestUser, ROLE_FLIP_EMAIL } from "./admin";
import { localDbUrl } from "./db";

// Signed-in tests need Clerk's testing token, a test user, and the local database. Without all
// three they skip (see requireAccount in e2e/account.ts); the rest of the suite doesn't care.
export default async function globalSetup(): Promise<void> {
  if (!process.env.E2E_CLERK_USER_EMAIL || !process.env.CLERK_SECRET_KEY || !localDbUrl()) return;
  await clerkSetup();
  // The admin tests' accounts, and a regular user who must not be one.
  await ensureTestUser(ADMIN_EMAIL, true);
  await ensureTestUser(ROLE_FLIP_EMAIL, true);
  await ensureTestUser(process.env.E2E_CLERK_USER_EMAIL, false);
}
