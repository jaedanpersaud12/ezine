import { importFont, importImage } from "@/lib/editor/assets";
import { newImageLayer } from "@/lib/zine/create";
import { spreadGeometry } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

const FONT_EXT = /\.(otf|ttf|woff2?)$/i;

// Bring files into the zine: images become layers on the current spread, fonts join the type library.
// `at` is where to centre the first image, in spread mm; defaults to the middle of the spread.
export async function importFiles(files: File[], at?: { x: number; y: number }): Promise<void> {
  const store = useEditorStore.getState();
  const zine = store.zine;
  if (!zine) return;
  const g = spreadGeometry(zine, store.spreadIndex);
  const pageW = zine.trim.widthMm;

  let offset = 0;
  for (const file of files) {
    try {
      if (file.type.startsWith("image/")) {
        const asset = await importImage(file);
        const w = asset.widthPx ?? 1000;
        const h = asset.heightPx ?? 1000;
        const width = Math.min(pageW * 0.7, (g.heightMm * 0.7 * w) / h);
        const centre = at ?? { x: g.widthMm / 2, y: g.heightMm / 2 };
        const layer = newImageLayer(asset.id, asset.name, w, h, { x: centre.x + offset, y: centre.y + offset }, width);
        // Asset and layer land as one undo step.
        useEditorStore.getState().change((z) => {
          z.assets[asset.id] = asset;
          z.spreads[store.spreadIndex].layers.push(layer);
        });
        useEditorStore.setState({ selection: [layer.id], tool: "select" });
        offset += 6;
      } else if (FONT_EXT.test(file.name)) {
        const asset = await importFont(file);
        useEditorStore.getState().change((z) => {
          z.assets[asset.id] = asset;
        });
      }
    } catch (error) {
      console.error("Import failed", file.name, error);
    }
  }
}
