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
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          // Opacity only: a transform here would re-anchor anything position: fixed inside it.
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.06 } }}
          transition={{ duration: 0.14 }}
        >
          {layers.length ? <LayerInspector layers={layers} /> : <SpreadInspector />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
