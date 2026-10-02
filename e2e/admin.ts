import { expect, test, type Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import { localDbUrl } from "./db";

// Test accounts for the admin area. Global setup makes sure they exist on Clerk's development
// instance (+clerk_test addresses never get email). ADMIN is for read-only tests, ROLE_FLIP is the
// one whose role a test removes, and the regular test user (E2E_CLERK_USER_EMAIL) must have none.
export const ADMIN_EMAIL = "e2e-admin+clerk_test@example.com";
export const ROLE_FLIP_EMAIL = "e2e-admin2+clerk_test@example.com";

export function requireAdminTests(): void {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !process.env.CLERK_SECRET_KEY || !localDbUrl(),
    "Admin tests need the Clerk test user, CLERK_SECRET_KEY and the local database (see AGENTS.md)",
  );
}

export function clerkBackend(): ReturnType<typeof createClerkClient> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set");
  return createClerkClient({ secretKey });
}

// Finds the user, creating them if there's none, and sets (or clears) their admin role.
export async function ensureTestUser(email: string, admin: boolean): Promise<string> {
  const clerk = clerkBackend();
  const { data } = await clerk.users.getUserList({ emailAddress: [email] });
  const user = data[0] ?? (await clerk.users.createUser({ emailAddress: [email], skipPasswordRequirement: true }));
  const isAdmin = user.publicMetadata.role === "admin";
  if (admin && !isAdmin) await clerk.users.updateUserMetadata(user.id, { publicMetadata: { role: "admin" } });
  if (!admin && user.publicMetadata.role !== undefined) await clerk.users.updateUserMetadata(user.id, { publicMetadata: { role: null } });
  return user.id;
}

export async function setRole(userId: string, role: "admin" | null): Promise<void> {
  await clerkBackend().users.updateUserMetadata(userId, { publicMetadata: { role } });
}

export async function userIdOf(email: string): Promise<string> {
  const { data } = await clerkBackend().users.getUserList({ emailAddress: [email] });
  expect(data, `no Clerk user for ${email}`).toHaveLength(1);
  return data[0].id;
}

export async function signInAs(page: Page, email: string): Promise<void> {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
}
