# Code Standards

Implementation rules and conventions for the entire project. The AI agent must follow these
in every session without exception. These rules prevent pattern drift across sessions.

_Copied from groundwork's `next16-insforge` template. Fill in the blanks below — the
approved-dependencies list, the tracked-events table, and any project-specific env vars —
as they're decided, not before._

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line
- **Read context files first** — never assume, always verify against `architecture.md` and `project-overview.md`
- **Scope is sacred** — only build what the current feature requires. Never go beyond scope even if it seems helpful
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — simple readable code that a junior developer can understand is always preferred over clever abstractions
- **One thing at a time** — complete one feature fully before touching the next
- **Failures are expected** — wrap agent or background operations in try/catch, log failures, never let one failure crash everything

---

## TypeScript

- Strict mode enabled in `tsconfig.json` — no exceptions
- Never use `any` — use `unknown` and narrow the type
- Never use type assertions (`as SomeType`) unless absolutely necessary and commented why
- All function parameters and return types must be explicitly typed
- Use `type` for object shapes and unions — use `interface` only for extendable component props
- All async functions must have proper error handling — never let promises float unhandled
- Use `const` by default — only use `let` when reassignment is necessary

---

## Next.js 16 Conventions

- App Router only — no Pages Router
- React 19 — use React 19 APIs throughout
- All components are Server Components by default
- Only add `"use client"` when the component requires:
  - `useState` or `useReducer`
  - `useEffect`
  - Browser APIs
  - Event listeners
  - Third-party client-only libraries
- Never add `"use client"` to layout files unless absolutely required
- Data fetching happens in Server Components — never fetch in Client Components directly
- Route handlers live in `app/api/` — never put business logic directly in route handlers
- Request-time protection lives in `proxy.ts` at the project root. Next.js 16 renamed
  Middleware to Proxy — never create `middleware.ts`. Proxy is an optimistic check only;
  pages still read the session themselves
- Any `try/catch` around `cookies()`, `headers()` or `searchParams` in a Server Component
  must call `unstable_rethrow(error)` from `next/navigation` before handling the error
- Server Actions live in `actions/` — never define Server Actions inline in components
- Caching is uncached by default — all dynamic code runs at request time
- Always check the installed Next.js version's own docs before implementing a Next.js
  feature — training-data APIs may differ from what's actually installed

---

## File and Folder Naming

- Folders: kebab-case — e.g. `job-details`
- Component files: PascalCase — e.g. `StatsBar.tsx`
- Utility files: camelCase — e.g. `insforge-client.ts`
- Type files: camelCase — e.g. `index.ts`
- API route files: always `route.ts`
- Server Action files: camelCase, one per resource — e.g. `profile.ts`
- One component per file — never export multiple components from one file
- Index files only in `components/ui/` — never barrel export from other folders
- `components/ui/` — `@ja3dan` registry / shadcn CLI-managed components only

**Registry components use contract tokens, not the registry's own defaults.** If any
component is installed from somewhere other than `@ja3dan` (a second registry, a
copy-pasted source), it ships with that source's own token names or hardcoded colors —
retheme it to this project's contract tokens before committing, the same way any raw color
would be caught by `no-raw-colors`. `@ja3dan` items don't need this pass; they already speak
the contract.

---

## Component Structure

Every component follows this exact order:

```typescript
"use client"; // only if needed

// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { StatsCard } from "@/components/dashboard/stats-card";

// 3. Type definitions
type Props = {
  id: string;
};

// 4. Component
export function ComponentName({ id }: Props) {
  // state
  // derived values
  // handlers
  // return JSX
}
```

- Never use default exports for components — always named exports
- Props type defined directly above the component — not in a separate types file unless shared
- No inline styles — all styling via Tailwind classes using contract tokens (see
  `@ja3dan/tokens/TOKENS.md`)

---

## API Route Handlers

```typescript
// app/api/<resource>/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // validate body
    // do the work
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[<resource>]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every route handler has a try/catch
- Every route handler validates the request body before processing
- Errors are logged with the route path as prefix: `[<resource>]`
- Always return `{ success: boolean, data?: T, error?: string }`
- Never return raw data without the success wrapper

---

## Server Actions

```typescript
// actions/<resource>.ts

"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";

