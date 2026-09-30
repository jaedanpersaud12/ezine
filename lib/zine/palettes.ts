// Ink and paper colours an artist picks for their zine. These are page content, not UI,
// so they live outside the token contract.

export type Swatch = { name: string; hex: string };

// Common Riso inks (approximate screen values).
export const RISO_INKS: Swatch[] = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "Burgundy", hex: "#914e72" },
  { name: "Red", hex: "#ff665e" },
  { name: "Bright red", hex: "#f15060" },
  { name: "Fluorescent pink", hex: "#ff48b0" },
  { name: "Orange", hex: "#ff6c2f" },
  { name: "Sunflower", hex: "#ffb511" },
  { name: "Yellow", hex: "#ffe800" },
  { name: "Green", hex: "#00a95c" },
  { name: "Teal", hex: "#00838a" },
  { name: "Aqua", hex: "#5ec8e5" },
  { name: "Blue", hex: "#0078bf" },
  { name: "Federal blue", hex: "#3d5588" },
  { name: "Purple", hex: "#765ba7" },
  { name: "Metallic gold", hex: "#bb8b41" },
  { name: "White", hex: "#ffffff" },
];

export const PAPERS: Swatch[] = [
  { name: "Bright white", hex: "#fbfaf7" },
  { name: "Natural", hex: "#f4efe3" },
  { name: "Cream", hex: "#efe4c8" },
  { name: "Newsprint", hex: "#e3ddcf" },
  { name: "Kraft", hex: "#c8a878" },
  { name: "Pink", hex: "#f6cfd3" },
  { name: "Sky", hex: "#cfe3ee" },
  { name: "Mint", hex: "#d3ebd9" },
  { name: "Canary", hex: "#f7e98e" },
  { name: "Black", hex: "#1f1f1f" },
];

export const DEFAULT_INK = RISO_INKS[0].hex;
export const DEFAULT_PAPER = PAPERS[1].hex;
