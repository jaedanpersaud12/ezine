import type { Block, Manuscript, Run } from "@/lib/book/manuscript";

// Sets a manuscript as a printed A5 paperback: covers, title page, contents, then each chapter
// starting on a fresh page, justified body text, running heads and page numbers. Layout happens
// once, up front, against a measuring canvas; pages are drawn later, one at a time, only when the
// 3D book needs them (`drawPage`). Colours here are ink and paper, not UI, so they sit outside
// the token contract, like the zine placeholder pages.

export const BOOK_TRIM = { widthMm: 148, heightMm: 210 };

const TEXTURE_WIDTH_PX = 1024;
const PX_PER_MM = TEXTURE_WIDTH_PX / BOOK_TRIM.widthMm;
const PAGE_W = TEXTURE_WIDTH_PX;
const PAGE_H = Math.round(BOOK_TRIM.heightMm * PX_PER_MM);

const px = (mm: number): number => mm * PX_PER_MM;

const MARGIN = { top: px(18), bottom: px(22), inner: px(19), outer: px(15) };
const TEXT_W = PAGE_W - MARGIN.inner - MARGIN.outer;
const TEXT_BOTTOM = PAGE_H - MARGIN.bottom;

const BODY_SIZE = px(3.75);
const LEADING = px(5.35);
const INDENT = px(5.5);
// Past this, a justified line looks gappy enough that ragged-right reads better.
const MAX_STRETCH = 2.8;
// Chapter openers drop the text down the page, like a printed book.
const OPENER_LABEL_Y = MARGIN.top + px(30);
const OPENER_TITLE_Y = MARGIN.top + px(42);
const OPENER_TEXT_Y = MARGIN.top + px(62);

// First text page is page 1; the sides before it are front matter.
const FRONT_MATTER_SIDES = 6;

const PAPER = "#f5efe3";
const INK = "#231f1b";
const INK_SOFT = "#6f665d";
const COVER_TOP = "#c98c50";
const COVER_BOTTOM = "#6e4127";
const COVER_INK = "#fbf3e6";

export type BookFonts = { body: string; display: string };

type Segment = { text: string; italic: boolean; bold: boolean; x: number };
type Line = { y: number; segments: Segment[] };
type Ornament = { y: number };

type TextPage = {
  kind: "text";
  side: number;
  lines: Line[];
  ornaments: Ornament[];
  opener: { label: string; title: string } | null;
  chapterTitle: string;
};

export type BookPage =
  | { kind: "front-cover"; side: number }
  | { kind: "back-cover"; side: number }
  | { kind: "blank"; side: number }
  | { kind: "title"; side: number }
  | { kind: "colophon"; side: number }
  | { kind: "contents"; side: number }
  | TextPage;

export type ChapterStart = { label: string; title: string; side: number; folio: number };

export type TypesetBook = {
  title: string;
  subtitle: string | null;
  pages: BookPage[];
  chapters: ChapterStart[];
  sideCount: number;
  leafCount: number;
  fonts: BookFonts;
};

export function folioOf(side: number): number | null {
  return side > FRONT_MATTER_SIDES ? side - FRONT_MATTER_SIDES : null;
}

function fontSpec(fonts: BookFonts, size: number, italic: boolean, bold: boolean): string {
  return `${italic ? "italic " : ""}${bold ? 700 : 400} ${size}px ${fonts.body}`;
}

// A word may mix styles ("*her too*." is italic words then a roman full stop), so it is a list of
// styled pieces with no space between them.
type Piece = { text: string; italic: boolean; bold: boolean; width: number };
type Word = { pieces: Piece[]; width: number };

function toWords(runs: Run[], measure: (r: Omit<Piece, "width">) => number): Word[] {
  const words: Word[] = [];
  let current: Piece[] = [];
  const close = (): void => {
    if (current.length === 0) return;
    words.push({ pieces: current, width: current.reduce((sum, p) => sum + p.width, 0) });
    current = [];
  };

  for (const run of runs) {
    for (const part of run.text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        close();
        continue;
      }
      const piece = { text: part, italic: run.italic, bold: run.bold };
      current.push({ ...piece, width: measure(piece) });
    }
  }
  close();
  return words;
}

