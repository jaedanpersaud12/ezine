"use client";

import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Circle,
  Hand,
  ImagePlus,
  Minus,
  MousePointer2,
  PenLine,
  Square,
  Triangle,
  Type,
} from "lucide-react";
import { Tooltip, TooltipGroup } from "@/components/interior/tooltip-group";
import { SliderDetents } from "@/components/interior/slider-detents";
import { ColorField } from "@/components/editor/fields/ColorField";
import { importFiles } from "@/lib/editor/imports";
import { useEditorStore, type Tool } from "@/stores/editor";
import { cn } from "@/lib/utils";

type ToolDef = { id: Tool; label: string; key: string; icon: ReactNode };

const TOOLS: ToolDef[][] = [
  [
    { id: "select", label: "Select", key: "V", icon: <MousePointer2 /> },
    { id: "hand", label: "Hand", key: "H", icon: <Hand /> },
  ],
  [
    { id: "text", label: "Text", key: "T", icon: <Type /> },
    { id: "rect", label: "Rectangle", key: "R", icon: <Square /> },
    { id: "ellipse", label: "Ellipse", key: "O", icon: <Circle /> },
    { id: "triangle", label: "Triangle", key: "Y", icon: <Triangle /> },
    { id: "line", label: "Line", key: "L", icon: <Minus /> },
    { id: "draw", label: "Draw", key: "P", icon: <PenLine /> },
  ],
];

const SPRING = { type: "spring", stiffness: 500, damping: 38, mass: 0.6 } as const;

function ToolButton({ tool, active, onClick }: { tool: ToolDef; active: boolean; onClick: () => void }) {
  return (
    <Tooltip
      label={
        <span className="flex items-center gap-2">
          {tool.label}
          <kbd className="font-mono text-[10px] opacity-60">{tool.key}</kbd>
        </span>
      }
    >
      <button
        type="button"
        aria-label={tool.label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_svg]:relative [&_svg]:size-[17px]",
          active && "text-primary-foreground hover:text-primary-foreground",
        )}
      >
        {active ? (
          <motion.span layoutId="tool-pill" transition={SPRING} className="absolute inset-0 rounded-[10px] bg-primary" />
        ) : null}
        {tool.icon}
      </button>
    </Tooltip>
  );
}

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const brush = useEditorStore((s) => s.brush);
  const setTool = useEditorStore((s) => s.setTool);
  const setBrush = useEditorStore((s) => s.setBrush);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pointer-events-none flex flex-col items-center gap-2">
      <AnimatePresence>
        {tool === "draw" ? (
          <motion.div
            key="brush"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={SPRING}
            className="pointer-events-auto flex w-80 items-center gap-3 rounded-xl bg-popover/95 px-3 py-2 shadow-popover backdrop-blur"
          >
            <div className="w-28 shrink-0">
              <ColorField label="Brush colour" side="top" value={brush.color} onChange={(c) => c && setBrush({ color: c })} />
            </div>
            <SliderDetents
              label="Size"
              value={brush.widthMm}
              min={0.2}
              max={12}
              step={0.1}
              detents={[0.5, 1.2, 3, 6]}
              format={(v) => `${v.toFixed(1)} mm`}
              onValueChange={(v) => setBrush({ widthMm: v })}
              haptic={false}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <TooltipGroup className="pointer-events-auto flex items-center gap-1 rounded-2xl bg-popover/95 p-1.5 shadow-popover backdrop-blur">
        {TOOLS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 ? <span className="mx-1 h-5 w-px bg-border" aria-hidden /> : null}
            {group.map((t) => (
              <ToolButton key={t.id} tool={t} active={tool === t.id} onClick={() => setTool(t.id)} />
            ))}
          </div>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Tooltip
          label={
            <span className="flex items-center gap-2">
              Image or font
              <kbd className="font-mono text-[10px] opacity-60">I</kbd>
            </span>
          }
        >
          <button
            type="button"
            aria-label="Add image or font"
            onClick={() => fileRef.current?.click()}
            className="flex size-9 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-[17px]"
          >
            <ImagePlus />
          </button>
        </Tooltip>
        <input
          ref={fileRef}
          id="zine-file-input"
          type="file"
          multiple
          accept="image/*,.otf,.ttf,.woff,.woff2"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void importFiles(files);
          }}
        />
      </TooltipGroup>
    </div>
  );
}
