import { create } from "zustand";
import { produce, type Draft } from "immer";
import { cloneLayer, newSpread } from "@/lib/zine/create";
import { DEFAULT_INK } from "@/lib/zine/palettes";
import type { Layer, Spread, Zine } from "@/lib/zine/schema";

export type Tool = "select" | "hand" | "text" | "rect" | "ellipse" | "triangle" | "line" | "draw";
export type ShapeTool = Extract<Tool, "rect" | "ellipse" | "triangle" | "line">;
export type Arrange = "front" | "forward" | "backward" | "back";
export type SaveState = "idle" | "saving" | "saved" | "error";

const HISTORY_LIMIT = 200;
// Changes sharing a key within this window (a slider drag, typing) undo as one step.
const COALESCE_MS = 700;

type ChangeOptions = {
  // Groups rapid edits into one undo step.
  key?: string;
  // Skip history entirely (e.g. a live preview that's committed separately).
  transient?: boolean;
};

type EditorState = {
  zine: Zine | null;
  spreadIndex: number;
  selection: string[];
  tool: Tool;
  brush: { color: string; widthMm: number };
  showGuides: boolean;
  previewOpen: boolean;
  commandOpen: boolean;
  saveState: SaveState;
  past: Zine[];
  future: Zine[];
  lastChange: { key: string | null; at: number };
  clipboard: Layer[];

  load: (zine: Zine) => void;
  change: (recipe: (zine: Draft<Zine>) => void, options?: ChangeOptions) => void;
  undo: () => void;
  redo: () => void;

  setSpread: (index: number) => void;
  select: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
  setBrush: (brush: Partial<EditorState["brush"]>) => void;
  toggleGuides: () => void;
  setPreviewOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setSaveState: (state: SaveState) => void;

  addLayer: (layer: Layer) => void;
  patchLayers: (ids: string[], patch: Partial<Layer>, options?: ChangeOptions) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  paste: () => void;
  arrangeSelected: (to: Arrange) => void;
  reorderLayers: (orderedIds: string[]) => void;
  addPages: () => void;
  removePages: (spreadIndex: number) => void;
};

function spreadOf(zine: Zine | Draft<Zine>, index: number): Spread | Draft<Spread> {
  return zine.spreads[Math.min(index, zine.spreads.length - 1)];
}

