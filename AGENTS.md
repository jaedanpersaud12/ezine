<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Local database

`next dev` and the Playwright suite use a local Postgres, never production. It runs in OrbStack
from `docker-compose.yml` (Postgres on 54330, Neon's HTTP proxy on 4445), so `lib/server/db.ts`
keeps using Neon's HTTP driver. The URL lives in `.env.development.local`, which Next loads ahead
of `.env.local` in dev only; `next build` and `next start` still read `.env.local`.

```bash
docker-compose up -d        # OrbStack's binary: /Applications/OrbStack.app/Contents/MacOS/xbin
```

`db/schema.sql` is applied when the volume is first created. After changing it, apply it by hand
or reset with `docker-compose down -v && docker-compose up -d`.

Signed-in e2e tests (`e2e/saving.spec.ts`) also need a Clerk test user on the development
instance: set `E2E_CLERK_USER_EMAIL` in `.env.development.local`. Without it, or without the
local database, they skip. `e2e/db.ts` refuses any database but the local one.

# Admin

`/admin` lists every user (from Clerk) with their saved zines (from Neon) and opens any zine in a
read-only 3D viewer. It is for accounts whose Clerk `publicMetadata.role` is `"admin"`; everyone
else gets the 404 page, and `/api/admin/*` answers 404 too. The role is read from Clerk on the
server for every request (`lib/server/admin.ts`), so removing it works immediately. Nothing under
`/admin` writes. The viewer fetches images through `GET /api/admin/assets/[id]` and never stores
them in the browser.

Grant it from the Clerk dashboard (Users → the user → Public metadata → `{ "role": "admin" }`), or
with the backend API:

```ts
await clerkClient.users.updateUserMetadata(userId, { publicMetadata: { role: "admin" } });
```

Roles belong to a Clerk *instance*: the development and production instances have different user
ids, so set it again when production moves to its own instance (build-plan 01).

The admin e2e tests (`e2e/admin.spec.ts`) create their own accounts (`e2e-admin+clerk_test@…`,
`e2e-admin2+clerk_test@…`) in global setup and make sure the regular test user has no role. The
viewer test doesn't wait for the 3D book to finish drawing: under headless software GL its render
loop saturates the CPU and every later check crawls.
