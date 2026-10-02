# Plan — 18 Admin: users and zines

## What we're building
`/admin` for accounts whose Clerk `publicMetadata.role` is `admin`: a users table (Clerk's user list
joined with per-user zine counts and storage from Neon), a page per user listing their zines, and a
read-only 3D viewer for any zine. Non-admins get the app's 404 everywhere under `/admin` and
`/api/admin`. Nothing under it writes.

## Decisions
- **Role is read from Clerk on the server for every request** (`clerkClient().users.getUser(id)`,
  memoised per request with React `cache`), not from a session-token claim: no per-instance
  dashboard setup, and removing the role takes effect on the next request. Admin traffic is tiny.
- **Gate in three places:** `proxy.ts` sends signed-out visitors to sign in for `/admin(.*)`; the
  admin layout and every admin page/route call `requireAdmin()`, which `notFound()`s (pages) or
  returns a 404 JSON (routes) for non-admins. A layout alone isn't enough: it doesn't re-render on
  client navigation.
- **404, not 403,** so the area's existence isn't revealed.
- **Users come from Clerk, paged by Clerk** (`getUserList` with `limit`, `offset`, `query`, newest
  first, `totalCount` for the pager), 10 a page, search by `?q=`. Per-user figures for the ten on
  screen come from one Neon query (`zines` count, newest edit, `assets` bytes). Stat strip: users
  (Clerk count), zines and storage (Neon totals), new users in 7 days (`createdAtAfter`).
  "Last active" is Clerk's `lastActiveAt`, falling back to `lastSignInAt`.
- **Viewer without the editor.** The viewer page fetches the zine server-side for the owner
  (`getZine(ownerId, id)`), then in the browser fetches each asset through
  `GET /api/admin/assets/[id]` (presigned URL, admin only, any owner), and hands the blobs to new
  `primeImage` / `primeFont` exports in `lib/editor/assets.ts` that register them for rendering
  **without** touching IndexedDB. Then `renderPages` and `ReaderScene`, as the editor preview does.
  No editor store, no toolbar, no inspector.
- **Server paging and links, not `usePaged`,** because Clerk pages the users. The pager is built to
  the app-ui spec (always rendered, "1–10 of 42", fixed height) as a small server component of
  links, so back/forward and sharing a URL work.
- **app-ui departures, with reasons:** the `app-shell`, `table-pager`, `skeleton`, `stats` and
  `dropdown` registry items aren't published (checked 2026-10-01), so they're built to the written
  spec in `components/admin/`; `table-card`, `empty-state` and `status-pill` are installed from the
  registry. The sidebar is a fixed nav with one entry (Users), not a collapsible rail: one
  destination doesn't earn the machinery. Rows are links, with no `⋯` menu: there is one action.
- **Tests create their own users.** Global setup (`e2e/global.setup.ts`) finds or creates two admin
  test users and makes sure the existing test user has no role, through Clerk's backend API; one
  admin is for the role-removal test only so it can't disturb the others.
- **No access log,** by the developer's call ("just build it fast"). Left as a follow-up.

## Assumptions
- `createUser({ emailAddress, skipPasswordRequirement: true })` works on the development
  instance; if not, tests create the user with a password from the environment.
- Clerk's `query` and `createdAtAfter` filters behave as documented in `@clerk/backend`'s types.
- `getZine(ownerId, id)` (scoped to the owner) is the right read for the viewer, so no new
  all-owners zine query is needed.
- The 03 branch rewrites `lib/editor/assets.ts` (display copies). `primeImage` is additive and
  small, so the merge should be mechanical; the display-copy path will need priming too, and that's
  for whichever branch merges second.

## How to build it
1. `lib/server/admin.ts` (role check, `requireAdmin`, queries) and `app/api/admin/assets/[id]`.
2. `proxy.ts` private matcher; the admin layout/nav/shell and shared pieces in `components/admin/`.
3. Pages: users, user, viewer, each with `loading.tsx`; `error.tsx` in the admin group.
4. `primeImage`/`primeFont`, the viewer component.
5. Admin link in the library header.
6. Tests and global setup; `AGENTS.md` docs; log.

## Out of scope
- Writing anything, impersonation, deletion, exports; analytics; managing roles in the app.
- An access log (follow-up); the privacy-policy line (07); the production Clerk instance (01).
