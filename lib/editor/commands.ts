import { useEditorStore, type Tool } from "@/stores/editor";

// Every editor action with a name, so the command menu and keyboard shortcuts share one list.

export type Command = {
  id: string;
  label: string;
  keywords?: string;
  shortcut?: string[];
  run: () => void;
};

export const STAGE_EVENT = "zine:stage";
export type StageEventDetail = { action: "fit" | "zoom-in" | "zoom-out" | "actual" };

export function stageAction(action: StageEventDetail["action"]): void {
  window.dispatchEvent(new CustomEvent<StageEventDetail>(STAGE_EVENT, { detail: { action } }));
}

function openFilePicker(): void {
  document.getElementById("zine-file-input")?.click();
}

const s = useEditorStore.getState;

const tool = (id: Tool, label: string, key: string, keywords?: string): Command => ({
  id: `tool:${id}`,
  label: `${label} tool`,
  keywords,
  shortcut: [key],
  run: () => s().setTool(id),
});

export function commands(): Command[] {
  return [
    tool("select", "Select", "V", "move pointer"),
    tool("hand", "Hand", "H", "pan"),
    tool("text", "Text", "T", "type words headline"),
    tool("rect", "Rectangle", "R", "box square shape"),
    tool("ellipse", "Ellipse", "O", "circle oval shape"),
    tool("triangle", "Triangle", "Y", "shape"),
    tool("line", "Line", "L", "rule stroke"),
    tool("draw", "Draw", "P", "pencil brush freehand scribble"),
    { id: "import", label: "Add image or font…", keywords: "upload photo picture file", shortcut: ["I"], run: openFilePicker },
    { id: "undo", label: "Undo", shortcut: ["⌘", "Z"], run: () => s().undo() },
    { id: "redo", label: "Redo", shortcut: ["⇧", "⌘", "Z"], run: () => s().redo() },
    { id: "duplicate", label: "Duplicate selection", shortcut: ["⌘", "D"], run: () => s().duplicateSelected() },
    { id: "delete", label: "Delete selection", keywords: "remove", shortcut: ["⌫"], run: () => s().removeSelected() },
    { id: "front", label: "Bring to front", keywords: "arrange order", shortcut: ["⇧", "⌘", "]"], run: () => s().arrangeSelected("front") },
    { id: "back", label: "Send to back", keywords: "arrange order", shortcut: ["⇧", "⌘", "["], run: () => s().arrangeSelected("back") },
    { id: "add-pages", label: "Add 4 pages", keywords: "sheet spread insert", run: () => s().addPages() },
    { id: "remove-pages", label: "Remove this sheet (4 pages)", keywords: "delete spread", run: () => s().removePages(s().spreadIndex) },
    { id: "next", label: "Next spread", shortcut: ["⇟"], run: () => s().setSpread(s().spreadIndex + 1) },
    { id: "prev", label: "Previous spread", shortcut: ["⇞"], run: () => s().setSpread(s().spreadIndex - 1) },
    { id: "guides", label: "Toggle guides", keywords: "bleed trim safe margin", shortcut: ["⌘", ";"], run: () => s().toggleGuides() },
    { id: "fit", label: "Zoom to fit", shortcut: ["⇧", "1"], run: () => stageAction("fit") },
    { id: "actual", label: "Zoom to 100%", shortcut: ["⌘", "0"], run: () => stageAction("actual") },
    { id: "preview", label: "Preview in 3D", keywords: "flip book read", shortcut: ["⌘", "↵"], run: () => s().setPreviewOpen(true) },
  ];
}
