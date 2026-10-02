# Log — 18 Admin: users and zines

## 2026-10-01
- Plan confirmed by the developer ("just build it fast") after choosing: role in Clerk
  `publicMetadata`, and a list plus a read-only viewer. The access-log question was left
  unanswered, so the log is out of scope.
- The developer's own Clerk user (`jaedanpersaud12@gmail.com`) was given `role: "admin"` on the
  development instance at their request; read back to confirm.
- `bunx shadcn add @ja3dan/table-card @ja3dan/empty-state @ja3dan/status-pill` installed the three
  published items; `app-shell`, `table-pager`, `skeleton`, `stats` and `dropdown` return 404 from
  the registry, so they're built to spec.
- Built to the plan: `lib/server/admin.ts`, `app/api/admin/assets/[id]`, `app/admin/**` (layout,
  users, user, zine viewer, `loading.tsx` per route, `error.tsx`), `components/admin/**`,
  `primeImage`/`primeFont` in `lib/editor/assets.ts`, an `Admin` link in the library header
  (`components/library/AdminLink.tsx`, reads `publicMetadata` client-side as a courtesy only), and
  `/admin(.*)` in `proxy.ts`'s private matcher. No schema change; it only reads `zines` and `assets`.
- Process note: for a while my runs went to port 3002, which had started serving a different
  project, so results from then are discarded; the passing runs below are against this project's
  own dev server.
- Bugs the tests found: a zero-result search showed an empty state shorter than ten rows (it now
  sits inside the table body at exactly ten rows' height, so the card height is constant); a test
  title matched two rows left by earlier runs (now unique per run).

## Evidence per criterion
- Signed out → sign-in: e2e "signed out, every admin page sends the visitor to sign in".
- Non-admin → 404 everywhere, no Admin link: e2e "a signed-in user without the role gets 404s…";
  signed-out asset route: e2e "signed out, the admin asset route is a 404 too".
- Role read from Clerk on every request: e2e "taking the role away locks the user out on their
  next request" (role removed through Clerk's API, 404 on the next request, restored in `finally`).
- Stat strip and users table with figures, users with no zines listed: e2e "an admin sees the
  users, with figures…" (screenshot checked by eye) and "…a user with none gets an explained
  empty state". The new-users figure uses `createdAtAfter`; not verified against a user created
  more than 7 days ago, because every user in the development instance is newer than that.
- Paging, search, constant height: e2e "an admin sees the users…" (card height with the full list,
  one result and zero results within 1 px) and "search narrows the list…". Not verified for a
  second page, because the development instance has fewer than 11 users; the pager is the same
  code path with `offset`.
- A user's zines: e2e "an admin opens a user and sees their zines…".
- Read-only viewer, no editing UI: e2e "an admin reads any zine in a viewer…" (title, pages and
  assets via the admin route; no title field, tools or Preview button). Looked at by eye: the
  book draws with the image, in a screenshot taken after the scene settled. The test's image is a
  1 × 1 stand-in served for the asset route, so real stored images through the presigned URL
  aren't exercised end to end here (the route itself is: next item).
- Admin asset route admin-only, GET-only: e2e "the admin asset route gives a signed URL… and
  only by GET" (200 with `X-Amz-Signature`, 404 for an unknown or malformed id, 405 for
  PUT/POST/DELETE/PATCH).
- Nothing in the admin's browser storage: same viewer test, checks the IndexedDB blob store.
- Admin can't write to another user's zine: e2e "an admin still can't write to someone else's zine
  through the normal route" (404, and the stored title unchanged).
- Admin entry in the library: e2e "an admin sees the users…" clicks it from the library; the
  non-admin test checks it's absent.
- `loading.tsx` per route, `error.tsx`, fixed table geometry: built to the app-ui spec;
  `loading.tsx` skeletons not checked by hand with a slowed request, and `error.tsx` not
  triggered, because there's no signed-in browser session I can drive for the admin user.
- AGENTS.md documents the role: yes ("Admin" section).
- Tests use the local database and the development Clerk instance: `requireAdminTests()` and
  `e2e/db.ts`; the two admin test users and the role-free regular user are made in global setup.
