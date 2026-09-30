import { create } from "zustand";
import { produce, type Draft } from "immer";
import { cloneLayer, newSpread } from "@/lib/zine/create";
import type { SaveFailure } from "@/lib/editor/saveError";
import { DEFAULT_INK } from "@/lib/zine/palettes";
import { pageStep, type Binding, type Layer, type Spread, type Zine } from "@/lib/zine/schema";

export type Tool = "select" | "hand" | "text" | "rect" | "ellipse" | "triangle" | "line" | "draw";
export type ShapeTool = Extract<Tool, "rect" | "ellipse" | "triangle" | "line">;
export type Arrange = "front" | "forward" | "backward" | "back";
export type SaveState = "idle" | "saving" | "saved" | "error";

const HISTORY_LIMIT = 200;
export const MAX_PAGES = 400;
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
  snapping: boolean;
  previewOpen: boolean;
  commandOpen: boolean;
  saveState: SaveState;
  // Why the last save failed. Kept through later attempts until one succeeds, so a failed
  // upload stays marked on its layer while the editor retries.
  saveError: SaveFailure | null;
  // Save now, skipping the autosave delay. Set by the editor's persistence while it's mounted.
  retrySave: () => void;
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
  toggleSnapping: () => void;
  setPreviewOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setSaveState: (state: SaveState, failure?: SaveFailure) => void;

  addLayer: (layer: Layer) => void;
  patchLayers: (ids: string[], patch: Partial<Layer>, options?: ChangeOptions) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  paste: () => void;
  arrangeSelected: (to: Arrange) => void;
  // Carry the selection to the spread `delta` away (±1), keeping its place on the page.
  moveSelectedToSpread: (delta: number) => void;
  reorderLayers: (orderedIds: string[]) => void;
  addPages: () => void;
  // Grow or shrink the book at the back (before the back cover), in the binding's page step.
  setPageCount: (pages: number) => void;
  // Switching to saddle stitch rounds the book up to whole sheets with blank pages at the back.
  setBinding: (binding: Binding) => void;
  removePages: (spreadIndex: number) => void;
  insertPagesAfter: (spreadIndex: number) => void;
  duplicateSpread: (spreadIndex: number) => void;
  clearSpread: (spreadIndex: number) => void;
  // Inner spreads only; the covers stay first and last.
  moveSpread: (from: number, to: number) => void;
  reorderInnerSpreads: (orderedIds: string[]) => void;
};

function spreadOf(zine: Zine | Draft<Zine>, index: number): Spread | Draft<Spread> {
  return zine.spreads[Math.min(index, zine.spreads.length - 1)];
}

// Which inner spreads a "remove pages" on `index` takes out: saddle stitch removes a whole sheet
// (two spreads, 4 pages); an unbound book removes just that spread (2 pages). Never below 4 pages.
export function removableRange(zine: Zine, index: number): { start: number; count: number } | null {
  const last = zine.spreads.length - 1;
  const count = pageStep(zine) / 2;
  if (index <= 0 || index >= last || last - count < 2) return null;
  if (count === 1) return { start: index, count };
  return index + 1 < last ? { start: index, count } : { start: index - 1, count };
}

function blankSpreads(zine: Zine): Spread[] {
  return Array.from({ length: pageStep(zine) / 2 }, newSpread);
}

const NO_FAILED_UPLOADS: string[] = [];

