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

## 2026-09-30 — review fixes
The developer picked both Important findings and Minors 1, 3 and 4 from review.md. I added
Minor 2 as well, because it sits in the same code.

- Important 1 (Sign in did nothing): Clerk's single-session guard hides `openSignIn` while signed
  in, and the popover unmounted the retry effect. "Sign in" now ends the session and goes to
  `/sign-in?redirect_url=<zine>`. The unsaved copy is restored on return. Evidence: e2e "signed
  out mid-edit: Sign in goes through sign-in and back, and the edit is saved". The test signs in
  with a Clerk ticket, so it follows `redirect_url` itself; Clerk's form does that redirect for a
  real user.
- Important 2 (quota reads as saved): `persist.ts` `run()` settles on the transaction's
  `complete`/`abort`, not the request's success. `savePending` failures are typed as storage. The
  storage test now models a real quota error (the request succeeds, then the commit aborts). It
  fails with the old `run()` and passes with the new one.
- Minor 1 (undo lost): undo and redo stamp `updatedAt`. Evidence: e2e "session ends right after
  an undo". It fails without the stamp (the reopened zine shows "Second") and passes with it.
- Minor 2 (clearPending race): the check and the delete now run in one readwrite transaction.
  No dedicated test; the window is too narrow to hit deterministically.
- Minor 3 (no timeout): `loadPending` gives up after 2 s and falls back to the server copy. Not
  verified by a test, because a hung IndexedDB can't be produced reliably in Chromium.
- Minor 4 (upload marker / blocked saves):
  - Only fonts, and images a layer still shows, must upload before a save, so deleting a stuck
    image unblocks saving. The invariant comment in `cloud.ts` is updated; nothing reads unused
    images.
  - A new `missing` reason covers a file that's neither on the device nor uploaded. The popover
    says so without Retry, and the layer marker is informational.
  - Upload text only mentions the layers panel when an image is involved.
  - Evidence: e2e "deleting an image that won't upload lets the rest save" and "an image missing
    from this browser says so, offers no Retry, and deleting it unblocks saving".
- Test robustness, found while the machine was heavily loaded (load average 35–60):
  - The two session-end tests hold account saves (routed as dropped connections) until the zine
    reopens, so a save can't win the race against sign-out. Before this, one of them could pass
    without the fix.
  - Signed-in tests get 120 s each.
  - The 404 "Go home" and "New zine" navigations get 15 s, like the journey test.
- Full suite: 49 passed. `bun run check` clean; `next build` passes.
