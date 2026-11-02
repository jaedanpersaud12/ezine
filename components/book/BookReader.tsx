"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BookToolbar } from "@/components/book/BookToolbar";
import { parseManuscript } from "@/lib/book/manuscript";
import {
  BOOK_TRIM,
  drawPage,
  drawPaper,
  typesetBook,
  type BookFonts,
  type BookPlates,
  type TypesetBook,
} from "@/lib/book/typeset";
import type { BookImages } from "@/lib/book/images";
import { builtInFont } from "@/lib/zine/fonts";
import { useReaderStore } from "@/stores/reader";

// WebGL and canvas textures only exist in the browser.
const ReaderScene = dynamic(() => import("@/components/reader/ReaderScene"), { ssr: false });

// Leaves either side of the open spread that carry real page art; the rest are plain paper.
const PAGE_WINDOW = 3;

// A paperback this long is about this deep. Without a cap the leaf model's paper would make it
// several centimetres thick.
const BLOCK_DEPTH_MM = 14;

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

// A picture that fails to load is left out rather than stopping the book.
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      console.warn("[book] picture didn't load", url);
      resolve(null);
    };
    image.src = url;
  });
}

async function loadPlates(images: BookImages): Promise<BookPlates> {
  const cast = await Promise.all(
    images.cast.map(async (member) => ({ name: member.name, image: await loadImage(member.url) })),
  );
  const chapters = new Map<number, HTMLImageElement[]>();
  await Promise.all(
    Object.entries(images.chapters).map(async ([chapter, urls]) => {
      const loaded = await Promise.all(urls.map(loadImage));
      chapters.set(
        Number(chapter),
        loaded.filter((image): image is HTMLImageElement => image !== null),
      );
    }),
  );
  return {
    cast: cast.flatMap((m) => (m.image ? [{ name: m.name, image: m.image }] : [])),
    chapters,
  };
}

async function loadFonts(): Promise<BookFonts> {
  const [body, display] = await Promise.all([
    loadFace(builtInFont("caslon")?.family, ["400", "italic 400", "700"]),
    loadFace(builtInFont("instrument-serif")?.family, ["400", "italic 400"]),
  ]);
  return { body, display };
}

export function BookReader({ source, images }: { source: string; images: BookImages }) {
  const [ready, setReady] = useState<Ready | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadFonts(), loadPlates(images)])
      .then(([fonts, plates]) => {
        if (cancelled) return;
        const book = typesetBook(parseManuscript(source), fonts, plates);
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
  }, [source, images]);

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
            levelSpread
            maxThicknessMm={BLOCK_DEPTH_MM}
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
