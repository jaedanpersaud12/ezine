# Build plan: production push

Where Zine Builder stands on 2026-09-30, and the numbered features that take it to a
product people can sign up for, make a zine in, print, and share. `/feature start NN` reads
this file; each feature gets its own branch (`feat/NN-slug`) and folder under `features/`.

## Where things stand

Working today, and live at ezine.jaedan.me:

- Editor: text, image, shape, line and draw tools; layers panel; inspector; guides and sticky
  snapping; undo/redo; pages and spreads (saddle stitch or unbound); page numbers; uploaded fonts;
  image filters; command menu; 3D preview of the real pages.
- Accounts: Clerk sign-in, zines in Neon, images and fonts in R2 via presigned URLs.
- Journey: landing, then `/new` (signed-out editor, saved in the browser), then "Sign in to save",
  which moves the draft into the account and back into the same zine. Library at `/` when signed in.
- 37 Playwright tests (33 editor, 4 journey). `next build` passes.

Known problems found while building the above (each is assigned to a feature below):

| Problem | Feature |
| --- | --- |
| Clerk runs on development keys in production ("Development mode" badge, user cap) and the app is named "zine-builder" in the sign-in modal | 01 |
| No `error.tsx`, `global-error.tsx` or custom 404; a Fabric or WebGL crash blanks the page | 02 |
| A failed save only shows "Not saved"; there's no way to see why or act on it | 02 |
| Uploads are stored at full size (11 MB PNGs seen in testing) and drawn at full size on the canvas | 03 |
| Presigned PUTs don't bind size or type, so the declared size isn't enforced | 03 |
| An asset row is written before its upload; a failed PUT leaves an orphan row (seen in testing) | 03 |
| No per-user storage limit and no rate limit on the API | 03 |
| Two tabs or devices editing one zine: last write silently wins | 04 |
| The IndexedDB blob cache grows forever | 04 |
| No error tracking or analytics, so production failures are invisible | 05 |
| No CI; commits land on `main` as "."; schema changes are applied by hand | 06 |
| Default favicon, no Open Graph card, create-next-app README and `public/` SVGs, a public `/reader` spike page | 07 |
| No privacy policy or terms, though accounts now store people's work | 07 |
| No way to get a zine out: no PDF, no print imposition | 08 |
| No way to show a zine to anyone else | 09 |
| Library cards show a colour swatch, not the cover; no rename or duplicate | 10 |
| No image crop or frame fit, and the low-dpi check isn't surfaced | 11 |
| The landing book shows numbered placeholder pages ("VERSO", "RECTO") | 13 |
| The editor is unusable on a phone and doesn't say so | 15 |
| R2 CORS lists localhost ports 3000–3010 and 3217 by hand; a dev server on another port can't load images | 06 |
| The app is light-only (the token theme has no dark values) | Later |

## Order

Phase A makes it safe to invite people. Phase B makes it worth inviting them. Phase C makes
it feel finished. Phase D is the launch itself. Inside a phase, the order is a recommendation;
the dependencies are called out where they're real.

---

## Phase A: safe to invite people

### 01 Production auth

Move Clerk to a production instance on ezine.jaedan.me.

- `clerk deploy` for ezine.jaedan.me: DNS records, production keys into Vercel (production
  environment only; previews keep development keys).
- Rename the Clerk application to "Zine Builder"; pick the sign-in methods (Google plus email
  code is the likely set) and configure Google OAuth with our own credentials.

Done when: signing up on ezine.jaedan.me shows no "Development mode" badge; Google and email
both work; a draft made signed out lands in the new account after sign-up.

### 02 Errors and failure states

Nothing should ever leave someone on a blank screen or wondering whether their work is safe.

- `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` in the app's own style.
- An error boundary around the editor canvas and the 3D preview, so a Fabric or WebGL failure
  keeps the rest of the editor usable and the document intact.
- Save status you can act on: "Not saved" opens a small popover saying why (offline, sign-in
  expired, upload failed) with Retry. Sign-in expiry sends you to sign in and back.
- Upload errors surface on the layer ("This image didn't upload. Retry").

Done when: each failure (offline, 401, 500, R2 refusing a PUT, a thrown render) is triggered in
a test or by hand and shows its specific message, and the document is unchanged afterwards.

### 03 Upload pipeline and limits

Images arrive huge and are trusted blindly.

