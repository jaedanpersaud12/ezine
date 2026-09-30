# Log — 02 Errors and failure states

## 2026-09-30
- Picked and planned by the agent on the developer's go-ahead ("do whatever you think is best")
  after 06 was parked. Plan treated as confirmed on that basis.
- Local database: `docker-compose.yml` (Postgres 17 + `local-neon-http-proxy`) on 54330/4445, clear
  of the other projects' containers. `db.ts` points `neonConfig.fetchEndpoint` at the proxy when
  the host is `db.localtest.me`; the URL is in `.env.development.local`. Checked with a bun script
  through the Neon driver: `select count(*) from zines` → 0 on the fresh local database.
- `catchError` from `next/error` (stable in 16.3) for the canvas and preview boundaries; error files
  get `retry`, not `reset`, in this version. Canvas fallback uses `reset()` since nothing needs
  re-fetching.
- Save failures are typed (`lib/editor/saveError.ts`): offline, signed-out, upload (with asset ids),
  server, storage. The store keeps `saveError` until a save succeeds, so layer markers survive
  the automatic retries.
- Signed-in tests fake failures in the browser (offline, routed 401/500, routed R2 PUT) so they
  never write to the real bucket, and verify what reached the local database through `e2e/db.ts`,
  which refuses non-local URLs.
- `e2e/journey.spec.ts`: the landing navigation wait went from 5 s to 15 s. With the full suite
  running (now 45 tests, 4 workers) the dev server took longer than 5 s to serve `/`; it passed
  alone and failed twice in full runs before the change.

- Found by the round-trip test: a session ending mid-edit (sign-out in another tab, expiry) makes
  Clerk refresh the page, `auth.protect()` redirects to `/sign-in`, and the edit still waiting on
  the autosave was lost (its exit save got a 401). Fix: account saves write a copy to IndexedDB
  (`pending:<id>`) first and clear it once the server has that version; opening a zine prefers a
  newer pending copy and saves it. Also covers closing the tab while offline. Pending copies of
  zines deleted elsewhere aren't cleaned up; that belongs with 04's cache eviction.

## Evidence
- 404 page: e2e `failures.spec.ts` "an unknown URL shows the app's own 404" (status 404, heading,
  Go home → `/`). Also seen in the browser.
- `error.tsx`: by hand, a temporary `app/boom/page.tsx` that threw showed "Something went wrong."
  with Try again / Go home. Page removed.
- `global-error.tsx`: by hand, a temporary cookie-gated throw in the root layout showed "Zine
  Builder couldn't start." with Try again, title "Something went wrong · Zine Builder". Reverted.
- Canvas crash: e2e "a canvas crash keeps the editor and the document" (title edit and layer
  selection still work while down; Reload canvas brings Fabric back; spreads unchanged).
- Preview crash: e2e "a preview crash says so and hands back to the editor" (document JSON
  identical before and after).
- Storage full (signed out): e2e "a browser that refuses the write says it's out of space" (Retry
  saves; reload keeps the title). Popover also checked in the browser.
- Offline / 401 / 500 / R2 refused: e2e in `saving.spec.ts`, all passing as the Clerk test user
  `e2e+clerk_test@example.com` (created by the developer on the development instance). Each
  also checks the title reached the local database, which proves the dev server is on it.
- Session ending mid-edit: e2e "session ends mid-edit: back from sign-in, the unsaved edit is
  restored and saved". Fails with the restore disabled (title comes back "Untitled zine"),
  passes with it.
- Signed-in tests hit only the local database: enforced by `e2e/db.ts` and `requireAccount()`.
- Full suite: 46 passed, none skipped. `bun run check` clean; `next build` passes.
