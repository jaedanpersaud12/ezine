"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { evaluate } from "@/lib/editor/arithmetic";
import { cn } from "@/lib/utils";

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  precision?: number;
  // Pixels of drag per step when scrubbing the label.
  scrubPx?: number;
  className?: string;
  ariaLabel?: string;
};

function clamp(v: number, min?: number, max?: number): number {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
}

function format(v: number, precision: number): string {
  return String(Number(v.toFixed(precision)));
}

// A compact numeric input. Drag the label to scrub, arrow keys nudge (shift ×10), and simple
// arithmetic like "12+4" or "210/2" works when typed.
export function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
  precision = 1,
  scrubPx = 2,
  className,
  ariaLabel,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const scrub = useRef<{ x: number; start: number } | null>(null);

  const commit = (text: string): void => {
    setDraft(null);
    const next = evaluate(text);
    if (next !== null) onChange(clamp(next, min, max));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      setDraft(null);
      e.currentTarget.blur();
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const dir = e.key === "ArrowUp" ? 1 : -1;
      onChange(clamp(value + dir * step * (e.shiftKey ? 10 : 1), min, max));
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLSpanElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrub.current = { x: e.clientX, start: value };
  };
  const onPointerMove = (e: PointerEvent<HTMLSpanElement>): void => {
    if (!scrub.current) return;
    const steps = Math.round((e.clientX - scrub.current.x) / scrubPx);
    onChange(clamp(scrub.current.start + steps * step * (e.shiftKey ? 10 : 1), min, max));
  };
  const onPointerUp = (): void => {
    scrub.current = null;
  };

  return (
    <label
      className={cn(
        "group flex h-7 min-w-0 items-center gap-1.5 rounded-md bg-muted/70 pr-2 text-xs transition-colors focus-within:bg-background focus-within:ring-1 focus-within:ring-ring hover:bg-muted",
        className,
      )}
    >
      <span
        className="flex h-full min-w-6 shrink-0 cursor-ew-resize select-none items-center justify-center pr-0.5 pl-2 text-[11px] font-medium text-subtle-foreground group-hover:text-muted-foreground"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {label}
      </span>
      <input
        aria-label={ariaLabel ?? label}
        inputMode="decimal"
        className="w-full min-w-0 bg-transparent font-mono text-[11.5px] tabular-nums text-foreground outline-none"
        value={draft ?? format(value, precision)}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {unit ? <span className="select-none text-[10.5px] text-subtle-foreground">{unit}</span> : null}
    </label>
  );
}
