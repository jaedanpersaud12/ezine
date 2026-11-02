import "server-only";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// The /book reader shows a manuscript from the developer's own disk. It never ships: the text
// isn't in the repo (content/*.local.md is gitignored) and production always answers 404.
// Point BOOK_PATH at a file in .env.development.local, or drop one at content/book.local.md.
const DEFAULT_PATH = join(process.cwd(), "content", "book.local.md");

function resolvePath(path: string): string {
  return path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

export async function readLocalManuscript(): Promise<string | null> {
  if (process.env.NODE_ENV === "production") return null;
  const path = resolvePath(process.env.BOOK_PATH ?? DEFAULT_PATH);
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      console.error("[book] couldn't read the manuscript", path, error);
    }
    return null;
  }
}
