"use client";

import { useEffect, useState } from "react";
import { CanvasBoundary } from "@/components/editor/CanvasBoundary";
import { CommandMenu } from "@/components/editor/CommandMenu";
import { PreviewOverlay } from "@/components/editor/PreviewOverlay";
import { Sidebar } from "@/components/editor/Sidebar";
import { SpreadStrip } from "@/components/editor/SpreadStrip";
import { Stage } from "@/components/editor/Stage";
import { Toolbar } from "@/components/editor/Toolbar";
import { TopBar } from "@/components/editor/TopBar";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";
import { markUploaded, saveCloudZine } from "@/lib/editor/cloud";
import { clearPending, loadPending, loadZine, savePending, saveZine } from "@/lib/editor/persist";
import { toSaveFailure } from "@/lib/editor/saveError";
import { newZine } from "@/lib/zine/create";
import type { Zine } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

// Where the document lives: this browser only, or the signed-in account.
export type EditorSource = { kind: "local" } | { kind: "cloud"; zine: Zine };

type Props = {
  source: EditorSource;
};

const AUTOSAVE_MS = 800;
// After a failed save (offline, a dropped upload), try again on this delay without waiting for an edit.
const RETRY_MS = 5000;

// An account save: a local copy first, so nothing is lost if the server doesn't take it.
async function saveCloud(zine: Zine): Promise<void> {
  await savePending(zine).catch((error: unknown) => console.error("Could not keep an unsaved copy", error));
  await saveCloudZine(zine);
  await clearPending(zine).catch((error: unknown) => console.error("Could not clear the unsaved copy", error));
}

// Load the zine, then save it shortly after every change. Saves run one at a time so a slow
// request can't land after (and overwrite) a newer one.
function usePersistence(source: EditorSource): void {
  useEffect(() => {
    let cancelled = false;
    const save = source.kind === "cloud" ? saveCloud : saveZine;

    let timer: number | undefined;
    let queue = Promise.resolve();
    const flush = (): void => {
      window.clearTimeout(timer);
      timer = undefined;
      queue = queue.then(async () => {
        const zine = useEditorStore.getState().zine;
        if (!zine) return;
        try {
          await save(zine);
          // Only "saved" if nothing changed while the request was in flight.
          if (useEditorStore.getState().zine === zine) useEditorStore.getState().setSaveState("saved");
        } catch (error) {
          console.error("Autosave failed", error);
          useEditorStore.getState().setSaveState("error", toSaveFailure(error));
          if (!cancelled && timer === undefined) timer = window.setTimeout(flush, RETRY_MS);
        }
      });
    };
    if (source.kind === "cloud") {
      markUploaded(source.zine);
      // Edits this browser couldn't get to the server last time win over the server's copy.
      void loadPending(source.zine.id, source.zine.updatedAt).then((pending) => {
        if (cancelled) return;
        useEditorStore.getState().load(pending ?? source.zine);
        if (pending) {
          useEditorStore.getState().setSaveState("saving");
          flush();
        }
      });
    } else {
      void loadZine().then((saved) => {
        if (!cancelled) useEditorStore.getState().load(saved ?? newZine());
      });
    }

    // The save status's Retry (and signing back in) saves straight away.
    useEditorStore.setState({
      retrySave: () => {
        useEditorStore.getState().setSaveState("saving");
        flush();
      },
    });
    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (!state.zine || state.zine === prev.zine || !prev.zine) return;
      window.clearTimeout(timer);
      useEditorStore.getState().setSaveState("saving");
      timer = window.setTimeout(flush, AUTOSAVE_MS);
    });

    const warn = (e: BeforeUnloadEvent): void => {
      const state = useEditorStore.getState().saveState;
      if (state === "saving" || state === "error") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    // Back online: don't wait out the retry delay.
    const online = (): void => {
      if (useEditorStore.getState().saveState === "error") flush();
    };
    window.addEventListener("online", online);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("online", online);
      // Leaving mid-debounce (back to the library, into sign-in): save what's there now.
      if (timer !== undefined) {
        const zine = useEditorStore.getState().zine;
        window.clearTimeout(timer);
        if (zine) void save(zine).catch((error: unknown) => console.error("Save on exit failed", error));
      }
      // The store outlives the editor; don't let the next one open on this document.
      useEditorStore.setState({
        zine: null,
        saveState: "idle",
        saveError: null,
        retrySave: () => {},
        past: [],
        future: [],
        selection: [],
      });
    };
  }, [source]);
}

export function EditorApp({ source }: Props) {
  // Fixed at mount: a server re-render passing a fresh object mustn't reload the document.
  const [initialSource] = useState(source);
  usePersistence(initialSource);
  useEditorShortcuts();
  const ready = useEditorStore((s) => s.zine !== null);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar cloud={initialSource.kind === "cloud"} />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1">
            {ready ? (
              <CanvasBoundary>
                <Stage />
              </CanvasBoundary>
            ) : (
              <div className="flex-1 bg-muted" />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
              <Toolbar />
            </div>
          </div>
          <div className="h-28 shrink-0 border-t border-border bg-card">
            <SpreadStrip />
          </div>
        </div>
        <Sidebar />
      </div>
      <CommandMenu />
      <PreviewOverlay />
    </div>
  );
}
