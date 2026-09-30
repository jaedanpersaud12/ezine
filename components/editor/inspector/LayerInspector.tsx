"use client";

import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import { AppearanceSection } from "@/components/editor/inspector/AppearanceSection";
import { ArrangeSection } from "@/components/editor/inspector/ArrangeSection";
import { DrawSection } from "@/components/editor/inspector/DrawSection";
import { ImageSection } from "@/components/editor/inspector/ImageSection";
import { ShapeSection } from "@/components/editor/inspector/ShapeSection";
import { TextSection } from "@/components/editor/inspector/TextSection";
import { IconToggle } from "@/components/editor/fields/IconToggle";
import type { Layer } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

const KIND_LABEL: Record<Layer["kind"], string> = {
  image: "Image",
  text: "Text",
  shape: "Shape",
  draw: "Drawing",
};

export function LayerInspector({ layers }: { layers: Layer[] }) {
  const patchLayers = useEditorStore((s) => s.patchLayers);
  const single = layers.length === 1 ? layers[0] : null;
  const ids = layers.map((l) => l.id);
  const locked = layers.every((l) => l.locked);
  const hidden = layers.every((l) => l.hidden);

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
        {single ? (
          <input
            aria-label="Layer name"
            className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-sm font-medium text-foreground outline-none hover:bg-muted/70 focus:bg-muted/70 focus:ring-1 focus:ring-ring"
            value={single.name}
            onChange={(e) => patchLayers([single.id], { name: e.target.value }, { key: `name:${single.id}` })}
          />
        ) : (
          <span className="flex-1 px-1.5 text-sm font-medium">{layers.length} selected</span>
        )}
        {single ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground">{KIND_LABEL[single.kind]}</span>
        ) : null}
        <IconToggle label={hidden ? "Show" : "Hide"} pressed={hidden} onPressedChange={(h) => patchLayers(ids, { hidden: h })}>
          {hidden ? <EyeOff /> : <Eye />}
        </IconToggle>
        <IconToggle label={locked ? "Unlock" : "Lock"} pressed={locked} onPressedChange={(l) => patchLayers(ids, { locked: l })}>
          {locked ? <Lock /> : <LockOpen />}
        </IconToggle>
      </div>

      <ArrangeSection layers={layers} />
      {single?.kind === "text" ? <TextSection layer={single} /> : null}
      {single?.kind === "shape" ? <ShapeSection layer={single} /> : null}
      {single?.kind === "image" ? <ImageSection layer={single} /> : null}
      {single?.kind === "draw" ? <DrawSection layer={single} /> : null}
      <AppearanceSection layers={layers} />
    </>
  );
}
