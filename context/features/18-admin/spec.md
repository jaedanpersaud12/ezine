# 18 Admin: users and zines

## What
An `/admin` area for the owner. Sign in with your normal account; if your Clerk user has
`publicMetadata.role = "admin"` you see every user (email, name, joined, last active, number of
zines, storage used), a page per user listing their saved zines, and a read-only 3D viewer for any
of those zines. Nobody else can see that the area exists. Nothing in it can change anyone's data.

## Why
There's no way today to see who has signed up or what's being made without querying Neon and
Clerk by hand. The owner needs that to run the product (and, before launch, to see the real
journey working with real accounts).

## Done when
- [ ] Signed out, `/admin` and everything under it sends the visitor to sign in (e2e).
- [ ] A signed-in user without the role gets the app's 404 page from `/admin`,
      `/admin/users/<id>` and `/admin/users/<id>/zines/<id>`, and a 404 from every
      `/api/admin/*` route, so the area's existence isn't revealed (e2e).
- [ ] The role comes from Clerk `publicMetadata.role`, checked on the server for every admin page
      and route, never only by hiding a link. Removing the role locks that user out on their
      next request, without a redeploy (e2e, toggling the role through Clerk's API).
- [ ] An admin sees a stat strip (users, zines, storage used, new users in the last 7 days, each
      with a hint saying what it's made of or compared to) and a users table with email, name,
      joined, last active, zines and storage. Users with no zines are listed (e2e against planted
      rows).
- [ ] The users table shows 10 rows per page, always renders its pager, searches by email and
      name, and is the same height on a short last page as on a full one (e2e measures the card
      height with 10 rows and with 3).
- [ ] An admin opens a user and sees their zines: title, pages, trim size, last edited, size on
      disk; paged, with an explained empty state for a user with none (e2e).
- [ ] An admin opens any user's zine in a read-only 3D viewer: the pages render with their images
      and fonts, and there is no editing UI (no toolbar, no inspector, no title field) (e2e).
- [ ] Admin access can't write: no `/api/admin/*` route accepts anything but GET, and an admin
      calling `PUT /api/zines/<another user's id>` still gets 404 (e2e).
- [ ] The route that fetches another user's image is admin-only (404 for everyone else), and the
      bytes an admin views are not saved into the admin's browser storage (e2e checks the
      IndexedDB blob store afterwards).
- [ ] Admins get an "Admin" entry to the area (in the library page), and other users never see
      one (e2e).
- [ ] Every admin route has a `loading.tsx` skeleton built from the same containers as its page,
      the area has an `error.tsx` that keeps the shell, tables use declared row heights and
      fixed column widths, and nothing changes size when data arrives (checked by hand with a
      slowed request, and by the table-height test above).
- [ ] How to grant the role, in development and in production, is written in `AGENTS.md`.
- [ ] Tests use the local Postgres and Clerk's development instance only, with an admin and a
      non-admin test user created by the test setup (not by hand).

Rows in the app-ui checklist that don't apply, with reasons: create/edit modals and destructive
confirms (nothing here creates, edits or deletes); inline edits and optimistic toggles (same).

## Out of scope
- Anything that changes data: deleting or suspending users, deleting or editing zines,
  impersonating a user, resetting passwords.
- Analytics, funnels and charts over time (05); search inside zine content.
- Managing who is an admin from the app: roles are set in Clerk.
- Exporting user data.
- The production Clerk instance (01): until then production and development share one user list.
- Disclosing admin access in the privacy policy (07 owns the policy; it needs a line about this).

## Open questions for /architect
- Whether each view of a user's zine should write an access log row (who looked at whose work,
  when). Not asked for; worth deciding deliberately because this is other people's private work.
- Reading the role: a Clerk backend lookup per admin request (no dashboard setup, one API call)
  against a session-token claim (needs a custom claim configured per Clerk instance).
- How the viewer loads images without the admin's browser caching them, given `lib/editor/assets.ts`
  resolves blobs through IndexedDB first.
- Joining Clerk's user list (paged by Clerk) with per-user aggregates from Neon, and what "last
  active" means (Clerk's `lastSignInAt` or `lastActiveAt` against the newest zine edit).
- The shell: the `app-shell`, `table-pager`, `skeleton`, `stats` and `dropdown` items aren't
  published to the `@ja3dan` registry yet (checked 2026-10-01), so they're built to the app-ui
  spec; `table-card`, `empty-state` and `status-pill` are published and get installed.
