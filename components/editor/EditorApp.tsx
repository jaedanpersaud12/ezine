"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { CommandMenu } from "@/components/editor/CommandMenu";
import { Inspector } from "@/components/editor/Inspector";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { PreviewOverlay } from "@/components/editor/PreviewOverlay";
import { SpreadStrip } from "@/components/editor/SpreadStrip";
import { Stage } from "@/components/editor/Stage";
import { Toolbar } from "@/components/editor/Toolbar";
import { TopBar } from "@/components/editor/TopBar";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";
import { loadZine, saveZine } from "@/lib/editor/persist";
import { newZine } from "@/lib/zine/create";
import { useEditorStore } from "@/stores/editor";

const AUTOSAVE_MS = 800;

// Load the working zine from this browser, then save it shortly after every change.
function usePersistence(): void {
  useEffect(() => {
    let cancelled = false;
    void loadZine().then((saved) => {
      if (!cancelled) useEditorStore.getState().load(saved ?? newZine());
    });

    let timer: number | undefined;
    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (!state.zine || state.zine === prev.zine || !prev.zine) return;
      window.clearTimeout(timer);
      useEditorStore.getState().setSaveState("saving");
      const zine = state.zine;
      timer = window.setTimeout(() => {
        saveZine(zine)
          .then(() => useEditorStore.getState().setSaveState("saved"))
          .catch((error: unknown) => {
            console.error("Autosave failed", error);
            useEditorStore.getState().setSaveState("error");
          });
      }, AUTOSAVE_MS);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}

export function EditorApp() {
  usePersistence();
  useEditorShortcuts();
  const ready = useEditorStore((s) => s.zine !== null);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1">
            {ready ? <Stage /> : <div className="flex-1 bg-muted" />}
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
              <Toolbar />
            </div>
          </div>
          <div className="h-28 shrink-0 border-t border-border bg-card">
            <SpreadStrip />
          </div>
        </div>
        <motion.aside
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          className="flex w-72 shrink-0 flex-col border-l border-border bg-card text-card-foreground"
        >
          <Inspector />
          <div className="flex max-h-[42%] min-h-32 flex-col border-t border-border">
            <LayersPanel />
          </div>
        </motion.aside>
      </div>
      <CommandMenu />
      <PreviewOverlay />
    </div>
  );
}