// Which inner spreads a "remove pages" on `index` takes out: saddle stitch removes a whole sheet (4 pages).
export function removablePair(zine: Zine, index: number): [number, number] | null {
  const last = zine.spreads.length - 1;
  if (last < 4 || index <= 0 || index >= last) return null;
  return index + 1 < last ? [index, index + 1] : [index - 1, index];
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  zine: null,
  spreadIndex: 0,
  selection: [],
  tool: "select",
  brush: { color: DEFAULT_INK, widthMm: 1.2 },
  showGuides: true,
  previewOpen: false,
  commandOpen: false,
  saveState: "idle",
  past: [],
  future: [],
  lastChange: { key: null, at: 0 },
  clipboard: [],

  load: (zine) => set({ zine, past: [], future: [], selection: [], spreadIndex: 0 }),

  change: (recipe, options = {}) => {
    const { zine, past, lastChange } = get();
    if (!zine) return;
    const next = produce(zine, (draft) => {
      recipe(draft);
      draft.updatedAt = new Date().toISOString();
    });
    if (next === zine) return;

    const now = Date.now();
    const coalesce = options.key !== undefined && options.key === lastChange.key && now - lastChange.at < COALESCE_MS;
    if (options.transient || coalesce) {
      set({ zine: next, lastChange: { key: options.key ?? null, at: now } });
      return;
    }
    set({
      zine: next,
      past: [...past, zine].slice(-HISTORY_LIMIT),
      future: [],
      lastChange: { key: options.key ?? null, at: now },
    });
  },

  undo: () => {
    const { zine, past, future } = get();
    const previous = past.at(-1);
    if (!zine || !previous) return;
    set({
      zine: previous,
      past: past.slice(0, -1),
      future: [zine, ...future],
      lastChange: { key: null, at: 0 },
      spreadIndex: Math.min(get().spreadIndex, previous.spreads.length - 1),
    });
  },

  redo: () => {
    const { zine, past, future } = get();
    const next = future[0];
    if (!zine || !next) return;
    set({
      zine: next,
      past: [...past, zine],
      future: future.slice(1),
      lastChange: { key: null, at: 0 },
      spreadIndex: Math.min(get().spreadIndex, next.spreads.length - 1),
    });
  },

  setSpread: (index) => {
    const zine = get().zine;
    if (!zine) return;
    set({ spreadIndex: Math.max(0, Math.min(zine.spreads.length - 1, index)), selection: [] });
  },
  select: (ids) => set({ selection: ids }),
  setTool: (tool) => set({ tool, selection: tool === "select" ? get().selection : [] }),
  setBrush: (brush) => set({ brush: { ...get().brush, ...brush } }),
  toggleGuides: () => set({ showGuides: !get().showGuides }),
  setPreviewOpen: (previewOpen) => set({ previewOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setSaveState: (saveState) => set({ saveState }),

  addLayer: (layer) => {
    const { spreadIndex } = get();
    get().change((z) => {
      spreadOf(z, spreadIndex).layers.push(layer);
    });
    set({ selection: [layer.id], tool: "select" });
  },

  patchLayers: (ids, patch, options) => {
    const { spreadIndex } = get();
    get().change((z) => {
      for (const layer of spreadOf(z, spreadIndex).layers) {
        if (ids.includes(layer.id)) Object.assign(layer, patch);
      }
    }, options);
  },

  removeSelected: () => {
    const { selection, spreadIndex } = get();
    if (!selection.length) return;
    get().change((z) => {
      const spread = spreadOf(z, spreadIndex);
      spread.layers = spread.layers.filter((l) => !selection.includes(l.id));
    });
    set({ selection: [] });
  },

  duplicateSelected: () => {
    const { zine, selection, spreadIndex } = get();
    if (!zine || !selection.length) return;
    const copies = spreadOf(zine, spreadIndex)
      .layers.filter((l) => selection.includes(l.id))
      .map((l) => cloneLayer(l));
    get().change((z) => {
      spreadOf(z, spreadIndex).layers.push(...copies);
    });
    set({ selection: copies.map((c) => c.id) });
  },

  copySelected: () => {
    const { zine, selection, spreadIndex } = get();
    if (!zine) return;
    set({ clipboard: spreadOf(zine, spreadIndex).layers.filter((l) => selection.includes(l.id)) });
  },

  paste: () => {
    const { clipboard, spreadIndex } = get();
    if (!clipboard.length) return;
    const copies = clipboard.map((l) => cloneLayer(l, 0));
    get().change((z) => {
      spreadOf(z, spreadIndex).layers.push(...copies);
    });
    set({ selection: copies.map((c) => c.id), clipboard: copies });
  },

  arrangeSelected: (to) => {
    const { selection, spreadIndex } = get();
    if (!selection.length) return;
    get().change((z) => {
      const spread = spreadOf(z, spreadIndex);
      const picked = spread.layers.filter((l) => selection.includes(l.id));
      const rest = spread.layers.filter((l) => !selection.includes(l.id));
      if (to === "front") spread.layers = [...rest, ...picked];
      else if (to === "back") spread.layers = [...picked, ...rest];
      else {
        // Step each selected layer one place, keeping their relative order.
        const layers = [...spread.layers];
        const order = to === "forward" ? [...layers.keys()].reverse() : [...layers.keys()];
        for (const i of order) {
          const j = to === "forward" ? i + 1 : i - 1;
          if (j < 0 || j >= layers.length) continue;
          if (selection.includes(layers[i].id) && !selection.includes(layers[j].id)) {
            [layers[i], layers[j]] = [layers[j], layers[i]];
          }
        }
        spread.layers = layers;
      }
    });
  },

  reorderLayers: (orderedIds) => {
    const { spreadIndex } = get();
    get().change((z) => {
      const spread = spreadOf(z, spreadIndex);
      const byId = new Map(spread.layers.map((l) => [l.id, l]));
      spread.layers = orderedIds.flatMap((id) => {
        const layer = byId.get(id);
        return layer ? [layer] : [];
      });
    });
  },

  addPages: () => {
    const { zine, spreadIndex } = get();
    if (!zine) return;
    const last = zine.spreads.length - 1;
    const at = spreadIndex <= 0 || spreadIndex >= last ? last : spreadIndex + 1;
    get().change((z) => {
      z.spreads.splice(at, 0, newSpread(), newSpread());
    });
    set({ spreadIndex: at, selection: [] });
  },

  removePages: (index) => {
    const { zine } = get();
    if (!zine) return;
    const pair = removablePair(zine, index);
    if (!pair) return;
    get().change((z) => {
      z.spreads.splice(pair[0], 2);
    });
    set({ spreadIndex: Math.max(1, Math.min(pair[0], zine.spreads.length - 3)), selection: [] });
  },
}));

export function selectCurrentSpread(state: EditorState): Spread | null {
  return state.zine ? spreadOf(state.zine, state.spreadIndex) : null;
}
