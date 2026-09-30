"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { spreadLabel } from "@/lib/book/stack";
import { TRIMS, type TrimId } from "@/lib/book/trim";
import { LEAF_COUNT_OPTIONS, useReaderStore } from "@/stores/reader";

function isTrimId(value: string): value is TrimId {
  return value in TRIMS;
}

// `bookControls` shows the trim and page-count pickers (the spike); the editor preview hides them.
export function ReaderToolbar({ bookControls = true }: { bookControls?: boolean }) {
  const { trimId, leafCount, opened, setTrim, setLeafCount, turnNext, turnPrev } = useReaderStore();

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

  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-lg border border-border bg-card/90 px-3 py-2 text-card-foreground shadow-sm backdrop-blur">
      <Button variant="ghost" size="icon-sm" aria-label="Previous page" onClick={turnPrev} disabled={opened === 0}>
        <ChevronLeft />
      </Button>
      <span className="min-w-28 text-center text-sm tabular-nums" aria-live="polite">
        {spreadLabel(opened, leafCount)}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label="Next page" onClick={turnNext} disabled={opened === leafCount}>
        <ChevronRight />
      </Button>

      {bookControls ? (
        <>
          <span className="h-5 w-px bg-border" aria-hidden />

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Trim
            <select
              className="rounded-md border border-border bg-card px-2 py-1 text-sm text-card-foreground"
              value={trimId}
              onChange={(e) => {
                if (isTrimId(e.target.value)) setTrim(e.target.value);
              }}
            >
              {Object.values(TRIMS).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Pages
            <select
              className="rounded-md border border-border bg-card px-2 py-1 text-sm text-card-foreground"
              value={leafCount}
              onChange={(e) => setLeafCount(Number(e.target.value))}
            >
              {LEAF_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n * 2}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
    </div>
  );
}
