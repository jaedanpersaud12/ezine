import {
  ActiveSelection,
  InteractiveFabricObject,
  type FabricObject,
  Line,
  PencilBrush,
  Point,
  Rect,
  Ellipse,
  Triangle,
  type TPointerEventInfo,
  type Path,
  Textbox,
} from "fabric";
import { applyLayer, createObject, layerIdOf, measuredTextHeight, readTransform } from "@/lib/editor/fabric/objects";
import { ensureFont } from "@/lib/editor/assets";
import { NO_LOCK, snapBox, snapTargets, type SnapLock } from "@/lib/editor/fabric/snapping";
import { ZineCanvas, type SheetSpec } from "@/lib/editor/fabric/ZineCanvas";
import { newDrawLayer, newShapeLayer, newTextLayer } from "@/lib/zine/create";
import { DEFAULT_INK } from "@/lib/zine/palettes";
import type { DrawLayer, Layer, Zine } from "@/lib/zine/schema";
import type { ShapeTool, Tool } from "@/stores/editor";

// Owns the Fabric canvas for the editor. React feeds it state (spread layers, selection, tool,
// sheet) and it reports back through callbacks; it never reads the store itself.

export type LayerPatch = { id: string; patch: Partial<Layer> };

export type StageCallbacks = {
  onSelect: (ids: string[]) => void;
  onTransform: (patches: LayerPatch[]) => void;
  onTextInput: (id: string, text: string, patch: Partial<Layer>) => void;
  onTextDone: (id: string, empty: boolean) => void;
  onCreate: (layer: Layer) => void;
  onZoom: (percent: number) => void;
  // Content-driven sizes (text height) that the document should follow; not an undo step.
  onMeasure: (patches: LayerPatch[]) => void;
};

const SCREEN_DPI_MM = 96 / 25.4; // 100% = true size on a 96 dpi screen
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 60;
// A guide catches an edge within SNAP_PX and holds it until the pointer pulls RELEASE_PX away.
const SNAP_PX = 6;
const RELEASE_PX = 12;
// Room around a fitted spread; the bottom leaves space for the floating toolbar.
const FIT_PAD = { x: 48, top: 40, bottom: 96 };
const SHAPE_TOOLS: Tool[] = ["rect", "ellipse", "triangle", "line"];

type Drag =
  | { kind: "pan"; last: Point }
  | { kind: "shape"; tool: ShapeTool; start: Point; ghost: FabricObject };

// Some changes can't be applied in place: the Fabric object is a different class, or a different image.
function needsRebuild(prev: Layer, next: Layer): boolean {
  if (prev.kind !== next.kind) return true;
  if (prev.kind === "shape" && next.kind === "shape") return prev.shape !== next.shape;
  if (prev.kind === "image" && next.kind === "image") return prev.assetId !== next.assetId;
  if (prev.kind === "draw" && next.kind === "draw") return prev.path !== next.path;
  return false;
}

export class StageController {
  readonly canvas: ZineCanvas;
  private readonly callbacks: StageCallbacks;
  private zine: Zine | null = null;
  private spreadId: string | null = null;
  private layers: Layer[] = [];
  private readonly objects = new Map<string, FabricObject>();
  private readonly applied = new Map<string, Layer>();
  private readonly building = new Set<string>();
  private editOnCreate: string | null = null;
  private selection: string[] = [];
  private syncingSelection = false;
  private tool: Tool = "select";
  private spaceHeld = false;
  private drag: Drag | null = null;
  private fitted = false;
  private readonly measured = new Map<string, number>();
  private measureQueued = false;
  private snapLock: SnapLock = NO_LOCK;

  constructor(el: HTMLCanvasElement, callbacks: StageCallbacks) {
    this.callbacks = callbacks;
    this.canvas = new ZineCanvas(el, {
      preserveObjectStacking: true,
      controlsAboveOverlay: true,
      selectionKey: "shiftKey",
      stopContextMenu: false,
      fireRightClick: true,
      uniformScaling: true,
      uniScaleKey: "shiftKey",
      targetFindTolerance: 4,
    });
    this.bindEvents();
  }

