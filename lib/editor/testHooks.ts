import type { FabricObject } from "fabric";
import { layerIdOf } from "@/lib/editor/fabric/objects";
import type { StageController } from "@/lib/editor/fabric/StageController";
import { useEditorStore } from "@/stores/editor";

// Dev-only handles for the Playwright suite (e2e/), so tests can compare what Fabric draws with
// what the document says. Never attached in production builds.

declare global {
  interface Window {
    __zine?: {
      store: typeof useEditorStore;
      stage: StageController | null;
      idOf: (obj: FabricObject) => string | undefined;
    };
  }
}

export function exposeForTests(stage: StageController | null): void {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
  window.__zine = { store: useEditorStore, stage, idOf: layerIdOf };
}
