"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { renderPages } from "@/lib/editor/render";
import { leafCount, type Zine } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";
import { useReaderStore } from "@/stores/reader";

const ReaderScene = dynamic(() => import("@/components/reader/ReaderScene"), { ssr: false });

// Page texture resolution: 5 px/mm ≈ 127 dpi, plenty for a book on screen.
const PREVIEW_PX_PER_MM = 5;

type Rendered = { zine: Zine; pages: Map<number, HTMLCanvasElement> };

export function PreviewOverlay() {
  const open = useEditorStore((s) => s.previewOpen);
  const setOpen = useEditorStore((s) => s.setPreviewOpen);
  const [rendered, setRendered] = useState<Rendered | null>(null);
  // Stable per render pass, so the book only rebuilds when the pages do.
  const pageImage = useMemo(() => (rendered ? (side: number) => rendered.pages.get(side) : undefined), [rendered]);

  // Render every page from the current document each time the preview opens.
  useEffect(() => {
    if (!open) return;
    const zine = useEditorStore.getState().zine;
    if (!zine) return;
    let cancelled = false;
    useReaderStore.getState().setLeafCount(leafCount(zine));
    renderPages(zine, PREVIEW_PX_PER_MM)
      .then((pages) => {
        if (!cancelled) setRendered({ zine, pages });
      })
      .catch((error: unknown) => console.error("Preview render failed", error));
    return () => {
      cancelled = true;
      setRendered(null);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="preview"
          role="dialog"
          aria-modal
          aria-label="3D preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          className="fixed inset-0 z-40 bg-muted"
        >
          {rendered ? (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <ReaderScene
                widthMm={rendered.zine.trim.widthMm}
                heightMm={rendered.zine.trim.heightMm}
                leafCount={leafCount(rendered.zine)}
                pageImage={pageImage}
                version={rendered.zine.updatedAt}
              />
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                className="text-sm text-muted-foreground"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                Binding your zine…
              </motion.span>
            </div>
          )}

          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-popover/90 text-foreground shadow-popover backdrop-blur transition-transform hover:scale-105 [&_svg]:size-4"
          >
            <X />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
            <ReaderToolbar bookControls={false} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
