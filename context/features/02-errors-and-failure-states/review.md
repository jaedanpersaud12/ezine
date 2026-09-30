# Review — 02 Errors and failure states

_Reviewed 2026-09-30 against spec.md and plan.md, by a subagent that saw only the spec, plan,
log, rules and diff. Cheap checks first: `bun run check` clean, `next build` passes, full
Playwright suite 46 passed. The two Important findings were spot-checked afterwards: Clerk's
`isSignedInAndSingleSessionModeEnabled` guard (`@clerk/shared` componentGuards) hides the sign-in
modal while signed in, and `persist.ts` `run()` resolves on the request's `onsuccess`, not the
transaction's `complete`._

## Layer 1 — Spec alignment
**ISSUES**

- [x] 404 with a way home — met, `e2e/failures.spec.ts:15`.
- [x] `error.tsx` / `global-error.tsx` — met by hand (log.md), as the criterion allows; the `retry` prop matches the 16.3 docs.
- [x] Canvas crash — met, `e2e/failures.spec.ts:23`.
- [x] Preview crash — met, `e2e/failures.spec.ts:48`.
- [x] Offline — met, `e2e/saving.spec.ts:40`.
- [ ] 401 shows "You've been signed out" with a sign-in action that opens Clerk in place — **not met**. The test never clicks the button, and in the reachable state `openSignIn` is a no-op (Important 1).
- [x] Session ending mid-edit — met, `e2e/saving.spec.ts:106`; fails with the restore disabled.
- [x] 500 — met, `e2e/saving.spec.ts:65`, including the database check.
- [x] R2 refused — met, `e2e/saving.spec.ts:82`, though it doesn't check the database after "Saved".
- [ ] IndexedDB quota — **met only against a faked failure**. The test makes `put` throw synchronously, but real quota errors abort the transaction at commit (Important 2).
- [~] Store document intact after every failure — partly. The crash tests compare the whole document; the signed-in tests compare only the title.
- [x] Signed-in tests use only local Postgres — met for the test process (`e2e/db.ts:10`); the app server isn't guarded (Minor 6).

Built but not planned, all justified and logged:
- the pending-copy mechanism;
- the preview render-failure state;
- the 15 s journey timeout.

## Layer 2 — System integrity
**ISSUES** (minor)

- Tokens are clean, and Popover and Button are reused.
- The layer-row marker uses a native `title` instead of the project Tooltip that plan.md named.
- `as` casts without a reason comment:
  - `e2e/db.ts:22,28`;
  - the casts in `e2e/failures.spec.ts`;
  - `lib/editor/cloud.ts:26`.
- `console.error(error)` has no context prefix in `app/error.tsx:17` and `app/global-error.tsx:21`.
- The new dev dependency `@clerk/testing` and the undeclared `@next/env` import in `playwright.config.ts` aren't in code-standards' dependency list.
- The local host and proxy port are defined twice (`lib/server/db.ts:12-13`, `e2e/db.ts:7,18`).
- Stale comment: `e2e/global.setup.ts:5` names `signedIn`, but the function is `requireAccount`.
- The `db.ts` proxy override is keyed on `db.localtest.me` only, so it can't reach production.

## Layer 3 — Production readiness
**ISSUES**

The error classification in `cloud.ts` holds up:
- a 401 on the asset POST is reported as signed out;
- offline wins over upload;
- failed uploads are retried.

`setSaveState` semantics, the `retrySave` lifecycle and `useTestCrash` are sound. Two real defects are below, plus smaller gaps in the pending copy.

## Findings

### Critical — breaks something for a real user, or violates an invariant
None.

### Important — should be fixed before merge

1. **"Sign in" in the signed-out popover does nothing, and the retry-after-sign-in effect never runs**
   - Where: `components/editor/SignInAgainButton.tsx:12-33`, `components/editor/SaveStatus.tsx:78`.
   - When the popover is reachable: only while Clerk's client still holds a session (the server rejected the token). When the client knows the session ended, the page redirects to `/sign-in` instead.
   - Why the button fails there: in single-session mode `openSignIn` is suppressed while signed in.
   - Why the retry never runs: the button lives inside popover content that unmounts on outside pointerdown, so its effect is gone before any sign-in would finish.
   - Scenario: a user clicks "Sign in" and nothing happens. Only the 5 s retry timer can recover.
   - The e2e never clicks the button.

2. **A real "out of space" failure likely reads as "Saved"**
   - Where: `lib/editor/persist.ts:28-35`, test at `e2e/failures.spec.ts:64-72`.
   - Why: `run()` resolves on the request's success. Quota errors abort the transaction at commit, after that.
   - Scenario: a signed-out user with a full disk sees "Saved in this browser", closes the tab, and loses the work.
   - Also affected: `savePending`, which the session-end protection depends on.

### Minor — worth knowing, fine to ship

1. **The pending copy's freshness is judged by `updatedAt`, which doesn't always move forward**
   - Where: `persist.ts:84,95`.
   - Undo restores an older `updatedAt`, so an undo made just before losing the session is discarded on reload.
   - Clock skew between devices can silently decide which copy wins. Real conflict handling belongs to 04.

2. **`clearPending` can delete a newer copy**
   - Where: `persist.ts:92-97` with `EditorApp.tsx:112-115`.
   - Why: its read and delete run in separate transactions, and the exit save runs outside the save queue.
   - Scenario: in a narrow window, it deletes a newer pending copy that was written between the two.

3. **Opening an account zine waits on IndexedDB with no timeout**
   - Where: `EditorApp.tsx:64-74`.
   - Scenario: a hung `indexedDB.open` leaves a blank canvas forever.

4. **The upload popover can point at a marker that isn't there**
   - Where: `SaveStatus.tsx:33-37`, `cloud.ts:71-79`.
   - Assets stay in `zine.assets` after their layer is deleted, so deleting the image layer doesn't unblock saves, and then no layer is marked.
   - Failed fonts never get a marker at all.
   - "Missing from this device" is permanent, so "check your connection" is the wrong advice.

5. **Pending copies outlive sign-out**
   - Where: `persist.ts:76-78`.
   - They're keyed only by zine id, so the next person using the same browser profile could read them from IndexedDB, though not open them in the app.
   - Nothing ever cleans them up.

6. **The local-database guard covers the test process, not the dev server**
   - Where: `playwright.config.ts` (`reuseExistingServer: true`).
   - Scenario: an already-running server with a different `DATABASE_URL` would get the tests' writes.

7. **`CanvasBoundary` only catches errors in render and effects**
   - Fabric errors in event handlers or animation frames, and a WebGL context lost later, bypass it.

8. **The signed-in tests assert less of the document than the criterion says**
   - Where: `e2e/saving.spec.ts:40-104`.
   - They compare only the title, and the R2 test doesn't check the database at the end.

9. **`docker-compose.yml:16` uses the unpinned `local-neon-http-proxy:main` image**
   - A later push to that tag could break local dev and e2e without warning.

## Outcome (2026-09-30)
- Fixed: Important 1 and 2; Minors 1, 2, 3 and 4. Details and evidence are in log.md.
- Not fixed, by the developer's triage: Minors 5–9 and the Layer 2 notes (native `title` on the
  marker, uncommented `as` casts, unprefixed console errors, dependency list, duplicated
  local-host constants, stale comment in `e2e/global.setup.ts`).