export async function saveResource(formData: ResourceFormData) {
  try {
    const insforge = await createInsforgeServer();
    // validate
    // write to DB
    revalidatePath("/<path>");
    return { success: true };
  } catch (error) {
    console.error("[actions/<resource>]", error);
    return { success: false, error: "Failed to save" };
  }
}
```

- Every Server Action has a try/catch
- Every Server Action returns `{ success: boolean, error?: string }`. It may add optional
  fields the caller needs to recover, never replace these two
- Client components calling an action wrap the call in `try/catch` — a request that never
  reaches the action (offline, server restart, body over the size limit) rejects instead of
  returning, and would otherwise reach the error boundary
- Modules that must never reach the browser start with `import "server-only"` — Next
  handles it without the npm package
- Always call `revalidatePath` after mutations that affect page data
- Never throw from Server Actions — always return the error

---

## Background / Agent Code

If this project has functions that run outside the request/response cycle a component
triggers directly — an AI agent step, a queued job, anything with its own failure mode
that shouldn't take the whole request down with it:

```typescript
// <folder>/<name>.ts

export async function doWork(
  /* params */
): Promise<{ success: boolean; error?: string }> {
  try {
    // implementation
    return { success: true };
  } catch (error) {
    await logFailure(/* ... */, error);
    return { success: false, error: String(error) };
  }
}
```

- Every such function returns `{ success: boolean, error?: string }`
- Every such function has a try/catch — never let one failure crash the run
- Failures are always logged somewhere durable before returning
- This code never imports from `components/` or `actions/`
- This code never uses React hooks or browser APIs

---

## InsForge Client Usage

```typescript
// Browser context — Client Components only
import { insforge } from "@/lib/insforge-client";

// Server context — Server Components, Route Handlers, Server Actions, background code
import { createInsforgeServer } from "@/lib/insforge-server";
const insforge = await createInsforgeServer();

// Reading the session — always this, never a raw getCurrentUser() call
import { getSessionUser } from "@/lib/auth";
const user = await getSessionUser();
```

- Never use the browser client in server context
- Never use the server client in browser context
- Always `await createInsforgeServer()` — it reads cookies asynchronously
- Always scope every query to the current `user_id` — never query without a user filter

---

## Error Handling

- Never use empty catch blocks — always log or handle
- Console errors always include a context prefix: `[component/function name]`
- User-facing errors must be human readable — never expose raw error messages
- Background/agent errors go to a durable log — never surface raw internals to the UI
- API route errors return `status: 500` with a generic message — never expose internals

---

## Tracked Events

_Fill in once analytics are decided — leave this table empty rather than guessing at event
names. All events must use these exact names; never invent one without adding it here
first._

| Event | When | Key Properties |
| --- | --- | --- |
| | | |

---

## Environment Variables

All environment variables defined in `.env.local` for development. Never hardcode any key,
URL, or secret anywhere in the codebase.

| Variable | Used In |
| --- | --- |
| `NEXT_PUBLIC_INSFORGE_URL` | InsForge SSR helpers |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | InsForge SSR helpers |

_Add a row here for every other env var this project introduces, before using it in code._

`NEXT_PUBLIC_` prefix means the variable is exposed to the browser. Never add
`NEXT_PUBLIC_` to secret keys.

The InsForge **anon key** is publishable and user-scoped — it belongs in
`NEXT_PUBLIC_INSFORGE_ANON_KEY`. The InsForge **API key** (from the CLI's project config) is
a full-access admin key: it is for the CLI only and must never appear in app code or in any
`NEXT_PUBLIC_` variable.

`.env.example` documents every required variable and is the one `.env*` file that is
committed.

---

## Import Aliases

Always use the `@/` alias — never use relative imports that go up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { insforge } from "@/lib/insforge-client";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Comments

- No comments explaining what the code does — code must be self-explanatory
- Comments only for why — explaining a non-obvious decision
- Never leave TODO comments in committed code

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:

1. Does `@ja3dan` (or shadcn) already have this component?
2. Does Next.js already provide this functionality?
3. Is there a simpler native solution?

Approved dependencies for this project:

- `@insforge/sdk` — InsForge client (auth, DB, storage). SSR helpers on `/ssr`
- `zod` — Schema validation
- `lucide-react` — Icons
- `tailwindcss` — Styling
- `@ja3dan` registry components — UI primitives, via `bunx shadcn add @ja3dan/<item>`

_Add a row here — with the reason — before installing anything not already on this list._
