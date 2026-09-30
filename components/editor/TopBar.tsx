"use client";

import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Command, Grid2x2, Redo2, Undo2 } from "lucide-react";
import { Tooltip, TooltipGroup } from "@/components/interior/tooltip-group";
import { Button } from "@/components/ui/button";
import { pageCount } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";
import { cn } from "@/lib/utils";

const SAVE_LABEL = { idle: "", saving: "Saving…", saved: "Saved", error: "Not saved" } as const;

function BarButton({
  label,
  shortcut,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip
      side="bottom"
      label={
        <span className="flex items-center gap-2">
          {label}
          {shortcut ? <kbd className="font-mono text-[10px] opacity-60">{shortcut}</kbd> : null}
        </span>
      }
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4",
          pressed && "text-foreground",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function TopBar() {
  const zine = useEditorStore((s) => s.zine);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const saveState = useEditorStore((s) => s.saveState);
  const showGuides = useEditorStore((s) => s.showGuides);
  const { undo, redo, toggleGuides, setCommandOpen, setPreviewOpen, change } = useEditorStore.getState();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-3 text-card-foreground">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-[13px] font-bold text-primary-foreground" aria-hidden>
          z
        </span>
        <input
          aria-label="Zine title"
          value={zine?.title ?? ""}
          onChange={(e) =>
            change(
              (z) => {
                z.title = e.target.value;
              },
              { key: "title" },
            )
          }
          className="min-w-0 max-w-72 rounded-md bg-transparent px-2 py-1 text-sm font-medium text-foreground outline-none hover:bg-muted focus:bg-muted focus:ring-1 focus:ring-ring"
        />
        {zine ? (
          <span className="hidden text-xs text-subtle-foreground tabular-nums sm:inline">
            {pageCount(zine)} pages · {zine.trim.widthMm} × {zine.trim.heightMm} mm
          </span>
        ) : null}
        <AnimatePresence mode="wait">
          {SAVE_LABEL[saveState] ? (
            <motion.span
              key={saveState}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className={cn("text-xs", saveState === "error" ? "text-destructive" : "text-subtle-foreground")}
            >
              {SAVE_LABEL[saveState]}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <TooltipGroup className="flex items-center gap-0.5">
        <BarButton label="Undo" shortcut="⌘Z" onClick={undo} disabled={!canUndo}>
          <Undo2 />
        </BarButton>
        <BarButton label="Redo" shortcut="⇧⌘Z" onClick={redo} disabled={!canRedo}>
          <Redo2 />
        </BarButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <BarButton label={showGuides ? "Hide guides" : "Show guides"} shortcut="⌘;" onClick={toggleGuides} pressed={showGuides}>
          <Grid2x2 />
        </BarButton>
        <BarButton label="Commands" shortcut="⌘K" onClick={() => setCommandOpen(true)}>
          <Command />
        </BarButton>
      </TooltipGroup>

      <Button size="sm" onClick={() => setPreviewOpen(true)} className="gap-1.5">
        <BookOpen /> Preview
      </Button>
    </header>
  );
}
