"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BookToolbar } from "@/components/book/BookToolbar";
import { parseManuscript } from "@/lib/book/manuscript";
import { BOOK_TRIM, drawPage, drawPaper, typesetBook, type BookFonts, type TypesetBook } from "@/lib/book/typeset";
import { builtInFont } from "@/lib/zine/fonts";
import { useReaderStore } from "@/stores/reader";

// WebGL and canvas textures only exist in the browser.
const ReaderScene = dynamic(() => import("@/components/reader/ReaderScene"), { ssr: false });

// Leaves either side of the open spread that carry real page art; the rest are plain paper.
const PAGE_WINDOW = 3;

type Ready = { book: TypesetBook; paper: HTMLCanvasElement };

// If a face can't be fetched (offline dev, say), the book still sets in a system serif.
const FALLBACK_SERIF = "Georgia, 'Times New Roman', serif";

async function loadFace(family: string | undefined, styles: string[]): Promise<string> {
  if (!family) return FALLBACK_SERIF;
  // Canvas text uses whatever face is loaded at draw time, so every style has to be in first.
  const results = await Promise.allSettled(styles.map((style) => document.fonts.load(`${style} 32px ${family}`)));
  const failed = results.find((r) => r.status === "rejected");
  if (failed) {
    console.warn("[book] font didn't load, using a system serif", family, failed.reason);
    return FALLBACK_SERIF;
  }
  return family;
}

async function loadFonts(): Promise<BookFonts> {
  const [body, display] = await Promise.all([
    loadFace(builtInFont("caslon")?.family, ["400", "italic 400", "700"]),
    loadFace(builtInFont("instrument-serif")?.family, ["400", "italic 400"]),
  ]);
  return { body, display };
}

export function BookReader({ source }: { source: string }) {
  const [ready, setReady] = useState<Ready | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadFonts()
      .then((fonts) => {
        if (cancelled) return;
        const book = typesetBook(parseManuscript(source), fonts);
        useReaderStore.setState({ leafCount: book.leafCount, opened: 0 });
        setReady({ book, paper: drawPaper() });
      })
      .catch((error: unknown) => {
        console.error("[book] couldn't set the manuscript", error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  const book = ready?.book;
  const pageImage = useCallback((side: number) => (book ? drawPage(book, side) : undefined), [book]);

  return (
    <div className="relative h-dvh w-full bg-muted">
      {ready ? (
        <>
          <ReaderScene
            widthMm={BOOK_TRIM.widthMm}
            heightMm={BOOK_TRIM.heightMm}
            leafCount={ready.book.leafCount}
            pageImage={pageImage}
            stapled={false}
            pageWindow={PAGE_WINDOW}
            paperImage={ready.paper}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <BookToolbar book={ready.book} />
          </div>
        </>
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
          {failed ? "Couldn't set this manuscript. The console has the details." : "Setting the type…"}
        </div>
      )}
    </div>
  );
}