// Greedy line breaking, justified except for each paragraph's last line.
function breakParagraph(words: Word[], indent: number, space: number): { words: Word[]; x: number[] }[] {
  const lines: { words: Word[]; x: number[] }[] = [];
  let i = 0;

  while (i < words.length) {
    const first = lines.length === 0;
    const available = TEXT_W - (first ? indent : 0);
    const lineWords: Word[] = [words[i]];
    let width = words[i].width;
    i++;
    while (i < words.length && width + space + words[i].width <= available) {
      width += space + words[i].width;
      lineWords.push(words[i]);
      i++;
    }

    const last = i >= words.length;
    const gaps = lineWords.length - 1;
    const natural = lineWords.reduce((sum, w) => sum + w.width, 0);
    const justified = gaps > 0 ? (available - natural) / gaps : space;
    const gap = !last && gaps > 0 && justified <= space * MAX_STRETCH ? justified : space;

    const x: number[] = [];
    let cursor = first ? indent : 0;
    for (const w of lineWords) {
      x.push(cursor);
      cursor += w.width + gap;
    }
    lines.push({ words: lineWords, x });
  }
  return lines;
}

export function typesetBook(manuscript: Manuscript, fonts: BookFonts): TypesetBook {
  const measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");

  const measure = (p: Omit<Piece, "width">): number => {
    ctx.font = fontSpec(fonts, BODY_SIZE, p.italic, p.bold);
    return ctx.measureText(p.text).width;
  };
  ctx.font = fontSpec(fonts, BODY_SIZE, false, false);
  const space = ctx.measureText(" ").width;

  const pages: BookPage[] = [
    { kind: "front-cover", side: 1 },
    { kind: "blank", side: 2 },
    { kind: "title", side: 3 },
    { kind: "colophon", side: 4 },
    { kind: "contents", side: 5 },
    { kind: "blank", side: 6 },
  ];
  const chapters: ChapterStart[] = [];
  let side = FRONT_MATTER_SIDES;
  let page: TextPage | null = null;
  let y = 0;

  const newPage = (chapterTitle: string, opener: TextPage["opener"]): TextPage => {
    side++;
    const next: TextPage = { kind: "text", side, lines: [], ornaments: [], opener, chapterTitle };
    pages.push(next);
    page = next;
    y = opener ? OPENER_TEXT_Y : MARGIN.top + BODY_SIZE;
    return next;
  };
  const room = (): number => Math.floor((TEXT_BOTTOM - y) / LEADING) + 1;

  for (const chapter of manuscript.chapters) {
    const opened = newPage(chapter.title, { label: chapter.label, title: chapter.title });
    chapters.push({ label: chapter.label, title: chapter.title, side: opened.side, folio: folioOf(opened.side) ?? 0 });

    chapter.blocks.forEach((block: Block) => {
      if (block.kind === "break") {
        if (room() < 3) newPage(chapter.title, null);
        else {
          (page as TextPage).ornaments.push({ y: y + LEADING * 0.3 });
          y += LEADING * 2;
        }
        return;
      }

      const lines = breakParagraph(toWords(block.runs, measure), block.indent ? INDENT : 0, space);
      // No lone first line at the foot of a page.
      if (room() === 1 && lines.length > 1) newPage(chapter.title, null);

      for (const line of lines) {
        if (room() < 1) newPage(chapter.title, null);
        const segments: Segment[] = [];
        line.words.forEach((word, w) => {
          let x = line.x[w];
          for (const piece of word.pieces) {
            segments.push({ text: piece.text, italic: piece.italic, bold: piece.bold, x });
            x += piece.width;
          }
        });
        (page as TextPage).lines.push({ y, segments });
        y += LEADING;
      }
    });
  }

  // Inside back cover and back cover, after an even number of sides before them.
  if (side % 2 === 1) pages.push({ kind: "blank", side: ++side });
  pages.push({ kind: "blank", side: ++side });
  pages.push({ kind: "back-cover", side: ++side });

  return {
    title: manuscript.title,
    subtitle: manuscript.subtitle,
    pages,
    chapters,
    sideCount: side,
    leafCount: side / 2,
    fonts,
  };
}

// ---------------------------------------------------------------- drawing

function newCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { canvas, ctx };
}

function centred(ctx: CanvasRenderingContext2D, text: string, y: number, font: string, colour: string, spacing = "0px"): void {
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.letterSpacing = spacing;
  ctx.textAlign = "center";
  ctx.fillText(text, PAGE_W / 2, y);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";
}