// Asset ids whose upload failed on the last save attempt (stable when there are none).
export function selectFailedUploads(state: EditorState): string[] {
  const reason = state.saveError?.reason;
  return reason === "upload" || reason === "missing" ? (state.saveError?.assetIds ?? NO_FAILED_UPLOADS) : NO_FAILED_UPLOADS;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  zine: null,
  spreadIndex: 0,
  selection: [],
  tool: "select",
  brush: { color: DEFAULT_INK, widthMm: 1.2 },
  showGuides: true,
  snapping: true,
  previewOpen: false,
  commandOpen: false,
  saveState: "idle",
  saveError: null,
  retrySave: () => {},
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
      // An undo is an edit too: stamping it keeps "newer" meaning newer for the unsaved copy.
      zine: { ...previous, updatedAt: new Date().toISOString() },
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
      zine: { ...next, updatedAt: new Date().toISOString() },
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
  toggleSnapping: () => set({ snapping: !get().snapping }),
  setPreviewOpen: (previewOpen) => set({ previewOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setSaveState: (saveState, failure) =>
    set({
      saveState,
      saveError: saveState === "error" ? (failure ?? { reason: "server", assetIds: [] }) : saveState === "saved" ? null : get().saveError,
    }),

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

  moveSelectedToSpread: (delta) => {
    const { zine, selection, spreadIndex } = get();
    if (!zine || !selection.length) return;
    const target = spreadIndex + delta;
    if (target < 0 || target >= zine.spreads.length) return;
    const last = zine.spreads.length - 1;
    const single = target === 0 || target === last;
    const pageW = zine.trim.widthMm;
    get().change((z) => {
      const from = z.spreads[spreadIndex];
      const moving = from.layers.filter((l) => selection.includes(l.id));
      from.layers = from.layers.filter((l) => !selection.includes(l.id));
      // Covers are one page wide: art from a right-hand page lands on the same spot of the cover.
      for (const l of moving) if (single && l.x > pageW) l.x -= pageW;
      z.spreads[target].layers.push(...moving);
    });
    set({ spreadIndex: target, selection });
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
      z.spreads.splice(at, 0, ...blankSpreads(zine));
    });
    set({ spreadIndex: at, selection: [] });
  },

  setPageCount: (pages) => {
    const { zine, spreadIndex } = get();
    if (!zine) return;
    const step = pageStep(zine);
    const target = Math.min(MAX_PAGES, Math.max(4, Math.round(pages / step) * step));
    const leaves = target / 2;
    const current = zine.spreads.length - 1;
    if (leaves === current) return;
    get().change((z) => {
      const back = z.spreads.pop();
      if (!back) return;
      if (leaves > current) {
        for (let i = current; i < leaves; i++) z.spreads.push(newSpread());
      } else {
        z.spreads.splice(leaves);
      }
      z.spreads.push(back);
    });
    const last = leaves;
    if (spreadIndex > last) set({ spreadIndex: last, selection: [] });
  },

  setBinding: (binding) => {
    const { zine } = get();
    if (!zine || zine.binding === binding) return;
    get().change((z) => {
      z.binding = binding;
      const pages = (z.spreads.length - 1) * 2;
      if (binding === "saddle" && pages % 4 !== 0) z.spreads.splice(z.spreads.length - 1, 0, newSpread());
    });
  },

  insertPagesAfter: (index) => {
    const { zine } = get();
    if (!zine) return;
    const last = zine.spreads.length - 1;
    const at = Math.min(last, Math.max(1, index + 1));
    get().change((z) => {
      z.spreads.splice(at, 0, ...blankSpreads(zine));
    });
    set({ spreadIndex: at, selection: [] });
  },

  // Saddle stitch: a copy plus a blank spread, so the book still folds from whole sheets.
  duplicateSpread: (index) => {
    const { zine } = get();
    if (!zine) return;
    const last = zine.spreads.length - 1;
    const source = zine.spreads[index];
    if (!source || index <= 0 || index >= last) return;
    const copy = { ...structuredClone(source), id: newSpread().id };
    copy.layers = copy.layers.map((l) => ({ ...l, id: crypto.randomUUID() }));
    get().change((z) => {
      if (z.binding === "saddle") z.spreads.splice(index + 1, 0, copy, newSpread());
      else z.spreads.splice(index + 1, 0, copy);
    });
    set({ spreadIndex: index + 1, selection: [] });
  },

  clearSpread: (index) => {
    get().change((z) => {
      const spread = z.spreads[index];
      if (!spread) return;
      spread.layers = [];
      spread.background = null;
    });
    set({ selection: [] });
  },

  moveSpread: (from, to) => {
    const { zine, spreadIndex } = get();
    if (!zine) return;
    const last = zine.spreads.length - 1;
    const inner = (i: number): boolean => i > 0 && i < last;
    if (!inner(from) || !inner(to) || from === to) return;
    get().change((z) => {
      const [moved] = z.spreads.splice(from, 1);
      z.spreads.splice(to, 0, moved);
    });
    if (spreadIndex === from) set({ spreadIndex: to });
  },

  reorderInnerSpreads: (orderedIds) => {
    const { zine } = get();
    if (!zine) return;
    const current = zine.spreads.slice(1, -1).map((s) => s.id);
    if (current.length !== orderedIds.length || current.every((id, i) => id === orderedIds[i])) return;
    const activeId = zine.spreads[get().spreadIndex]?.id;
    get().change((z) => {
      const byId = new Map(z.spreads.map((s) => [s.id, s]));
      const inner = orderedIds.flatMap((id) => {
        const spread = byId.get(id);
        return spread ? [spread] : [];
      });
      z.spreads = [z.spreads[0], ...inner, z.spreads[z.spreads.length - 1]];
    });
    const next = get().zine?.spreads.findIndex((s) => s.id === activeId) ?? -1;
    if (next >= 0) set({ spreadIndex: next });
  },

  removePages: (index) => {
    const { zine } = get();
    if (!zine) return;
    const range = removableRange(zine, index);
    if (!range) return;
    get().change((z) => {
      z.spreads.splice(range.start, range.count);
    });
    set({ spreadIndex: Math.max(1, Math.min(range.start, zine.spreads.length - 1 - range.count - 1)), selection: [] });
  },

}));

export function selectCurrentSpread(state: EditorState): Spread | null {
  return state.zine ? spreadOf(state.zine, state.spreadIndex) : null;
}