- Client-side resize on import: keep enough pixels for 300 dpi at the largest size it could be
  printed (the spread), cap the long edge (around 6000 px), re-encode JPEG/WebP where it makes
  no visible difference, keep PNG only where there's transparency. Keep the dpi check working.
- Sign `Content-Length` and `Content-Type` into the presigned PUT, and allowlist types (PNG,
  JPEG, WebP, GIF; OTF, TTF, WOFF, WOFF2).
- Per-user storage quota (bytes, tracked on `assets`) with a clear message at the limit.
- Rate limit the API routes (per user, per route).
- Cleanup job (Vercel cron): delete asset rows with no R2 object after a day, and R2 objects
  no zine references after a grace period.

Depends on 06 for migrations (quota column).

Done when: a 11 MB PNG photo imports at a few MB with no visible loss and still reports its
dpi; an upload lying about its size is rejected by R2; the quota and rate limit each have a
test; the cleanup job removes a planted orphan and leaves a live asset alone.

### 04 Save integrity

- Version check on save: the PUT carries the version it was based on; if the server has a newer
  one, stop autosaving and show "This zine was changed somewhere else", offering to reload or
  to keep this version.
- Cap the document size on the server with a clear error (drawings are the heavy part).
- Evict the IndexedDB blob cache by age and total size; never evict blobs that haven't uploaded.
- An offline indicator in the top bar, and saves resume on reconnect (retry already exists).

Depends on 06 for migrations (version column).

Done when: two browser contexts editing one zine produce the conflict prompt, not a silent
overwrite (e2e); the cache stays under its cap across a scripted import of many images.

### 05 Observability

- Error tracking for client and server (PostHog error tracking, since PostHog is already in the
  toolchain, or Sentry), with source maps, release tags and the user id attached.
- Product analytics for the funnel: landing view, start zine, first edit, sign-in prompt shown,
  signed up, draft claimed, export, share. Decide the event list in the feature's spec.
- Structured server logs on the API routes (route, user, duration, outcome).

Done when: a thrown error in production shows up in the dashboard with a readable stack; the
funnel events appear for one real run through the journey.

### 06 CI, releases and migrations

- GitHub Actions on every PR: typecheck, lint, build, Playwright (Chromium). Required to merge.
- Branch protection on `main`; work lands through PRs with real commit messages.
- Migrations as files (`db/migrations/NNN-name.sql`) plus a small runner, applied in CI to a
  Neon branch per preview deployment and to the default branch on release.
- Signed-in e2e: Clerk testing tokens and a test user on the development instance, so the
  "sign in to save" handover is tested end to end, not just up to the modal.
- Replace the hand-listed localhost CORS ports with a fixed dev port in `launch.json` and the
  Playwright config, and document it.

Done when: a PR with a failing test can't merge; a migration runs on a preview branch
automatically; the signed-in journey test (draft, sign in, claim, reload, image loads) passes in CI.

### 07 Launch basics

- Metadata per page, a generated Open Graph image, a real favicon and app icon.
- Remove create-next-app leftovers: README, `public/*.svg`. Remove or fold the `/reader` spike
  page into 09.
