"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type IconToggleProps = {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
  className?: string;
};

// A small pressable icon button with a sprung press state.
export function IconToggle({ label, pressed, onPressedChange, children, className }: IconToggleProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-3.5",
        pressed && "bg-foreground text-background hover:bg-foreground/90 hover:text-background",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
