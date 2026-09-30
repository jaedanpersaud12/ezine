// Trim presets from ZB-1. The document stores mm; the 3D reader works in metres.

export type TrimId = "a5" | "a6" | "half-letter" | "quarter-letter";

export type Trim = {
  id: TrimId;
  label: string;
  widthMm: number;
  heightMm: number;
};

export const TRIMS: Record<TrimId, Trim> = {
  a5: { id: "a5", label: "A5", widthMm: 148, heightMm: 210 },
  a6: { id: "a6", label: "A6", widthMm: 105, heightMm: 148 },
  "half-letter": { id: "half-letter", label: "Half letter", widthMm: 139.7, heightMm: 215.9 },
  "quarter-letter": { id: "quarter-letter", label: "Quarter letter", widthMm: 107.95, heightMm: 139.7 },
};

export function mmToM(mm: number): number {
  return mm / 1000;
}
