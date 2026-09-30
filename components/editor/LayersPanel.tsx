"use client";

import { useState, type MouseEvent } from "react";
import { Reorder } from "motion/react";
import { Eye, EyeOff, Image as ImageIcon, Lock, LockOpen, PenLine, Shapes, Type } from "lucide-react";
import { ContextMenu } from "@/components/interior/context-menu";
import { useReorderList } from "@/components/interior/reorder-list";
import { useLayerMenu } from "@/hooks/useLayerMenu";
import type { Layer } from "@/lib/zine/schema";
import { selectCurrentSpread, useEditorStore } from "@/stores/editor";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<Layer["kind"], React.ReactNode> = {
  image: <ImageIcon />,
  text: <Type />,
  shape: <Shapes />,
  draw: <PenLine />,
};

const SPRING = { type: "spring", stiffness: 600, damping: 40, mass: 0.5 } as const;

// Topmost layer first, like every design tool. Drag or keyboard (Space, arrows) to restack.
export function LayersPanel() {
  const spread = useEditorStore(selectCurrentSpread);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const patchLayers = useEditorStore((s) => s.patchLayers);
  const reorderLayers = useEditorStore((s) => s.reorderLayers);
  const [dragOrder, setDragOrder] = useState<Layer[] | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const menu = useLayerMenu();

  const stacked = [...(spread?.layers ?? [])].reverse();
  const items = dragOrder ?? stacked;

  const list = useReorderList<Layer>({
    items,
    getId: (l) => l.id,
    getLabel: (l) => l.name,
    onReorder: setDragOrder,
    onCommit: (next) => {
      reorderLayers([...next].reverse().map((l) => l.id));
      setDragOrder(null);
    },
  });

  const onRowClick = (e: MouseEvent, id: string): void => {
    if (e.shiftKey || e.metaKey) select(selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]);
    else select([id]);
  };

  return (
    <div className="flex min-h-0 flex-col">
      <header className="flex h-10 shrink-0 items-center justify-between px-4">
        <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Layers</h3>
        <span className="font-mono text-[10.5px] text-subtle-foreground tabular-nums">{items.length}</span>
      </header>
      {items.length === 0 ? (
        <p className="px-4 pb-4 text-xs leading-relaxed text-subtle-foreground">
          Nothing here yet. Drop images on the page, or pick a tool below.
        </p>
      ) : (
        <ContextMenu items={menu} label="Layer actions" className="scroll-slim min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <Reorder.Group axis="y" values={items} onReorder={setDragOrder} aria-label="Layers">
          {items.map((layer) => {
            const active = selection.includes(layer.id);
            const lifted = list.grabbed === layer.id || list.dragging === layer.id;
            return (
              <Reorder.Item
                key={layer.id}
                value={layer}
                transition={SPRING}
                onDragStart={() => list.onDragStart(layer.id)}
                onDragEnd={() => list.onDragEnd(layer.id)}
                onKeyDown={list.rowKeyDown(layer.id)}
                tabIndex={0}
                aria-selected={active}
                aria-label={layer.name}
                onClick={(e) => onRowClick(e, layer.id)}
                onContextMenu={() => {
                  // Right-click acts on the row under the pointer, like the canvas.
                  if (!selection.includes(layer.id)) select([layer.id]);
                }}
                onDoubleClick={() => setRenaming(layer.id)}
                className={cn(
                  "group relative flex h-8 cursor-default items-center gap-2 rounded-md pr-1 pl-2 text-[13px] outline-none select-none focus-visible:ring-1 focus-visible:ring-ring",
                  active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
                  lifted && "z-10 bg-popover shadow-popover",
                  layer.hidden && "opacity-50",
                )}
              >
                <span className={cn("shrink-0 [&_svg]:size-3.5", active ? "text-foreground" : "text-subtle-foreground")}>
                  {KIND_ICON[layer.kind]}
                </span>
                {renaming === layer.id ? (
                  <input
                    autoFocus
                    aria-label="Layer name"
                    defaultValue={layer.name}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.target.select()}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== layer.name) patchLayers([layer.id], { name });
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    className="h-6 min-w-0 flex-1 rounded bg-background px-1.5 text-[13px] text-foreground outline-none ring-1 ring-ring"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate" title="Double-click to rename">
                    {layer.name}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={layer.locked ? "Unlock" : "Lock"}
                  onClick={(e) => {
                    e.stopPropagation();
                    patchLayers([layer.id], { locked: !layer.locked });
                  }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded text-subtle-foreground hover:text-foreground [&_svg]:size-3.5",
                    !layer.locked && "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                  )}
                >
                  {layer.locked ? <Lock /> : <LockOpen />}
                </button>
                <button
                  type="button"
                  aria-label={layer.hidden ? "Show" : "Hide"}
                  onClick={(e) => {
                    e.stopPropagation();
                    patchLayers([layer.id], { hidden: !layer.hidden });
                  }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded text-subtle-foreground hover:text-foreground [&_svg]:size-3.5",
                    !layer.hidden && "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                  )}
                >
                  {layer.hidden ? <EyeOff /> : <Eye />}
                </button>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
        </ContextMenu>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {list.spoken}
      </span>
    </div>
  );
}
