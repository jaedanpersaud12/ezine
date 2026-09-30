"use client";

import { useMemo } from "react";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";
import type { ContextMenuItem } from "@/components/interior/context-menu";
import { selectCurrentSpread, useEditorStore } from "@/stores/editor";

// The right-click menu for the current selection, shared by the canvas and the layers panel.
export function useLayerMenu(): ContextMenuItem[] {
  const selection = useEditorStore((s) => s.selection);
  const clipboard = useEditorStore((s) => s.clipboard);
  const spread = useEditorStore(selectCurrentSpread);
  const spreadIndex = useEditorStore((s) => s.spreadIndex);
  const spreadCount = useEditorStore((s) => s.zine?.spreads.length ?? 0);

  return useMemo<ContextMenuItem[]>(() => {
    const s = useEditorStore.getState;
    if (!selection.length) {
      return [
        {
          id: "paste",
          label: "Paste",
          shortcut: "⌘V",
          icon: <ClipboardPaste />,
          disabled: !clipboard.length,
          onSelect: () => s().paste(),
        },
      ];
    }
    const picked = spread?.layers.filter((l) => selection.includes(l.id)) ?? [];
    const locked = picked.length > 0 && picked.every((l) => l.locked);
    const hidden = picked.length > 0 && picked.every((l) => l.hidden);
    return [
      { id: "copy", label: "Copy", shortcut: "⌘C", icon: <Copy />, onSelect: () => s().copySelected() },
      { id: "duplicate", label: "Duplicate", shortcut: "⌘D", icon: <CopyPlus />, onSelect: () => s().duplicateSelected() },
      { id: "sep1", type: "separator" },
      { id: "front", label: "Bring to front", shortcut: "⇧⌘]", icon: <ArrowUpToLine />, onSelect: () => s().arrangeSelected("front") },
      { id: "forward", label: "Bring forward", shortcut: "⌘]", icon: <ChevronUp />, onSelect: () => s().arrangeSelected("forward") },
      { id: "backward", label: "Send backward", shortcut: "⌘[", icon: <ChevronDown />, onSelect: () => s().arrangeSelected("backward") },
      { id: "back", label: "Send to back", shortcut: "⇧⌘[", icon: <ArrowDownToLine />, onSelect: () => s().arrangeSelected("back") },
      { id: "sep2", type: "separator" },
      {
        id: "to-prev",
        label: "Move to previous spread",
        shortcut: "⌥⌘←",
        icon: <ArrowLeftToLine />,
        disabled: spreadIndex === 0,
        onSelect: () => s().moveSelectedToSpread(-1),
      },
      {
        id: "to-next",
        label: "Move to next spread",
        shortcut: "⌥⌘→",
        icon: <ArrowRightToLine />,
        disabled: spreadIndex >= spreadCount - 1,
        onSelect: () => s().moveSelectedToSpread(1),
      },
      { id: "sep2b", type: "separator" },
      {
        id: "lock",
        label: locked ? "Unlock" : "Lock",
        shortcut: "⇧⌘L",
        icon: locked ? <LockOpen /> : <Lock />,
        onSelect: () => s().patchLayers(selection, { locked: !locked }),
      },
      {
        id: "hide",
        label: hidden ? "Show" : "Hide",
        shortcut: "⇧⌘H",
        icon: hidden ? <Eye /> : <EyeOff />,
        onSelect: () => s().patchLayers(selection, { hidden: !hidden }),
      },
      { id: "sep3", type: "separator" },
      { id: "delete", label: "Delete", shortcut: "⌫", icon: <Trash2 />, onSelect: () => s().removeSelected() },
    ];
  }, [selection, clipboard, spread, spreadIndex, spreadCount]);
}
