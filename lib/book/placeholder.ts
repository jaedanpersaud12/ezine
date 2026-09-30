import { CanvasTexture, SRGBColorSpace } from "three";

// Numbered stand-in page art until ZB-11 renders real editor pages.
// These colours are page content (ink on paper), not UI, so they sit outside the token contract.

const TEXTURE_WIDTH_PX = 768;
const SAFE_MARGIN_MM = 5;

export function makePlaceholderPage(
  side: number,
  sideCount: number,
  widthMm: number,
  heightMm: number,
  maxAnisotropy: number,
): CanvasTexture {
  const pxPerMm = TEXTURE_WIDTH_PX / widthMm;
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH_PX;
  canvas.height = Math.round(heightMm * pxPerMm);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");

  const { width: w, height: h } = canvas;
  const isCover = side === 1 || side === sideCount;
  const hue = (side * 47) % 360;

  ctx.fillStyle = isCover ? `hsl(${hue} 45% 32%)` : "hsl(40 30% 94%)";
  ctx.fillRect(0, 0, w, h);

  // halftone dots, like a cheap photocopy
  ctx.fillStyle = isCover ? "hsl(40 30% 94% / 0.18)" : `hsl(${hue} 55% 55% / 0.35)`;
  const step = w / 24;
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const r = (step / 2) * (0.25 + 0.6 * (y / h));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // safe-area guide
  const m = SAFE_MARGIN_MM * pxPerMm;
  ctx.strokeStyle = isCover ? "hsl(40 30% 94% / 0.5)" : "hsl(0 0% 15% / 0.35)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.setLineDash([]);

  const ink = isCover ? "hsl(40 30% 94%)" : "hsl(0 0% 12%)";
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(w * 0.42)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(String(side), w / 2, h * 0.46);

  ctx.font = `600 ${Math.round(w * 0.055)}px ui-monospace, monospace`;
  const caption =
    side === 1 ? "FRONT COVER" : side === sideCount ? "BACK COVER" : side % 2 === 1 ? "RECTO" : "VERSO";
  ctx.fillText(caption, w / 2, h * 0.72);

  // "top" marker, to catch a flipped texture at a glance
  ctx.font = `600 ${Math.round(w * 0.04)}px ui-monospace, monospace`;
  ctx.fillText("▲ TOP", w / 2, m + w * 0.05);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false; // glTF UV convention
  texture.anisotropy = maxAnisotropy;
  return texture;
}
