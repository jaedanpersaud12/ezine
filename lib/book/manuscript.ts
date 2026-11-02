// Parses a novel manuscript written in plain Markdown into chapters, paragraphs and scene breaks.
// The format is the one morne-bay's build script writes: a "# Title" line, an optional italic
// build note, then "# Chapter N — Name" headings, paragraphs separated by blank lines, and "---"
// between scenes. Only *italic*, _italic_ and **bold** are understood inline.

export type Run = { text: string; italic: boolean; bold: boolean };

export type Block = { kind: "para"; runs: Run[]; indent: boolean } | { kind: "break" };

export type Chapter = { label: string; title: string; blocks: Block[] };

export type Manuscript = { title: string; subtitle: string | null; chapters: Chapter[] };

const CHAPTER_RE = /^#\s+(Chapter\s+[^—–-]+?)\s*[—–-]\s*(.+)$/i;
const HEADING_RE = /^#{1,6}\s+(.+)$/;
const BREAK_RE = /^(\*\s*\*\s*\*|-{3,}|_{3,}|⁂)$/;
// The build script's "_Built …_" stamp is a note to the author, not part of the book.
const BUILD_NOTE_RE = /^_Built\b.*_$/;

export function parseManuscript(source: string): Manuscript {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let title = "Untitled";
  let subtitle: string | null = null;
  const chapters: Chapter[] = [];
  let paragraph: string[] = [];
  // The first paragraph of a chapter, and the first after a scene break, sits flush left.
  let flush = true;

  const current = (): Chapter => {
    if (chapters.length === 0) chapters.push({ label: "", title: "", blocks: [] });
    return chapters[chapters.length - 1];
  };

  const flushParagraph = (): void => {
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (!text) return;
    current().blocks.push({ kind: "para", runs: parseInline(smartQuotes(text)), indent: !flush });
    flush = false;
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      continue;
    }
    if (BUILD_NOTE_RE.test(line)) continue;

    const chapter = CHAPTER_RE.exec(line);
    if (chapter) {
      flushParagraph();
      chapters.push({ label: chapter[1].trim(), title: smartQuotes(chapter[2].trim()), blocks: [] });
      flush = true;
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph();
      // The first non-chapter heading is the book's title; "Name (working title)" splits in two.
      if (chapters.length === 0 && title === "Untitled") {
        const match = /^(.*?)\s*\((.+)\)\s*$/.exec(heading[1].trim());
        title = smartQuotes(match ? match[1] : heading[1].trim());
        subtitle = match ? match[2] : null;
      }
      continue;
    }

    if (BREAK_RE.test(line)) {
      flushParagraph();
      const blocks = current().blocks;
      if (blocks.length > 0 && blocks[blocks.length - 1].kind !== "break") blocks.push({ kind: "break" });
      flush = true;
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();

  return { title, subtitle, chapters: chapters.filter((c) => c.blocks.length > 0 || c.title) };
}

// Straight quotes to curly ones: an opening quote follows a space, bracket or dash.
export function smartQuotes(text: string): string {
  return text
    .replace(/(^|[\s([{—–-])"/g, "$1“")
    .replace(/"/g, "”")
    .replace(/(^|[\s([{—–-])'/g, "$1‘")
    .replace(/'/g, "’");
}

// Splits *italic*, _italic_ and **bold** into styled runs. Unmatched markers stay as text.
export function parseInline(text: string): Run[] {
  const runs: Run[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|(?<![\p{L}\p{N}])_(.+?)_(?![\p{L}\p{N}])/gu;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index), italic: false, bold: false });
    if (match[1] !== undefined) runs.push({ text: match[1], italic: false, bold: true });
    else runs.push({ text: match[2] ?? match[3] ?? "", italic: true, bold: false });
    last = re.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last), italic: false, bold: false });
  return runs;
}
