import { expect, type Page } from "@playwright/test";
import { canvasObjects, docLayers, settle } from "./helpers";

// A generated photo, imported through the real file input.
export async function addImage(page: Page, widthPx = 1200, heightPx = 900): Promise<string> {
  const before = (await canvasObjects(page)).length;
  await page.evaluate(
    async ([w, h]) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      if (!g) throw new Error("no 2d");
      g.fillStyle = "#0078bf";
      g.fillRect(0, 0, w, h);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
      if (!blob) throw new Error("no blob");
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "photo.png", { type: "image/png" }));
      const input = document.getElementById("zine-file-input");
      if (!(input instanceof HTMLInputElement)) throw new Error("no input");
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [widthPx, heightPx] as const,
  );
  await expect.poll(async () => (await canvasObjects(page)).length).toBe(before + 1);
  await settle(page);
  return (await docLayers(page)).at(-1)?.id ?? "";
}

