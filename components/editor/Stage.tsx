"use client";

import { useEffect, useRef, useState } from "react";
import { ContextMenu } from "@/components/interior/context-menu";
import { ZoomControl } from "@/components/editor/ZoomControl";
import { useLayerMenu } from "@/hooks/useLayerMenu";
import { STAGE_EVENT, type StageEventDetail } from "@/lib/editor/commands";
import { StageController } from "@/lib/editor/fabric/StageController";
import type { SheetSpec } from "@/lib/editor/fabric/ZineCanvas";
import { importFiles } from "@/lib/editor/imports";
import { exposeForTests, useTestCrash } from "@/lib/editor/testHooks";
import { spreadGeometry, type Layer } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

// Canvas chrome colours come from the theme so the pasteboard and guides follow light/dark mode.
function themeColors(): Pick<SheetSpec, "pasteboard" | "guide" | "accent"> {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string): string => css.getPropertyValue(name).trim();
  return { pasteboard: v("--muted"), guide: v("--foreground"), accent: v("--info") };
}

export function Stage() {
  useTestCrash("stage");
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [controller, setController] = useState<StageController | null>(null);
  const [zoom, setZoom] = useState(100);
  const [theme, setTheme] = useState<Pick<SheetSpec, "pasteboard" | "guide" | "accent"> | null>(null);

  const zine = useEditorStore((s) => s.zine);
  const spreadIndex = useEditorStore((s) => s.spreadIndex);
  const selection = useEditorStore((s) => s.selection);
  const tool = useEditorStore((s) => s.tool);
  const brush = useEditorStore((s) => s.brush);
  const showGuides = useEditorStore((s) => s.showGuides);
  const snapping = useEditorStore((s) => s.snapping);

  const spread = zine?.spreads[spreadIndex] ?? null;

  // Create the Fabric canvas once.
  useEffect(() => {
    const el = canvasRef.current;
    const host = hostRef.current;
    if (!el || !host) return;
    const store = useEditorStore.getState;
    const stage = new StageController(el, {
      onSelect: (ids) => store().select(ids),
      onTransform: (patches) =>
        store().change((z) => {
          const layers = z.spreads[store().spreadIndex].layers;
          for (const { id, patch } of patches) {
            const layer = layers.find((l) => l.id === id);
            if (layer) Object.assign(layer, patch);
          }
        }),
      onTextInput: (id, text, patch) => {
        const name = text.trim().split("\n")[0].slice(0, 24) || "Text";
        store().patchLayers([id], { ...patch, text, name } as Partial<Layer>, { key: `text:${id}` });
      },
      onTextDone: (id, empty) => {
        if (!empty) return;
        store().select([id]);
        store().removeSelected();
      },
      onCreate: (layer) => store().addLayer(layer),
      onMeasure: (patches) =>
        store().change(
          (z) => {
            for (const spread of z.spreads) {
              for (const layer of spread.layers) {
                const hit = patches.find((p) => p.id === layer.id);
                if (hit) Object.assign(layer, hit.patch);
              }
            }
          },
          { transient: true },
        ),
      onZoom: setZoom,
    });
    setController(stage);
    setTheme(themeColors());
    exposeForTests(stage);

    const ro = new ResizeObserver(([entry]) => {
      stage.resize(Math.floor(entry.contentRect.width), Math.floor(entry.contentRect.height));
    });
    ro.observe(host);

    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = (): void => setTheme(themeColors());
    scheme.addEventListener("change", onScheme);

    return () => {
      ro.disconnect();
      scheme.removeEventListener("change", onScheme);
      stage.dispose();
      setController(null);
      exposeForTests(null);
    };
  }, []);

  // Sheet: trim, bleed, paper, guides.
  useEffect(() => {
    if (!controller || !zine || !spread || !theme) return;
    const g = spreadGeometry(zine, spreadIndex);
    controller.setSheet({
      widthMm: g.widthMm,
      heightMm: g.heightMm,
      pages: g.pages,
      bleedMm: zine.bleedMm,
      safeMm: zine.safeMm,
      paper: zine.paper.color,
      background: spread.background,
      showGuides,
      ...theme,
    });
  }, [controller, zine, spread, spreadIndex, showGuides, theme]);

  useEffect(() => {
    if (controller && zine && spread) controller.setSpread(zine, spread.id, spread.layers);
  }, [controller, zine, spread]);

  useEffect(() => {
    controller?.setSelection(selection);
  }, [controller, selection]);

  useEffect(() => {
    controller?.setTool(tool, brush);
  }, [controller, tool, brush]);

  useEffect(() => {
    controller?.setSnapping(snapping);
  }, [controller, snapping]);

  // Space bar pans while held, like every design tool.
  useEffect(() => {
    if (!controller) return;
    const typing = (t: EventTarget | null): boolean =>
      t instanceof HTMLElement && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    const down = (e: KeyboardEvent): void => {
      if (e.code === "Space" && !e.repeat && !typing(e.target)) {
        e.preventDefault();
        controller.setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent): void => {
      if (e.code === "Space") controller.setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [controller]);

  // Zoom commands from the keyboard and command menu.
  useEffect(() => {
    if (!controller) return;
    const onStage = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return;
      const { action } = e.detail as StageEventDetail;
      if (action === "fit") controller.fit();
      if (action === "actual") controller.zoomTo(100);
      if (action === "zoom-in") controller.zoomTo(controller.zoomPercent() * 1.25);
      if (action === "zoom-out") controller.zoomTo(controller.zoomPercent() / 1.25);
    };
    window.addEventListener(STAGE_EVENT, onStage);
    return () => window.removeEventListener(STAGE_EVENT, onStage);
  }, [controller]);

  // Pasted images land in the middle of the spread; anything else pastes copied layers.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent): void => {
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      e.preventDefault();
      if (files.length) void importFiles(files);
      else useEditorStore.getState().paste();
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const menu = useLayerMenu();

  return (
    <div
      ref={hostRef}
      className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-muted"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={(e) => {
        const files = Array.from(e.dataTransfer.files);
        if (!files.length || !controller) return;
        e.preventDefault();
        const p = controller.sceneFromClient(e.clientX, e.clientY);
        void importFiles(files, { x: p.x, y: p.y });
      }}
    >
      <ContextMenu items={menu} label="Layer actions" className="absolute inset-0">
        <canvas ref={canvasRef} />
      </ContextMenu>
      <div className="pointer-events-none absolute right-3 bottom-3">
        <ZoomControl
          percent={zoom}
          onZoom={(p) => controller?.zoomTo(p)}
          onFit={() => controller?.fit()}
        />
      </div>
    </div>
  );
}
