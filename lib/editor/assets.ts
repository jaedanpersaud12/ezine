import { builtInFont, DEFAULT_FONT_ID } from "@/lib/zine/fonts";
import { newId } from "@/lib/zine/create";
import type { Asset, Zine } from "@/lib/zine/schema";
import { getBlob, putBlob } from "@/lib/editor/persist";

// Runtime side of assets: blob URLs for images and registered FontFaces for uploaded fonts.

const urls = new Map<string, string>();
const fontsReady = new Map<string, Promise<void>>();
const uploadsRegistered = new Map<string, Promise<void>>();

export async function assetUrl(asset: Asset): Promise<string | null> {
  const cached = urls.get(asset.id);
  if (cached) return cached;
  const blob = await getBlob(asset.id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(asset.id, url);
  return url;
}

function readImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Not a readable image"));
    img.src = url;
  });
}

export async function importImage(file: File): Promise<Asset> {
  const id = newId();
  const url = URL.createObjectURL(file);
  const { width, height } = await readImageSize(url);
  await putBlob(id, file);
  urls.set(id, url);
  return { id, kind: "image", name: file.name.replace(/\.[^.]+$/, ""), mime: file.type, widthPx: width, heightPx: height };
}

export async function importFont(file: File): Promise<Asset> {
  const id = newId();
  const name = file.name.replace(/\.[^.]+$/, "");
  const family = `zine-upload-${id.slice(0, 8)}`;
  const face = new FontFace(family, await file.arrayBuffer());
  await face.load();
  document.fonts.add(face);
  await putBlob(id, file);
  uploadsRegistered.set(id, Promise.resolve());
  return { id, kind: "font", name, mime: file.type || "font/otf", family };
}

function registerUploadedFont(asset: Asset): Promise<void> {
  let registered = uploadsRegistered.get(asset.id);
  if (!registered) {
    registered = (async () => {
      const blob = await getBlob(asset.id);
      if (!blob || !asset.family) return;
      const face = new FontFace(asset.family, await blob.arrayBuffer());
      await face.load();
      document.fonts.add(face);
    })();
    uploadsRegistered.set(asset.id, registered);
  }
  return registered;
}

// Font ids are either a built-in id or "asset:<assetId>".
export function uploadedFontId(assetId: string): string {
  return `asset:${assetId}`;
}

export function resolveFontFamily(zine: Zine, fontId: string): string {
  if (fontId.startsWith("asset:")) {
    const asset = zine.assets[fontId.slice(6)];
    if (asset?.family) return `"${asset.family}"`;
  }
  return (builtInFont(fontId) ?? builtInFont(DEFAULT_FONT_ID))?.family ?? "sans-serif";
}

export function fontLabel(zine: Zine, fontId: string): string {
  if (fontId.startsWith("asset:")) return zine.assets[fontId.slice(6)]?.name ?? "Missing font";
  return builtInFont(fontId)?.label ?? "Missing font";
}

// Resolves once the face (at this weight/style) can be drawn on a canvas.
export function ensureFont(zine: Zine, fontId: string, weight: number, italic: boolean): Promise<void> {
  const key = `${fontId}|${weight}|${italic}`;
  let ready = fontsReady.get(key);
  if (!ready) {
    const family = resolveFontFamily(zine, fontId);
    const upload = fontId.startsWith("asset:") ? zine.assets[fontId.slice(6)] : undefined;
    ready = (upload ? registerUploadedFont(upload) : Promise.resolve())
      .then(() => document.fonts.load(`${italic ? "italic " : ""}${weight} 32px ${family}`))
      .then(() => undefined)
      .catch((error: unknown) => console.error("Font failed to load", fontId, error));
    fontsReady.set(key, ready);
  }
  return ready;
}
