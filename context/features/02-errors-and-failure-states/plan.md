# Plan — 02 Errors and failure states

## What we're building
Route-level error, global-error and not-found pages; `catchError` boundaries around the canvas
and the preview; a typed save failure that the top bar turns into a popover with the reason and
the fix; failed-upload markers on image layers; and a local Postgres (OrbStack) so signed-in
e2e tests can break saves on purpose without touching production.

## Decisions
- **Local database: Postgres 17 plus Neon's local HTTP proxy in `docker-compose.yml`.** `db.ts`
  uses Neon's HTTP driver, which can't talk to plain Postgres; the proxy lets the app code stay as
  it is. `db.ts` points `neonConfig.fetchEndpoint` at the proxy when the host is
  `db.localtest.me`. Ports are 54330 (Postgres) and 4445 (proxy), clear of the other projects'
  containers.
- **The local URL lives in `.env.development.local`**, which Next loads ahead of `.env.local` in
  `next dev` only. Dev and Playwright hit the local database; `next build`/`start` and
  `.env.local` are untouched. The schema is applied with `db/schema.sql`.
- **Boundaries use `catchError` from `next/error`** (stable in 16.3), not a hand-written class.
  The canvas fallback's "Reload canvas" calls `reset()` (client-only state; nothing to re-fetch).
  The document lives in the zustand store outside the boundary, so it survives.
- **Save failures are typed at the source.** `cloud.ts` throws `SaveError` with a reason:
  `offline` (fetch threw while `navigator.onLine` is false), `signed-out` (401), `upload` (an R2
  PUT or presign failed; carries the asset ids), `server` (5xx or anything else); `persist.ts`
  failures become `storage`. The store keeps `saveError` next to `saveState`.
- **The status becomes a button only when there's an error**, opening the existing
  `interior/popover`. Retry calls the same `flush` the autosave uses (exposed through the store
  as `retrySave`). Signed out opens Clerk's sign-in modal in place and retries on success, so
  unsaved edits never leave the page.
- **Failed uploads show on the layer row** (warning icon, tooltip "This image didn't upload") and
  as a line with Retry in the inspector for a selected image. Cleared when a save succeeds.
- **Tests fake failures with Playwright routing** (`page.route` for `/api/zines/*` and the R2
  host, `context.setOffline`) and an init script that makes IndexedDB `put` throw. Crashes use a
  dev-only `window.__zine.crash("stage" | "preview")` hook, like the existing test hooks.
- **Signed-in tests use `@clerk/testing`** with a test user on the development instance; the
  user is created by the developer in the Clerk dashboard.

## Assumptions
- Neon's HTTP proxy image (`ghcr.io/timowilhelm/local-neon-http-proxy`) speaks the protocol the
  installed `@neondatabase/serverless` 1.1 expects. Checked by running the app against it.
- `openSignIn` from Clerk's client hooks can be awaited or observed so the save retries after
  sign-in; if not, retry on the session change.
- Playwright can route the R2 presigned PUT (it's a plain cross-origin fetch).

## How to build it
1. Local DB: compose file, `db.ts` proxy hook, `.env.development.local`, apply schema, run the
   app against it. Document in `AGENTS.md`.
2. `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`.
3. `components/editor/CanvasBoundary.tsx` and `PreviewBoundary.tsx`; wrap `Stage` and the preview
   scene; crash hooks.
4. `SaveError` in `cloud.ts`/`persist.ts`; `saveError`, `retrySave` in the store; `EditorApp`
   records the error and exposes retry.
5. `SaveStatus` component in the top bar with the popover and actions.
6. Failed-upload marker on layer rows and the inspector.
7. `@clerk/testing` setup and `e2e/failures.spec.ts`; the signed-out cases don't need Clerk.
8. Run the full suite, `bun run check`, `next build`.

## Out of scope
- Error tracking (05), conflict handling (04), CI (06), upload limits (03).
