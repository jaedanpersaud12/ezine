# 02 Errors and failure states

## What
The app gets its own error, global-error and 404 pages. The editor canvas and the 3D preview
each sit behind an error boundary, so a Fabric or WebGL crash leaves the rest of the editor
working and the document untouched. "Not saved" becomes something you can act on: it says why
(offline, signed out, an image didn't upload, the server failed, this browser is out of space)
and offers the fix, and an image that failed to upload is marked on its layer.

## Why
Today a render crash blanks the page and a failed save shows two words with no way to learn why
or do anything about it. People are about to trust this app with work they care about; the worst
thing it can do is lose that work silently or leave them staring at a white screen.

## Done when
- [ ] Visiting a URL that doesn't exist shows the app's own 404 page with a way home.
- [ ] A thrown error in a page renders `app/error.tsx` in the app's style with "Try again"; an
      error in the root layout renders `app/global-error.tsx` (checked by hand with a dev-only
      trigger, then removed or kept dev-only).
- [ ] A thrown error inside the canvas shows a fallback in the canvas area with "Reload canvas";
      the top bar, layers panel and sidebar keep working, and the document is unchanged (e2e).
- [ ] A thrown error in the 3D preview shows "Preview couldn't start" with a way back to the
      editor, and the document is unchanged (e2e).
- [ ] Signed in and offline, the save status reads "Not saved"; clicking it says you're offline
      and saves resume on reconnect (e2e).
- [ ] Signed in, a 401 from the save endpoint shows "You've been signed out" with a Sign in
      action that goes through sign-in and back to the zine, where the edit is restored and
      saved (e2e). *Amended after review: Clerk won't open sign-in over a session it still
      thinks is live, so "in place" wasn't possible.*
- [ ] A session that really ends mid-edit (Clerk redirects to sign-in) loses nothing: after
      signing back in, the unsaved edit is restored and saved (e2e). *Amended during the build:
      the original criterion assumed the page stays put, but Clerk redirects.*
- [ ] Signed in, a 500 shows "Couldn't reach the server" with Retry, and Retry saves once the
      server recovers (e2e).
- [ ] Signed in, R2 refusing an image PUT shows "An image didn't upload" in the popover and a
      warning on that image's layer with Retry; Retry after R2 recovers saves (e2e).
- [ ] Signed out, IndexedDB refusing a write (quota) shows "This browser is out of space" (e2e).
- [ ] After every failure above, the document in the store matches what it was before the
      failure plus the edits made (asserted in the e2e tests).
- [ ] Signed-in e2e tests run against a local Postgres in OrbStack, never the production database.

App-ui criteria don't apply: no new signed-in screen or table.

## Out of scope
- Error tracking and alerts (05); errors still go to the console.
- Version conflicts between tabs (04).
- CI (06 is parked); the new tests run locally.
- Upload size and type limits (03).
