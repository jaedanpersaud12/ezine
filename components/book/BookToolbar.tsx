"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { folioOf, openedForSide, type TypesetBook } from "@/lib/book/typeset";
import { useReaderStore } from "@/stores/reader";

function spreadLabel(book: TypesetBook, opened: number, leafCount: number): string {
  if (opened === 0) return "Cover";
  if (opened === leafCount) return "Back cover";
  const left = folioOf(book, opened * 2);
  const right = folioOf(book, opened * 2 + 1);
  if (left !== null && right !== null) return `Pages ${left}–${right}`;
  if (right !== null) return `Page ${right}`;
  return "Front matter";
}

// Page turning plus a chapter list for a long book. Arrow keys and space turn too.
export function BookToolbar({ book }: { book: TypesetBook }) {
  const { leafCount, opened, setOpened, turnNext, turnPrev } = useReaderStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        turnNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        turnPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turnNext, turnPrev]);

  // The chapter the right-hand page belongs to.
  const visibleSide = opened * 2 + 1;
  const current = book.chapters.reduce((found, chapter, i) => (chapter.side <= visibleSide ? i : found), -1);

  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-lg border border-border bg-card/90 px-3 py-2 text-card-foreground shadow-sm backdrop-blur">
      <Button variant="ghost" size="icon-sm" aria-label="Previous page" onClick={turnPrev} disabled={opened === 0}>
        <ChevronLeft />
      </Button>
      <span className="min-w-28 text-center text-sm tabular-nums" aria-live="polite">
        {spreadLabel(book, opened, leafCount)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next page"
        onClick={turnNext}
        disabled={opened === leafCount}
      >
        <ChevronRight />
      </Button>

      <span className="h-5 w-px bg-border" aria-hidden />

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Chapter
        <select
          className="max-w-52 rounded-md border border-border bg-card px-2 py-1 text-sm text-card-foreground"
          value={current}
          onChange={(e) => {
            const chapter = book.chapters[Number(e.target.value)];
            if (chapter) setOpened(openedForSide(chapter.side));
          }}
        >
          {current === -1 ? <option value={-1}>Front matter</option> : null}
          {book.chapters.map((chapter, i) => (
            <option key={chapter.side} value={i}>
              {chapter.label ? `${chapter.label.replace(/^Chapter\s+/i, "")}. ` : ""}
              {chapter.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
