"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import { useReaderStore } from "@/stores/reader";
import { TRIMS } from "@/lib/book/trim";

// WebGL only exists in the browser.
const ReaderScene = dynamic(() => import("@/components/reader/ReaderScene"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" />,
});

const LEAVES = 8;
const FIRST_TURN_MS = 2200;
const TURN_EVERY_MS = 1800;
const AUTO_TURNS = 3;
// Same angle as the reader, pulled in closer to fill the smaller frame.
const CAMERA: [number, number, number] = [0, 0.37, 0.15];

// The real 3D reader as the hero image. It turns a few pages by itself to show it's a book,
// then stops for good the moment someone reaches for it.
export function LandingBook() {
  const reduce = useReducedMotion();
  const touched = useRef(false);
  const trim = TRIMS.a5;

  useEffect(() => {
    const reader = useReaderStore.getState();
    reader.setLeafCount(LEAVES);
    reader.setOpened(0);
    if (reduce) return;

    const timers: number[] = [];
    for (let i = 0; i < AUTO_TURNS; i++) {
      timers.push(
        window.setTimeout(() => {
          if (!touched.current) useReaderStore.getState().turnNext();
        }, FIRST_TURN_MS + i * TURN_EVERY_MS),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduce]);

  return (
    <figure className="flex flex-col gap-3">
      <div
        className="relative aspect-[5/4] overflow-hidden rounded-xl bg-muted lg:aspect-[16/10]"
        onPointerDown={() => {
          touched.current = true;
        }}
      >
        <ReaderScene widthMm={trim.widthMm} heightMm={trim.heightMm} leafCount={LEAVES} cameraRest={CAMERA} />
      </div>
      <figcaption className="text-center text-xs text-subtle-foreground">Drag a page to turn it.</figcaption>
    </figure>
  );
}
