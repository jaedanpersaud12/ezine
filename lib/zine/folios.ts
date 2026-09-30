import { DEFAULT_FONT_ID } from "@/lib/zine/fonts";
import { DEFAULT_INK } from "@/lib/zine/palettes";
import { spreadGeometry, type Folios, type Zine } from "@/lib/zine/schema";

// Where page numbers go on a spread. Pure geometry, shared by the editor canvas and offscreen renders.

export const DEFAULT_FOLIOS: Folios = {
  enabled: false,
  position: "outer",
  fontFamily: DEFAULT_FONT_ID,
  sizePt: 8,
  color: DEFAULT_INK,
  marginMm: 8,
};

export function foliosOf(zine: Zine): Folios {
  return zine.folios ?? DEFAULT_FOLIOS;
}

export type FolioItem = {
  text: string;
  // Anchor point in spread mm: the text's outer edge (or centre) on its baseline row.
  x: number;
  y: number;
  align: "left" | "center" | "right";
};

export function folioItems(zine: Zine, spreadIndex: number): FolioItem[] {
  const f = foliosOf(zine);
  const g = spreadGeometry(zine, spreadIndex);
  if (!f.enabled || g.role !== "inner") return [];
  const pageW = zine.trim.widthMm;
  const y = g.heightMm - f.marginMm;
  const inset = Math.max(zine.safeMm, 4);
  return g.sides.map((side, i) => {
    const left = i * pageW;
    if (f.position === "centre") return { text: String(side), x: left + pageW / 2, y, align: "center" as const };
    // Outer corner: left edge of a left page, right edge of a right page.
    return i === 0
      ? { text: String(side), x: left + inset, y, align: "left" as const }
      : { text: String(side), x: left + pageW - inset, y, align: "right" as const };
  });
}
