"use client";

import dynamic from "next/dynamic";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { TRIMS } from "@/lib/book/trim";
import { useReaderStore } from "@/stores/reader";

// WebGL and canvas textures only exist in the browser.
const ReaderScene = dynamic(() => import("@/components/reader/ReaderScene"), { ssr: false });

export function ReaderSpike() {
  const trimId = useReaderStore((s) => s.trimId);
  const leafCount = useReaderStore((s) => s.leafCount);
  const trim = TRIMS[trimId];

  return (
    <div className="relative h-dvh w-full bg-muted">
      <ReaderScene widthMm={trim.widthMm} heightMm={trim.heightMm} leafCount={leafCount} />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
        <ReaderToolbar />
      </div>
    </div>
  );
}
