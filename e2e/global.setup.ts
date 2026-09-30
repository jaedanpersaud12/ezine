import { clerkSetup } from "@clerk/testing/playwright";
import { localDbUrl } from "./db";

// Signed-in tests need Clerk's testing token, a test user, and the local database. Without all
// three they skip (see signedIn in e2e/account.ts); the rest of the suite doesn't care.
export default async function globalSetup(): Promise<void> {
  if (!process.env.E2E_CLERK_USER_EMAIL || !process.env.CLERK_SECRET_KEY || !localDbUrl()) return;
  await clerkSetup();
}