function drawCover(ctx: CanvasRenderingContext2D, book: TypesetBook, front: boolean): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, PAGE_H);
  gradient.addColorStop(0, COVER_TOP);
  gradient.addColorStop(1, COVER_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  if (!front) {
    centred(ctx, book.title.toUpperCase(), PAGE_H - px(20), `400 ${px(3)}px ${book.fonts.body}`, COVER_INK, `${px(1)}px`);
    return;
  }

  // The dust-dimmed sun from chapter one: a dull coin you could look straight at.
  ctx.fillStyle = "rgba(255, 233, 196, 0.82)";
  ctx.beginPath();
  ctx.arc(PAGE_W / 2, px(62), px(21), 0, Math.PI * 2);
  ctx.fill();

  centred(ctx, book.title, px(122), `400 ${px(17)}px ${book.fonts.display}`, COVER_INK);
  if (book.subtitle) centred(ctx, book.subtitle, px(134), `italic 400 ${px(5)}px ${book.fonts.display}`, COVER_INK);
  centred(ctx, "A NOVEL", PAGE_H - px(22), `400 ${px(3)}px ${book.fonts.body}`, COVER_INK, `${px(1.2)}px`);
}

function drawContents(ctx: CanvasRenderingContext2D, book: TypesetBook, side: number): void {
  const left = side % 2 === 1 ? MARGIN.inner : MARGIN.outer;
  centred(ctx, "CONTENTS", MARGIN.top + px(24), `400 ${px(3.4)}px ${book.fonts.body}`, INK, `${px(0.9)}px`);

  let y = MARGIN.top + px(44);
  for (const chapter of book.chapters) {
    ctx.font = `400 ${BODY_SIZE}px ${book.fonts.body}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText(chapter.label.replace(/^Chapter\s+/i, ""), left, y);
    ctx.fillStyle = INK;
    ctx.fillText(chapter.title, left + px(10), y);
    ctx.textAlign = "right";
    ctx.fillText(String(chapter.folio), left + TEXT_W, y);
    ctx.textAlign = "left";
    y += LEADING * 1.6;
  }
}

function drawText(ctx: CanvasRenderingContext2D, book: TypesetBook, page: TextPage): void {
  const recto = page.side % 2 === 1;
  const left = recto ? MARGIN.inner : MARGIN.outer;

  if (page.opener) {
    centred(ctx, page.opener.label.toUpperCase(), OPENER_LABEL_Y, `400 ${px(3.2)}px ${book.fonts.body}`, INK_SOFT, `${px(0.9)}px`);
    centred(ctx, page.opener.title, OPENER_TITLE_Y, `400 ${px(9)}px ${book.fonts.display}`, INK);
  } else {
    const head = recto ? page.chapterTitle : book.title;
    centred(ctx, head.toUpperCase(), MARGIN.top - px(6), `400 ${px(2.6)}px ${book.fonts.body}`, INK_SOFT, `${px(0.7)}px`);
  }

  ctx.fillStyle = INK;
  for (const line of page.lines) {
    for (const s of line.segments) {
      ctx.font = fontSpec(book.fonts, BODY_SIZE, s.italic, s.bold);
      ctx.fillText(s.text, left + s.x, line.y);
    }
  }
  for (const ornament of page.ornaments) {
    centred(ctx, "* * *", ornament.y, `400 ${BODY_SIZE}px ${book.fonts.body}`, INK_SOFT);
  }

  const folio = folioOf(page.side);
  if (folio !== null && !page.opener) {
    centred(ctx, String(folio), PAGE_H - MARGIN.bottom + px(11), `400 ${px(3)}px ${book.fonts.body}`, INK_SOFT);
  }
}

// One printed side (1-based) as a canvas for the 3D reader.
export function drawPage(book: TypesetBook, side: number): HTMLCanvasElement {
  const { canvas, ctx } = newCanvas();
  const page = book.pages[side - 1];
  ctx.textBaseline = "alphabetic";

  if (page?.kind === "front-cover" || page?.kind === "back-cover") {
    drawCover(ctx, book, page.kind === "front-cover");
    return canvas;
  }

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  if (!page) return canvas;

  switch (page.kind) {
    case "title":
      centred(ctx, book.title, px(78), `400 ${px(13)}px ${book.fonts.display}`, INK);
      if (book.subtitle) centred(ctx, book.subtitle, px(90), `italic 400 ${px(4.6)}px ${book.fonts.display}`, INK_SOFT);
      break;
    case "colophon":
      centred(ctx, "Draft copy. Not for distribution.", PAGE_H - px(30), `italic 400 ${px(3)}px ${book.fonts.body}`, INK_SOFT);
      break;
    case "contents":
      drawContents(ctx, book, page.side);
      break;
    case "text":
      drawText(ctx, book, page);
      break;
    case "blank":
      break;
  }
  return canvas;
}

// Plain paper for leaves far from the open spread, so a thick book doesn't hold every page in memory.
export function drawPaper(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = Math.round((32 * BOOK_TRIM.heightMm) / BOOK_TRIM.widthMm);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

// The spread that shows a given side: sides 2k and 2k+1 face each other when k leaves are turned.
export function openedForSide(side: number): number {
  return Math.floor(side / 2);
}