  dispose(): void {
    void this.canvas.dispose();
  }

  // ── Viewport ──────────────────────────────────────────────────────────────

  resize(width: number, height: number): void {
    this.canvas.setDimensions({ width, height });
    if (!this.fitted) this.fit();
    else this.canvas.requestRenderAll();
  }

  fit(): void {
    const s = this.canvas.sheet;
    if (!s || !this.canvas.width || !this.canvas.height) return;
    const w = s.widthMm + s.bleedMm * 2;
    const h = s.heightMm + s.bleedMm * 2;
    const zoom = Math.min(
      (this.canvas.width - FIT_PAD.x * 2) / w,
      (this.canvas.height - FIT_PAD.top - FIT_PAD.bottom) / h,
    );
    const tx = (this.canvas.width - s.widthMm * zoom) / 2;
    const ty = FIT_PAD.top + (this.canvas.height - FIT_PAD.top - FIT_PAD.bottom - s.heightMm * zoom) / 2;
    this.canvas.setViewportTransform([zoom, 0, 0, zoom, tx, ty]);
    this.fitted = true;
    this.emitZoom();
  }

  zoomTo(percent: number, around?: Point): void {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (percent / 100) * SCREEN_DPI_MM));
    this.canvas.zoomToPoint(around ?? new Point(this.canvas.width / 2, this.canvas.height / 2), zoom);
    this.emitZoom();
  }

  zoomPercent(): number {
    return (this.canvas.getZoom() / SCREEN_DPI_MM) * 100;
  }

  private emitZoom(): void {
    this.callbacks.onZoom(this.zoomPercent());
    this.canvas.requestRenderAll();
  }

  // ── State from React ──────────────────────────────────────────────────────

  setSheet(sheet: SheetSpec): void {
    const prev = this.canvas.sheet;
    this.canvas.sheet = sheet;
    if (prev?.accent !== sheet.accent) this.styleControls(sheet.accent);
    if (!prev || prev.widthMm !== sheet.widthMm || prev.heightMm !== sheet.heightMm) this.fit();
    this.canvas.requestRenderAll();
  }

  setSpread(zine: Zine, spreadId: string, layers: Layer[]): void {
    this.zine = zine;
    if (spreadId !== this.spreadId) {
      this.spreadId = spreadId;
      this.canvas.discardActiveObject();
      this.canvas.remove(...this.canvas.getObjects());
      this.objects.clear();
      this.applied.clear();
      this.building.clear();
    }
    this.layers = layers;
    this.reconcile();
  }

  setSelection(ids: string[]): void {
    this.selection = ids;
    const current = this.canvas.getActiveObjects().map(layerIdOf);
    if (current.length === ids.length && current.every((id, i) => id === ids[i])) return;
    this.syncingSelection = true;
    this.canvas.discardActiveObject();
    const objs = ids.flatMap((id) => {
      const o = this.objects.get(id);
      return o && o.selectable && o.visible ? [o] : [];
    });
    if (objs.length === 1) this.canvas.setActiveObject(objs[0]);
    if (objs.length > 1) this.canvas.setActiveObject(new ActiveSelection(objs, { canvas: this.canvas }));
    this.syncingSelection = false;
    this.canvas.requestRenderAll();
  }

  setTool(tool: Tool, brush: { color: string; widthMm: number }): void {
    this.tool = tool;
    const c = this.canvas;
    c.isDrawingMode = tool === "draw";
    if (tool === "draw") {
      const pencil = new PencilBrush(c);
      pencil.color = brush.color;
      pencil.width = brush.widthMm;
      pencil.decimate = 0.2;
      c.freeDrawingBrush = pencil;
    }
    const selecting = tool === "select";
    c.selection = selecting;
    c.skipTargetFind = !selecting;
    c.defaultCursor = tool === "hand" ? "grab" : selecting ? "default" : "crosshair";
    c.hoverCursor = selecting ? "move" : c.defaultCursor;
    if (!selecting) c.discardActiveObject();
    c.requestRenderAll();
  }

  setSpaceHeld(held: boolean): void {
    this.spaceHeld = held;
    this.canvas.defaultCursor = held || this.tool === "hand" ? "grab" : this.tool === "select" ? "default" : "crosshair";
    this.canvas.skipTargetFind = held || this.tool !== "select";
    this.canvas.selection = !held && this.tool === "select";
  }

  // Slim round handles in the theme's accent, for every object and the marquee.
  private styleControls(accent: string): void {
    const style = {
      cornerStyle: "circle" as const,
      cornerSize: 9,
      touchCornerSize: 28,
      transparentCorners: false,
      cornerColor: "white",
      cornerStrokeColor: accent,
      borderColor: accent,
      borderScaleFactor: 1.5,
      padding: 0,
      // Dragging a handle past the opposite edge would flip the object; flips belong to the inspector.
      lockScalingFlip: true,
      minScaleLimit: 0.01,
    };
    InteractiveFabricObject.ownDefaults = { ...InteractiveFabricObject.ownDefaults, ...style };
    for (const obj of this.canvas.getObjects()) obj.set(style);
    this.canvas.selectionColor = "transparent";
    this.canvas.selectionBorderColor = accent;
    this.canvas.selectionLineWidth = 1;
  }

  // Scene (mm) point for a client (screen) position.
  sceneFromClient(clientX: number, clientY: number): Point {
    const rect = this.canvas.upperCanvasEl.getBoundingClientRect();
    const v = this.canvas.viewportTransform;
    return new Point((clientX - rect.left - v[4]) / v[0], (clientY - rect.top - v[5]) / v[3]);
  }

  // ── Reconcile layers → objects ────────────────────────────────────────────

  private reconcile(): void {
    const zine = this.zine;
    if (!zine) return;
    const c = this.canvas;
    const wanted = new Set(this.layers.map((l) => l.id));

    for (const [id, obj] of this.objects) {
      if (wanted.has(id)) continue;
      c.remove(obj);
      this.objects.delete(id);
      this.applied.delete(id);
    }

    // Objects inside a multi-selection hold group-relative coordinates, so document values
    // (absolute) can't be applied to them. Release the group first; setSelection rebuilds it.
    const changed = this.layers.filter((l) => {
      const obj = this.objects.get(l.id);
      return obj && this.applied.get(l.id) !== l;
    });
    if (changed.some((l) => this.objects.get(l.id)?.group instanceof ActiveSelection)) this.releaseGroup();

    for (const layer of this.layers) {
      const obj = this.objects.get(layer.id);
      if (!obj) {
        this.build(layer);
        continue;
      }
      const prev = this.applied.get(layer.id);
      if (prev === layer) continue;
      if (prev && needsRebuild(prev, layer)) {
        c.remove(obj);
        this.objects.delete(layer.id);
        this.applied.delete(layer.id);
        this.build(layer);
        continue;
      }
      this.applied.set(layer.id, layer);
      if (obj instanceof Textbox && obj.isEditing) continue;
      this.applyAndMeasure(obj, layer, prev);
    }

    this.restack();
    this.setSelection(this.selection);
    c.requestRenderAll();
  }

  // Drop the multi-selection without telling React: the same ids are reselected afterwards.
  private releaseGroup(): void {
    if (!(this.canvas.getActiveObject() instanceof ActiveSelection)) return;
    this.syncingSelection = true;
    this.canvas.discardActiveObject();
    this.syncingSelection = false;
  }

  private applyAndMeasure(obj: FabricObject, layer: Layer, prev: Layer | undefined): void {
    if (!this.zine) return;
    const pending = applyLayer(obj, layer, this.zine, prev);
    this.measure(obj, layer);
    // Fonts load late and change the measured height.
    void pending?.then(() => this.measure(obj, this.layers.find((l) => l.id === layer.id) ?? layer));
  }

  // Report text boxes whose real height differs from the document, batched per frame.
  private measure(obj: FabricObject, layer: Layer): void {
    const height = measuredTextHeight(obj, layer);
    if (height === null) return;
    this.measured.set(layer.id, height);
    if (this.measureQueued) return;
    this.measureQueued = true;
    queueMicrotask(() => {
      this.measureQueued = false;
      const patches = [...this.measured].map(([id, h]) => ({ id, patch: { height: h } }));
      this.measured.clear();
      if (patches.length) this.callbacks.onMeasure(patches);
    });
  }

  private build(layer: Layer): void {
    const zine = this.zine;
    if (!zine || this.building.has(layer.id)) return;
    const spreadId = this.spreadId;
    this.building.add(layer.id);
    void createObject(layer, zine, { waitForFonts: false }).then((obj) => {
      this.building.delete(layer.id);
      const latest = this.layers.find((l) => l.id === layer.id);
      if (!obj || !latest || spreadId !== this.spreadId || this.objects.has(layer.id)) return;
      if (latest !== layer) this.applyAndMeasure(obj, latest, layer);
      this.objects.set(layer.id, obj);
      this.applied.set(layer.id, latest);
      this.canvas.add(obj);
      this.measure(obj, latest);
      if (latest.kind === "text") {
        // Text went up in a fallback face; re-measure once the real one is drawable.
        void ensureFont(zine, latest.fontFamily, latest.fontWeight, latest.italic).then(() => {
          if (this.objects.get(layer.id) !== obj || !(obj instanceof Textbox)) return;
          obj.initDimensions();
          obj.setCoords();
          obj.dirty = true;
          this.measure(obj, this.layers.find((l) => l.id === layer.id) ?? latest);
          this.canvas.requestRenderAll();
        });
      }
      this.restack();
      if (this.editOnCreate === layer.id && obj instanceof Textbox) {
        this.editOnCreate = null;
        this.canvas.setActiveObject(obj);
        obj.enterEditing();
        obj.selectAll();
      }
      this.setSelection(this.selection);
      this.canvas.requestRenderAll();
    });
  }

  private restack(): void {
    const desired = this.layers.flatMap((l) => {
      const o = this.objects.get(l.id);
      return o ? [o] : [];
    });
    const current = this.canvas.getObjects();
    desired.forEach((obj, i) => {
      if (current[i] !== obj) this.canvas.moveObjectTo(obj, i);
    });
  }

  // ── Canvas → store ────────────────────────────────────────────────────────

  private idsOf(objs: FabricObject[]): string[] {
    return objs.flatMap((o) => {
      const id = layerIdOf(o);
      return id ? [id] : [];
    });
  }

  private bindEvents(): void {
    const c = this.canvas;

    const selectionChanged = (): void => {
      if (this.syncingSelection) return;
      const ids = this.idsOf(c.getActiveObjects());
      this.selection = ids;
      this.callbacks.onSelect(ids);
    };
    c.on("selection:created", selectionChanged);
    c.on("selection:updated", selectionChanged);
    c.on("selection:cleared", selectionChanged);

    c.on("object:modified", ({ target }) => {
      // Grouped objects are read through their full matrix; reconcile then releases the group
      // (never here: discarding a selection inside this event re-enters it).
      const objs = target instanceof ActiveSelection ? target.getObjects() : [target];
      const patches = objs.flatMap((obj) => {
        const id = layerIdOf(obj);
        const layer = this.layers.find((l) => l.id === id);
        return layer ? [{ id: layer.id, patch: readTransform(obj, layer) }] : [];
      });
      c.snapLines = [];
      if (patches.length) this.callbacks.onTransform(patches);
    });

    c.on("before:transform", () => {
      this.snapLock = NO_LOCK;
    });

    c.on("object:moving", ({ target, e }) => {
      const sheet = c.sheet;
      if (!sheet || ("altKey" in e && e.altKey)) {
        c.snapLines = [];
        this.snapLock = NO_LOCK;
        return;
      }
      const moving = new Set(target instanceof ActiveSelection ? target.getObjects() : [target]);
      const others = c
        .getObjects()
        .filter((o) => !moving.has(o) && o.visible)
        .map((o) => o.getBoundingRect());
      // Fabric only refreshes coords at the end of a drag; without this the box is a frame stale.
      target.setCoords();
      const zoom = c.getZoom();
      const snap = snapBox(target.getBoundingRect(), snapTargets(sheet, others), this.snapLock, SNAP_PX / zoom, RELEASE_PX / zoom);
      this.snapLock = snap.lock;
      if (snap.dx || snap.dy) {
        target.set({ left: target.left + snap.dx, top: target.top + snap.dy });
        target.setCoords();
      }
      c.snapLines = snap.lines;
    });

    c.on("text:changed", ({ target }) => {
      const id = layerIdOf(target);
      const layer = this.layers.find((l) => l.id === id);
      if (!id || !layer) return;
      this.callbacks.onTextInput(id, target.text, readTransform(target, layer));
    });
    c.on("text:editing:exited", ({ target }) => {
      const id = layerIdOf(target);
      if (id) this.callbacks.onTextDone(id, target.text.trim().length === 0);
    });

    c.on("path:created", ({ path }) => {
      c.remove(path);
      const p = path as Path;
      const center = p.getCenterPoint();
      const layer: DrawLayer = newDrawLayer(
        structuredClone(p.path) as DrawLayer["path"],
        { x: center.x, y: center.y },
        Math.max(p.width, 0.5),
        Math.max(p.height, 0.5),
        typeof p.stroke === "string" ? p.stroke : DEFAULT_INK,
        p.strokeWidth,
      );
      this.callbacks.onCreate(layer);
    });

    c.on("mouse:wheel", ({ e }) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.getZoom() * 0.992 ** e.deltaY));
        c.zoomToPoint(new Point(e.offsetX, e.offsetY), zoom);
      } else {
        c.relativePan(new Point(-e.deltaX, -e.deltaY));
      }
      this.emitZoom();
    });

    c.on("mouse:down", (opt) => this.onDown(opt));
    c.on("mouse:move", (opt) => this.onMove(opt));
    c.on("mouse:up", (opt) => this.onUp(opt));
  }

  // ── Tools ─────────────────────────────────────────────────────────────────

  private onDown(opt: TPointerEventInfo): void {
    const e = opt.e;
    const middle = "button" in e && e.button === 1;
    const right = "button" in e && e.button === 2;
    // Right-click selects what's under the pointer first, so the context menu acts on it.
    if (right) {
      const target = opt.target;
      if (this.tool === "select" && target && !this.canvas.getActiveObjects().includes(target)) {
        this.canvas.setActiveObject(target);
        this.canvas.requestRenderAll();
        const ids = this.idsOf([target]);
        this.selection = ids;
        this.callbacks.onSelect(ids);
      }
      return;
    }
    if (this.spaceHeld || this.tool === "hand" || middle) {
      this.drag = { kind: "pan", last: opt.viewportPoint };
      this.canvas.setCursor("grabbing");
      return;
    }
    if (this.tool === "text") {
      const layer = newTextLayer({ x: opt.scenePoint.x + 40, y: opt.scenePoint.y + 6 });
      this.editOnCreate = layer.id;
      // Build now rather than after React's round trip, so typing straight away lands in the box.
      this.layers = [...this.layers, layer];
      this.build(layer);
      this.callbacks.onCreate(layer);
      return;
    }
    if (SHAPE_TOOLS.includes(this.tool)) {
      const tool = this.tool as ShapeTool;
      const ghost = this.ghostFor(tool, opt.scenePoint);
      this.canvas.add(ghost);
      this.drag = { kind: "shape", tool, start: opt.scenePoint, ghost };
    }
  }

  private onMove(opt: TPointerEventInfo): void {
    const d = this.drag;
    if (!d) return;
    if (d.kind === "pan") {
      const p = opt.viewportPoint;
      this.canvas.relativePan(new Point(p.x - d.last.x, p.y - d.last.y));
      d.last = p;
      this.canvas.requestRenderAll();
      return;
    }
    const box = this.shapeBox(d.tool, d.start, opt.scenePoint, "shiftKey" in opt.e && opt.e.shiftKey);
    if (d.tool === "line") {
      (d.ghost as Line).set({ x1: d.start.x, y1: d.start.y, x2: box.end.x, y2: box.end.y });
    } else if (d.tool === "ellipse") {
      d.ghost.set({ left: box.cx, top: box.cy, rx: box.w / 2, ry: box.h / 2 });
    } else {
      d.ghost.set({ left: box.cx, top: box.cy, width: box.w, height: box.h });
    }
    d.ghost.setCoords();
    this.canvas.requestRenderAll();
  }

  private onUp(opt: TPointerEventInfo): void {
    const d = this.drag;
    this.drag = null;
    this.canvas.snapLines = [];
    if (!d) return;
    if (d.kind === "pan") {
      this.canvas.setCursor(this.tool === "hand" || this.spaceHeld ? "grab" : "default");
      return;
    }
    this.canvas.remove(d.ghost);
    const box = this.shapeBox(d.tool, d.start, opt.scenePoint, "shiftKey" in opt.e && opt.e.shiftKey);
    const clicked = box.len < 2;
    if (d.tool === "line") {
      const layer = newShapeLayer("line", clicked ? d.start : { x: box.cx, y: box.cy }, clicked ? 60 : box.len, 1);
      layer.rotation = clicked ? 0 : (Math.atan2(box.end.y - d.start.y, box.end.x - d.start.x) * 180) / Math.PI;
      this.callbacks.onCreate(layer);
      return;
    }
    const size = clicked ? 40 : 0;
    this.callbacks.onCreate(
      newShapeLayer(d.tool, clicked ? d.start : { x: box.cx, y: box.cy }, size || box.w, size || box.h),
    );
  }

  private shapeBox(tool: ShapeTool, start: Point, end: Point, constrain: boolean) {
    let dx = end.x - start.x;
    let dy = end.y - start.y;
    if (constrain && tool !== "line") {
      const m = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx || 1) * m;
      dy = Math.sign(dy || 1) * m;
    }
    if (constrain && tool === "line") {
      const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      const len = Math.hypot(dx, dy);
      dx = Math.cos(angle) * len;
      dy = Math.sin(angle) * len;
    }
    const e = new Point(start.x + dx, start.y + dy);
    return {
      cx: start.x + dx / 2,
      cy: start.y + dy / 2,
      w: Math.abs(dx),
      h: Math.abs(dy),
      len: Math.hypot(dx, dy),
      end: e,
    };
  }

  private ghostFor(tool: ShapeTool, at: Point): FabricObject {
    const zoom = this.canvas.getZoom();
    const style = {
      fill: "transparent",
      stroke: this.canvas.sheet?.accent ?? "blue",
      strokeWidth: 1 / zoom,
      strokeDashArray: [4 / zoom, 3 / zoom],
      selectable: false,
      evented: false,
    };
    // Lines position themselves from their end points; the rest are centred on the press.
    if (tool === "line") return new Line([at.x, at.y, at.x, at.y], style);
    const placed = { ...style, left: at.x, top: at.y };
    if (tool === "ellipse") return new Ellipse({ ...placed, rx: 0, ry: 0 });
    if (tool === "triangle") return new Triangle({ ...placed, width: 0, height: 0 });
    return new Rect({ ...placed, width: 0, height: 0 });
  }
}
