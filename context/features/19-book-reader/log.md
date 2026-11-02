# 19 Log

- Private by design: the repo is public, so the text is read from disk at request time in dev only.
- Thick book: `createBookRig({ pageWindow, paperImage })` keeps real textures for leaves within
  3 of the open spread and swaps in one shared paper texture elsewhere (~6 MB per page otherwise).
  `Book` jumps instantly for moves of more than 3 leaves, so a chapter jump isn't 40 staggered turns.
- Fonts: Libre Caslon body, Instrument Serif display, from the zine font library; falls back to a
  system serif if a face can't load.
- Evidence: rendered pages checked as PNGs (contents, chapter opener, body, scene break, folios);
  3D screenshots of cover, open spread and chapter jump under headless Chrome. `next build`
  can't run in the sandbox (Google Fonts is unreachable there), same for every route.
- Pictures (2026-11-02): cast sheets as contained spreads after the contents, chapter stills as
  full-bleed spreads anchored after evenly spaced paragraphs; a spread waits for a page break that
  lands on a verso. Front matter is now dynamic (`book.frontMatterSides`), so `folioOf` takes the
  book. Checked with 9 + 32 placeholder images: halves meet at the spine, folios still start at 1
  on chapter one, the image route rejects `..%2F` paths with 404.
