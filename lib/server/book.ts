import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join } from "node:path";
import type { BookImages } from "@/lib/book/images";

export type { BookImages };

// The /book reader shows a manuscript from the developer's own disk. It never ships: the text
// and pictures aren't in the repo (content/*.local.md and content/book-images/ are gitignored)
// and production always answers 404.
// Point BOOK_PATH at the manuscript and BOOK_IMAGES_DIR at its pictures in .env.development.local,
// or use content/book.local.md and content/book-images/.
const DEFAULT_PATH = join(process.cwd(), "content", "book.local.md");
const DEFAULT_IMAGES_DIR = join(process.cwd(), "content", "book-images");

// cast-01-juno.png → a cast spread captioned "Juno"; ch03-2.png → chapter 3's second still.
const CAST_RE = /^cast-(\d+)-([\w-]+)\.(png|jpe?g|webp)$/i;
const STILL_RE = /^ch(\d+)-(\d+)\.(png|jpe?g|webp)$/i;
const SAFE_NAME_RE = /^[\w-]+\.(png|jpe?g|webp)$/i;

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};


function resolvePath(path: string): string {
  return path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

function imagesDir(): string {
  return resolvePath(process.env.BOOK_IMAGES_DIR ?? DEFAULT_IMAGES_DIR);
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function readLocalManuscript(): Promise<string | null> {
  if (process.env.NODE_ENV === "production") return null;
  const path = resolvePath(process.env.BOOK_PATH ?? DEFAULT_PATH);
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (!isMissing(error)) console.error("[book] couldn't read the manuscript", path, error);
    return null;
  }
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// Pictures for the book, by filename convention. A missing folder just means no pictures.
export async function listLocalBookImages(): Promise<BookImages> {
  const empty: BookImages = { cast: [], chapters: {} };
  if (process.env.NODE_ENV === "production") return empty;

  let files: string[];
  try {
    files = await readdir(imagesDir());
  } catch (error) {
    if (!isMissing(error)) console.error("[book] couldn't list the pictures", imagesDir(), error);
    return empty;
  }

  const url = (file: string): string => `/book/images/${encodeURIComponent(file)}`;
  const cast: { order: number; name: string; url: string }[] = [];
  const stills: { chapter: number; order: number; url: string }[] = [];

  for (const file of files) {
    const c = CAST_RE.exec(file);
    if (c) {
      cast.push({ order: Number(c[1]), name: titleCase(c[2]), url: url(file) });
      continue;
    }
    const s = STILL_RE.exec(file);
    if (s) stills.push({ chapter: Number(s[1]), order: Number(s[2]), url: url(file) });
  }

  cast.sort((a, b) => a.order - b.order);
  stills.sort((a, b) => a.chapter - b.chapter || a.order - b.order);
  const chapters: Record<number, string[]> = {};
  for (const still of stills) (chapters[still.chapter] ??= []).push(still.url);

  return { cast: cast.map(({ name, url: u }) => ({ name, url: u })), chapters };
}

// One picture's bytes, or null. Only plain filenames in the pictures folder are served.
export async function readLocalBookImage(file: string): Promise<{ body: Buffer; type: string } | null> {
  if (process.env.NODE_ENV === "production" || !SAFE_NAME_RE.test(file)) return null;
  try {
    const body = await readFile(join(imagesDir(), file));
    return { body, type: CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream" };
  } catch (error) {
    if (!isMissing(error)) console.error("[book] couldn't read a picture", file, error);
    return null;
  }
}
