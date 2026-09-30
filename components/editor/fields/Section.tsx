"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionProps = {
  // Stable key for remembering whether it's collapsed.
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

const STORAGE_KEY = "zine:collapsed-sections";

// Per-viewer convenience only: storage can be unavailable (private mode), so every access is guarded.
function readCollapsed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeCollapsed(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Not persisted; the section still toggles for this visit.
  }
}

// One titled, collapsible group in the inspector.
export function Section({ id, title, action, children, className }: SectionProps) {
  const [open, setOpen] = useState(() => !readCollapsed().has(id));

  const toggle = (): void => {
    const next = !open;
    setOpen(next);
    const ids = readCollapsed();
    if (next) ids.delete(id);
    else ids.add(id);
    writeCollapsed(ids);
  };

  return (
    <section className={cn("border-b border-border last:border-b-0", className)}>
      <header className="flex h-10 items-center justify-between pr-3 pl-4">
        <button
          type="button"
          aria-expanded={open}
          onClick={toggle}
          className="group flex h-full min-w-0 flex-1 items-center gap-1.5 text-left outline-none"
        >
          <h3 className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase group-hover:text-foreground group-focus-visible:text-foreground">
            {title}
          </h3>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3 shrink-0 text-subtle-foreground opacity-0 transition-[transform,opacity] duration-150 group-hover:opacity-100 group-focus-visible:opacity-100",
              !open && "-rotate-90 opacity-100",
            )}
          />
        </button>
        {action}
      </header>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 px-4 pb-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

type RowProps = { label?: string; children: ReactNode; className?: string };

export function Row({ label, children, className }: RowProps) {
  return (
    <div className={cn("grid items-center gap-2", label ? "grid-cols-[64px_minmax(0,1fr)]" : "grid-cols-1", className)}>
      {label ? <span className="truncate text-xs text-muted-foreground">{label}</span> : null}
      {children}
    </div>
  );
}
