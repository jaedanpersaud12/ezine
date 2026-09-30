"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "motion/react";
import { Inspector } from "@/components/editor/Inspector";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { cn } from "@/lib/utils";

const WIDTH = { min: 248, max: 460, initial: 288 };
const LAYERS = { min: 96, initial: 260 };
const STORAGE_KEY = "zine:sidebar";

type Size = { width: number; layers: number };

// Per-viewer layout preference; storage may be unavailable, so every access is guarded.
function readSize(): Size {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Size> | null;
    return { width: saved?.width ?? WIDTH.initial, layers: saved?.layers ?? LAYERS.initial };
  } catch {
    return { width: WIDTH.initial, layers: LAYERS.initial };
  }
}

function writeSize(size: Size): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
  } catch {
    // Keeps working for this visit.
  }
}

type HandleProps = {
  axis: "x" | "y";
  label: string;
  onDrag: (delta: number) => void;
  onEnd: () => void;
  onReset: () => void;
  className?: string;
};

function ResizeHandle({ axis, label, onDrag, onEnd, onReset, className }: HandleProps) {
  const last = useRef<number | null>(null);
  const pos = (e: ReactPointerEvent): number => (axis === "x" ? e.clientX : e.clientY);
  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-label={label}
      title={`${label} · double-click to reset`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = pos(e);
      }}
      onPointerMove={(e) => {
        if (last.current === null) return;
        const p = pos(e);
        onDrag(p - last.current);
        last.current = p;
      }}
      onPointerUp={() => {
        last.current = null;
        onEnd();
      }}
      onDoubleClick={onReset}
      className={cn(
        "group absolute z-20 flex items-center justify-center",
        axis === "x" ? "inset-y-0 -left-1 w-2 cursor-col-resize" : "inset-x-0 -top-1 h-2 cursor-row-resize",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full bg-ring opacity-0 transition-opacity duration-150 group-hover:opacity-60 group-active:opacity-100",
          axis === "x" ? "h-10 w-0.5" : "h-0.5 w-10",
        )}
      />
    </div>
  );
}

// The right-hand panel: inspector over layers. Drag its left edge to widen it, and the line
// above Layers to trade space between the two. Sizes are remembered in this browser.
export function Sidebar() {
  const [size, setSize] = useState<Size>(readSize);
  const asideRef = useRef<HTMLElement>(null);

  const clampLayers = (h: number): number => {
    const total = asideRef.current?.clientHeight ?? 800;
    return Math.min(total - 160, Math.max(LAYERS.min, h));
  };

  return (
    <motion.aside
      ref={asideRef}
      // Opacity only: a transform would re-anchor position: fixed descendants while it animates.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{ width: size.width }}
      className="relative flex shrink-0 flex-col border-l border-border bg-card text-card-foreground"
    >
      <ResizeHandle
        axis="x"
        label="Resize sidebar"
        onDrag={(d) => setSize((s) => ({ ...s, width: Math.min(WIDTH.max, Math.max(WIDTH.min, s.width - d)) }))}
        onEnd={() => setSize((s) => (writeSize(s), s))}
        onReset={() => setSize((s) => {
          const next = { ...s, width: WIDTH.initial };
          writeSize(next);
          return next;
        })}
      />
      <Inspector />
      <div className="relative flex shrink-0 flex-col border-t border-border" style={{ height: size.layers }}>
        <ResizeHandle
          axis="y"
          label="Resize layers panel"
          onDrag={(d) => setSize((s) => ({ ...s, layers: clampLayers(s.layers - d) }))}
          onEnd={() => setSize((s) => (writeSize(s), s))}
          onReset={() => setSize((s) => {
            const next = { ...s, layers: LAYERS.initial };
            writeSize(next);
            return next;
          })}
        />
        <LayersPanel />
      </div>
    </motion.aside>
  );
}
