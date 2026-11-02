# 19 Book reader (dev-only)

## What
A `/book` page that sets a novel manuscript from the developer's disk as a 3D A5 paperback in the
existing reader: cover, title page, contents, chapters on fresh pages, justified serif text,
running heads, page numbers, and a chapter menu.

## Why
To read the Morne Bay draft the way it will be read, using the reader this app already has.

## Done when
- [x] `/book` renders the manuscript at `BOOK_PATH` (or `content/book.local.md`) as a turning 3D book
- [x] Production answers 404 and no manuscript text is in the repo (`content/*.local.md` ignored)
- [x] A ~50-leaf book only holds page art for the leaves near the open spread
- [x] Choosing a chapter jumps to its opening page; arrow keys and space turn pages
- [x] Zine readers (landing, preview, admin viewer, /reader) behave as before: lazy pages and jumps are opt-in
- [x] `bun run check` passes

## Out of scope
- Uploading a manuscript in the browser, or any public/shared book
- Hyphenation, widow control beyond "no lone first line at a page foot", footnotes, images
