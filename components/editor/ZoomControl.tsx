"use client";

import { Maximize, Minus, Plus } from "lucide-react";

type ZoomControlProps = {
  percent: number;
  onZoom: (percent: number) => void;
  onFit: () => void;
};

const STEPS = [25, 33, 50, 67, 100, 150, 200, 300, 400, 600, 800, 1200, 1600];

export function ZoomControl({ percent, onZoom, onFit }: ZoomControlProps) {
  const next = STEPS.find((s) => s > percent + 0.5) ?? STEPS.at(-1) ?? percent;
  const prev = [...STEPS].reverse().find((s) => s < percent - 0.5) ?? STEPS[0];

  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg bg-popover/90 p-0.5 text-popover-foreground shadow-popover backdrop-blur">
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => onZoom(prev)}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground [&_svg]:size-3.5"
      >
        <Minus />
      </button>
      <button
        type="button"
        aria-label="Zoom to 100%"
        onClick={() => onZoom(100)}
        className="h-7 min-w-12 rounded-md px-1 font-mono text-[11px] tabular-nums hover:bg-accent"
      >
        {Math.round(percent)}%
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => onZoom(next)}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground [&_svg]:size-3.5"
      >
        <Plus />
      </button>
      <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
      <button
        type="button"
        aria-label="Fit spread"
        title="Fit spread (⇧1)"
        onClick={onFit}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground [&_svg]:size-3.5"
      >
        <Maximize />
      </button>
    </div>
  );
}
