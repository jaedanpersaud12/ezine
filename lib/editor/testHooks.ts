import { useSyncExternalStore } from "react";
import type { FabricObject } from "fabric";
import { layerIdOf } from "@/lib/editor/fabric/objects";
import type { StageController } from "@/lib/editor/fabric/StageController";
import { useEditorStore } from "@/stores/editor";

// Dev-only handles for the Playwright suite (e2e/), so tests can compare what Fabric draws with
// what the document says. Never attached in production builds.

// Parts of the editor a test can make throw while rendering, to exercise their error boundaries.
export type CrashTarget = "stage" | "preview";

declare global {
  interface Window {
    __zine?: {
      store: typeof useEditorStore;
      stage: StageController | null;
      idOf: (obj: FabricObject) => string | undefined;
      // Armed until disarmed: React retries a failed render once, so a one-shot throw wouldn't
      // reach the boundary.
      crash: (target: CrashTarget, armed?: boolean) => void;
    };
  }
}

const DEV = process.env.NODE_ENV !== "production";
const armedCrashes = new Set<CrashTarget>();
const crashListeners = new Set<() => void>();

function setCrash(target: CrashTarget, armed = true): void {
  if (armed) armedCrashes.add(target);
  else armedCrashes.delete(target);
  for (const listener of crashListeners) listener();
}

function subscribeCrashes(listener: () => void): () => void {
  crashListeners.add(listener);
  return () => crashListeners.delete(listener);
}

// Throws during render while a test has this target armed. A no-op in production.
export function useTestCrash(target: CrashTarget): void {
  const armed = useSyncExternalStore(
    subscribeCrashes,
    () => DEV && armedCrashes.has(target),
    () => false,
  );
  if (armed) throw new Error(`Test crash: ${target}`);
}

export function exposeForTests(stage: StageController | null): void {
  if (!DEV || typeof window === "undefined") return;
  window.__zine = { store: useEditorStore, stage, idOf: layerIdOf, crash: setCrash };
}
