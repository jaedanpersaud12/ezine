"use client";

import { useEffect, useRef, useState } from "react";
import { motion, Reorder } from "motion/react";
import { ArrowLeft, ArrowRight, CopyPlus, Eraser, FilePlus2, Plus, Trash2 } from "lucide-react";
import { ContextMenu, type ContextMenuItem } from "@/components/interior/context-menu";
import { useSpreadThumbnails } from "@/hooks/useSpreadThumbnails";
import { spreadGeometry, spreadLabel, type Spread, type Zine } from "@/lib/zine/schema";
import { removablePair, useEditorStore } from "@/stores/editor";
import { cn } from "@/lib/utils";

const THUMB_H = 64;
const SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;

function spreadMenu(zine: Zine, index: number): ContextMenuItem[] {
  const s = useEditorStore.getState;
  const last = zine.spreads.length - 1;
  const inner = index > 0 && index < last;
  const pair = removablePair(zine, index);
  const pairLabel = pair
    ? `${spreadGeometry(zine, pair[0]).sides[0]}–${spreadGeometry(zine, pair[1]).sides.at(-1)}`
    : "";
  const items: ContextMenuItem[] = [
    { id: "insert", label: "Add 4 pages after", icon: <FilePlus2 />, onSelect: () => s().insertPagesAfter(index) },
  ];
  if (inner) {
    items.push(
      { id: "duplicate", label: "Duplicate (+ blank spread)", icon: <CopyPlus />, onSelect: () => s().duplicateSpread(index) },
      { id: "sep1", type: "separator" },
      { id: "left", label: "Move left", icon: <ArrowLeft />, disabled: index <= 1, onSelect: () => s().moveSpread(index, index - 1) },
      { id: "right", label: "Move right", icon: <ArrowRight />, disabled: index >= last - 1, onSelect: () => s().moveSpread(index, index + 1) },
    );
  }
  items.push(
    { id: "sep2", type: "separator" },
    {
      id: "clear",
      label: "Clear",
      icon: <Eraser />,
      disabled: zine.spreads[index].layers.length === 0 && zine.spreads[index].background === null,
      onSelect: () => s().clearSpread(index),
    },
  );
  if (inner) {
    items.push({
      id: "delete",
      label: pair ? `Delete pages ${pairLabel}` : "Delete (book needs 4+ pages)",
      icon: <Trash2 />,
      disabled: !pair,
      onSelect: () => s().removePages(index),
    });
  }
  return items;
}

type ThumbProps = {
  zine: Zine;
  index: number;
  spread: Spread;
  active: boolean;
  url: string | undefined;
  pageW: number;
  onOpen: () => void;
};

function Thumb({ zine, index, spread, active, url, pageW, onOpen }: ThumbProps) {
  const g = spreadGeometry(zine, index);
  return (
    <ContextMenu items={spreadMenu(zine, index)} label={`${spreadLabel(zine, index)} actions`}>
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        aria-label={spreadLabel(zine, index)}
        onClick={onOpen}
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
            <img src={url} alt="" draggable={false} className="pointer-events-none size-full object-cover" />
          ) : null}
          {g.pages === 2 ? <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/10" aria-hidden /> : null}
          {spread.layers.length === 0 && spread.background === null ? null : (
            <span className="sr-only">{spread.layers.length} layers</span>
          )}
        </span>
        <span className={cn("text-[10.5px] tabular-nums", active ? "text-foreground" : "text-subtle-foreground")}>
          {spreadLabel(zine, index)}
        </span>
      </button>
    </ContextMenu>
  );
}

// Every spread in order. Covers stay put at the ends; inside spreads drag to reorder.
// Right-click any spread for page actions.
export function SpreadStrip() {
  const zine = useEditorStore((s) => s.zine);
  const spreadIndex = useEditorStore((s) => s.spreadIndex);
  const setSpread = useEditorStore((s) => s.setSpread);
  const addPages = useEditorStore((s) => s.addPages);
  const reorderInnerSpreads = useEditorStore((s) => s.reorderInnerSpreads);
  const thumbs = useSpreadThumbnails(zine);
  const navRef = useRef<HTMLElement>(null);
  const [dragOrder, setDragOrder] = useState<Spread[] | null>(null);
  const dragged = useRef(false);

  const keyboardNav = useRef(false);

  useEffect(() => {
    const current = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    // Keep focus on the open spread when it was changed from the keyboard.
    if (keyboardNav.current) current?.focus({ preventScroll: true });
    keyboardNav.current = false;
  }, [spreadIndex, zine?.spreads]);

  if (!zine) return null;
  const pageW = (zine.trim.widthMm / zine.trim.heightMm) * THUMB_H;
  const last = zine.spreads.length - 1;
  const inner = dragOrder ?? zine.spreads.slice(1, -1);
  const activeId = zine.spreads[spreadIndex]?.id;
  const indexOf = (id: string): number => zine.spreads.findIndex((s) => s.id === id);

  const open = (index: number) => (): void => {
    if (dragged.current) return;
    setSpread(index);
  };

  return (
    <nav
      ref={navRef}
      aria-label="Spreads"
      onKeyDown={(e) => {
        // With a thumbnail focused: ←/→ open neighbours, ⌥←/⌥→ move the spread, Home/End jump to the covers.
        const s = useEditorStore.getState();
        const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        if (step && e.altKey) s.moveSpread(spreadIndex, spreadIndex + step);
        else if (step) setSpread(spreadIndex + step);
        else if (e.key === "Home") setSpread(0);
        else if (e.key === "End") setSpread(last);
        else return;
        e.preventDefault();
        e.stopPropagation();
        keyboardNav.current = true;
      }}
      className="scroll-slim flex h-full items-center gap-3 overflow-x-auto px-4"
    >
      <Thumb
        zine={zine}
        index={0}
        spread={zine.spreads[0]}
        active={spreadIndex === 0}
        url={thumbs.get(zine.spreads[0].id)}
        pageW={pageW}
        onOpen={open(0)}
      />
      <Reorder.Group
        as="div"
        axis="x"
        values={inner}
        onReorder={setDragOrder}
        className="flex items-center gap-3"
      >
        {inner.map((spread) => {
          const index = indexOf(spread.id);
          return (
            <Reorder.Item
              as="div"
              key={spread.id}
              value={spread}
              transition={SPRING}
              whileDrag={{ scale: 1.04, zIndex: 10 }}
              onDragStart={() => {
                dragged.current = true;
              }}
              onDragEnd={() => {
                if (dragOrder) reorderInnerSpreads(dragOrder.map((s) => s.id));
                setDragOrder(null);
                // The click that ends a drag shouldn't also open the spread.
                window.setTimeout(() => {
                  dragged.current = false;
                }, 0);
              }}
              className="shrink-0 cursor-grab active:cursor-grabbing"
            >
              <Thumb
                zine={zine}
                index={index}
                spread={spread}
                active={spread.id === activeId}
                url={thumbs.get(spread.id)}
                pageW={pageW}
                onOpen={open(index)}
              />
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
      <Thumb
        zine={zine}
        index={last}
        spread={zine.spreads[last]}
        active={spreadIndex === last}
        url={thumbs.get(zine.spreads[last].id)}
        pageW={pageW}
        onOpen={open(last)}
      />
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
