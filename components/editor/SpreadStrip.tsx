"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { useSpreadThumbnails } from "@/hooks/useSpreadThumbnails";
import { spreadGeometry, spreadLabel } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";
import { cn } from "@/lib/utils";

const THUMB_H = 64;

export function SpreadStrip() {
  const zine = useEditorStore((s) => s.zine);
  const spreadIndex = useEditorStore((s) => s.spreadIndex);
  const setSpread = useEditorStore((s) => s.setSpread);
  const addPages = useEditorStore((s) => s.addPages);
  const thumbs = useSpreadThumbnails(zine);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [spreadIndex]);

  if (!zine) return null;
  const pageW = (zine.trim.widthMm / zine.trim.heightMm) * THUMB_H;

  return (
    <nav aria-label="Spreads" className="scroll-slim flex h-full items-center gap-3 overflow-x-auto px-4">
      {zine.spreads.map((spread, i) => {
        const g = spreadGeometry(zine, i);
        const active = i === spreadIndex;
        const url = thumbs.get(spread.id);
        return (
          <motion.button
            layout
            key={spread.id}
            ref={active ? activeRef : undefined}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-label={spreadLabel(zine, i)}
            onClick={() => setSpread(i)}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
            className="group flex shrink-0 flex-col items-center gap-1.5 outline-none"
          >
            <span
              className={cn(
                "relative block overflow-hidden rounded-[3px] bg-background shadow-border transition-[box-shadow,transform] duration-150 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-ring",
                active && "ring-2 ring-primary ring-offset-2 ring-offset-card",
              )}
              style={{ width: pageW * g.pages, height: THUMB_H }}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element -- local data URL thumbnail
                <img src={url} alt="" draggable={false} className="size-full object-cover" />
              ) : null}
              {g.pages === 2 ? <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/10" aria-hidden /> : null}
            </span>
            <span className={cn("text-[10.5px] tabular-nums", active ? "text-foreground" : "text-subtle-foreground")}>
              {spreadLabel(zine, i)}
            </span>
          </motion.button>
        );
      })}
      <motion.button
        layout
        type="button"
        onClick={addPages}
        aria-label="Add 4 pages"
        title="Add a sheet (4 pages) after this spread"
        whileTap={{ scale: 0.94 }}
        className="flex shrink-0 flex-col items-center gap-1.5 text-subtle-foreground outline-none hover:text-foreground focus-visible:text-foreground"
      >
        <span
          className="flex items-center justify-center rounded-[3px] border border-dashed border-border [&_svg]:size-4"
          style={{ width: pageW, height: THUMB_H }}
        >
          <Plus />
        </span>
        <span className="text-[10.5px]">+4 pages</span>
      </motion.button>
    </nav>
  );
}
