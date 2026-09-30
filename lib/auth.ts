// Accounts switch on once Clerk keys are configured. Without them (fresh clone, CI) the app runs
// as the on-device editor only, and nothing calls into Clerk.
export const authEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
