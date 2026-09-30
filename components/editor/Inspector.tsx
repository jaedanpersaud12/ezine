"use client";

import { AnimatePresence, motion } from "motion/react";
import { LayerInspector } from "@/components/editor/inspector/LayerInspector";
import { SpreadInspector } from "@/components/editor/inspector/SpreadInspector";
import { selectCurrentSpread, useEditorStore } from "@/stores/editor";

export function Inspector() {
  const spread = useEditorStore(selectCurrentSpread);
  const selection = useEditorStore((s) => s.selection);
  const layers = spread?.layers.filter((l) => selection.includes(l.id)) ?? [];
  const key = layers.length ? `layers:${layers.map((l) => l.id).join()}` : `spread:${spread?.id}`;

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {layers.length ? <LayerInspector layers={layers} /> : <SpreadInspector />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
