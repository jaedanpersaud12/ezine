import { create } from "zustand";
import type { TrimId } from "@/lib/book/trim";

export const LEAF_COUNT_OPTIONS = [4, 6, 8, 12, 20] as const;

type ReaderState = {
  trimId: TrimId;
  leafCount: number;
  // Leaves turned onto the left stack: 0 = closed on the front cover, leafCount = closed on the back.
  opened: number;
  setTrim: (trimId: TrimId) => void;
  setLeafCount: (leafCount: number) => void;
  setOpened: (opened: number) => void;
  turnNext: () => void;
  turnPrev: () => void;
};

export const useReaderStore = create<ReaderState>()((set) => ({
  trimId: "a5",
  leafCount: 8,
  opened: 0,
  setTrim: (trimId) => set({ trimId, opened: 0 }),
  setLeafCount: (leafCount) => set({ leafCount, opened: 0 }),
  setOpened: (opened) => set((s) => ({ opened: Math.max(0, Math.min(s.leafCount, opened)) })),
  turnNext: () => set((s) => ({ opened: Math.min(s.leafCount, s.opened + 1) })),
  turnPrev: () => set((s) => ({ opened: Math.max(0, s.opened - 1) })),
}));
