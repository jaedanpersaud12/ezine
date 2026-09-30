"use client";

import { useEffect } from "react";
import { stageAction } from "@/lib/editor/commands";
import { useEditorStore, type Tool } from "@/stores/editor";

const TOOL_KEYS: Record<string, Tool> = {
  v: "select",
  h: "hand",
  t: "text",
  r: "rect",
  o: "ellipse",
  y: "triangle",
  l: "line",
  p: "draw",
};

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
  );
}

// Global editor keys. Anything typed into a field (including Fabric's hidden textarea while
// editing text) is left alone.
export function useEditorShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const s = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === "k") {
        e.preventDefault();
        s.setCommandOpen(!s.commandOpen);
        return;
      }
      if (isTyping(e.target) || s.commandOpen || s.previewOpen) return;

      if (mod) {
        const handled = (() => {
          if (key === "z" && e.shiftKey) return s.redo(), true;
          if (key === "z") return s.undo(), true;
          if (key === "y") return s.redo(), true;
          if (key === "d") return s.duplicateSelected(), true;
          if (key === "c") return s.copySelected(), true;
          if (key === "a") {
            const layers = s.zine?.spreads[s.spreadIndex].layers ?? [];
            s.select(layers.filter((l) => !l.locked && !l.hidden).map((l) => l.id));
            return true;
          }
          if (e.altKey && e.key === "ArrowLeft") return s.moveSelectedToSpread(-1), true;
          if (e.altKey && e.key === "ArrowRight") return s.moveSelectedToSpread(1), true;
          if (key === "]") return s.arrangeSelected(e.shiftKey ? "front" : "forward"), true;
          if (key === "[") return s.arrangeSelected(e.shiftKey ? "back" : "backward"), true;
          if (key === "l" && e.shiftKey) return s.patchLayers(s.selection, { locked: true }), true;
          if (key === "h" && e.shiftKey) return s.patchLayers(s.selection, { hidden: true }), true;
          if (key === ";" && e.shiftKey) return s.toggleSnapping(), true;
          if (key === ";") return s.toggleGuides(), true;
          if (key === "0") return stageAction("actual"), true;
          if (key === "=" || key === "+") return stageAction("zoom-in"), true;
          if (key === "-") return stageAction("zoom-out"), true;
          if (key === "enter") return s.setPreviewOpen(true), true;
          return false;
        })();
        if (handled) e.preventDefault();
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        s.removeSelected();
        return;
      }
      if (e.key === "Escape") {
        if (s.selection.length) s.select([]);
        else s.setTool("select");
        return;
      }
      if (e.key === "PageDown") return s.setSpread(s.spreadIndex + 1);
      if (e.key === "PageUp") return s.setSpread(s.spreadIndex - 1);
      if (e.key === "!" || (e.shiftKey && e.code === "Digit1")) return stageAction("fit");

      if (e.key.startsWith("Arrow") && s.selection.length) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        s.change(
          (z) => {
            for (const l of z.spreads[s.spreadIndex].layers) {
              if (s.selection.includes(l.id) && !l.locked) {
                l.x += dx;
                l.y += dy;
              }
            }
          },
          { key: "nudge" },
        );
        return;
      }

      if (e.shiftKey || e.altKey) return;
      if (key === "i") {
        document.getElementById("zine-file-input")?.click();
        return;
      }
      const tool = TOOL_KEYS[key];
      if (tool) s.setTool(tool);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