- Privacy policy and terms (what's stored, where, deletion), linked from the landing page and
  sign-up. Account deletion removes zines and R2 objects.
- `robots.txt` and a sitemap covering the landing page only.

Done when: sharing ezine.jaedan.me in a chat shows a proper card; deleting an account empties
its rows and R2 prefix (script-verified).

---

## Phase B: worth inviting them

### 08 Print export

The reason to make a zine is to print it. This is the biggest missing feature.

- PDF export with fonts embedded and images at full resolution, in two layouts:
  - **Reader spreads**, for screens and digital print services.
  - **Printer spreads** (saddle-stitch imposition), so a home printer's duplex output folds
    straight into the book: page N pairs with page 1 on the outer sheet, and so on inward.
- Bleed and crop marks as options; a paper-size choice (A4/Letter sheet for A5/half-letter trim).
- Probably a Web Worker (or a server route, if memory needs it) so the editor stays responsive.
- A short "How to print and fold" sheet shown with the export.

Done when: an exported 16-page A5 zine, printed double-sided on A4 and folded, reads in order
(checked by hand once, and by a test on page order in the PDF); text is selectable, so fonts
are embedded; images keep their dpi.

### 09 Share and publish

"Flip through it in 3D" should work for anyone the maker sends a link to.

- Publish toggle per zine: a public read-only page `/z/[slug]` with the 3D reader and a flat
  page-by-page fallback for small screens and no-WebGL.
- Published page images rendered once (on publish) and served from R2, rather than re-rendered
  in each viewer's browser.
- Open Graph card with the cover; unpublish removes public access immediately.

Depends on 07 for the OG image pipeline.

Done when: a signed-out browser opens a published link and flips through it; unpublishing makes
the link 404; a link to a private zine 404s.

### 10 Library upgrade

- Real cover thumbnails: render the cover when it changes, store a small WebP in R2, show it on
  the card.
- Rename, duplicate and delete from a card menu (delete keeps hold-to-confirm).
- Sort by last edited (today) with an optional title sort; search once there are enough zines
  to need it.

Done when: editing the cover changes the library card within a save or two; duplicating a zine
with images copies the doc and shares the image blobs safely (delete one, the other still loads).

### 11 Image tools

- Crop and frame: an image sits in a frame; double-click to reposition or scale it inside.
- Fit and fill buttons; replace image while keeping the frame, filters and position.
- Surface the low-dpi check (`LOW_DPI` already exists) as a badge on the layer and in the
  inspector, since it decides whether the print looks good.

Done when: crop survives save, reload, preview and export; a low-dpi image shows its warning
at the size where it starts to print soft.

### 12 Typography pass

Audit the text tools against real zine layouts first (the feature's spec records what's
missing), then close the gaps. Likely candidates: a font picker with live previews, text style
presets, columns or linked text boxes, and better handling of uploaded fonts across devices.

Done when: the spec's audit list is closed, and a font uploaded on one device renders on another.

### 13 Templates and first run

- Three or four starter templates (8-page mini zine, photo zine, one-sheet fold-out) as the
  choice at "Start a zine", with a blank option.
- A real sample zine for the landing page book, replacing the numbered placeholder pages.
- Light first-run hints in the editor (add an image, turn the page, preview), dismissed for good
  once used.

Done when: a new visitor can go from landing to a finished-looking zine from a template without
reading anything; the landing book shows real designed pages.

---

## Phase C: feels finished

### 14 Editor UX pass

- Keyboard shortcut sheet (`?`) listing what's already wired in `useEditorShortcuts`.
- Align and distribute for multi-select (`lib/editor/align.ts` has the maths), grouping layers.
- Consistent context menus across the canvas, layers panel and spread strip.
- An empty-spread hint (drop an image or pick a tool).

Done when: every command in the command menu is reachable by shortcut, menu or button, and
listed on the sheet.

### 15 Small screens

- The editor on a phone: a clear "Works best on a bigger screen" state with the 3D preview and
  library still usable.
- Tablet with a pointer: make sure the editor works at 1024 px wide (sidebar collapses).
- The landing page, library and published pages fully responsive (landing is already).

Done when: a Playwright run at 390 px and 1024 px widths covers landing, library, published page
and the editor gate.

### 16 Performance and accessibility

- Landing: a static poster image for the 3D book so the first paint doesn't wait on WebGL;
  load three.js only after that.
- Split the editor bundle (Fabric, three) out of the landing and library routes.
- Keyboard and screen-reader pass on the landing page, library, auth and editor chrome; the
  canvas itself documents its keyboard model.
- Lighthouse targets on landing and library: LCP under 2.5 s, CLS under 0.1, accessibility
  score 95 or above.

Done when: the Lighthouse numbers are recorded in the feature log, and an axe run on the
landing page, library and editor chrome has no serious violations.

---

## Phase D: launch

### 17 Launch QA and ops

- A full manual pass of the journey on production with a fresh account, on Chrome, Safari and
  Firefox, including Google sign-in and a real print of an exported zine.
- Confirm Neon point-in-time restore works (restore a branch, check a zine), and write down the
  rollback steps for a bad deploy (Vercel instant rollback, plus a migration down path).
- Final CORS and environment audit: only production origins in production config.
- Alerts on error rate and on failed saves.

Done when: the pass is logged with any issues fixed or ticketed, and a restore has actually
been performed once.

---

## Later

Not in this push, noted so they aren't lost: dark mode (needs dark token values), real-time
collaboration, ordering printed copies, paid plans and larger quotas, AI layout help, a public
gallery of published zines.
