"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FilterToggleProps = {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
};

// A labelled on/off chip for image treatments.
export function FilterToggle({ label, pressed, onPressedChange, children }: FilterToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "flex h-7 items-center justify-center gap-1.5 rounded-md bg-muted/70 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-3.5",
        pressed && "bg-foreground text-background hover:bg-foreground/90 hover:text-background",
      )}
    >
      {children}
      {label}
    </button>
  );
}
