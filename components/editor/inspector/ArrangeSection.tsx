"use client";

import { useState } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  FlipHorizontal2,
  FlipVertical2,
  Link2,
  Unlink2,
} from "lucide-react";
import { IconToggle } from "@/components/editor/fields/IconToggle";
import { NumberField } from "@/components/editor/fields/NumberField";
import { Section } from "@/components/editor/fields/Section";
import { alignLayers, type AlignEdge } from "@/lib/editor/align";
import type { Layer } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

const ALIGN: { edge: AlignEdge; label: string; icon: React.ReactNode }[] = [
  { edge: "left", label: "Align left", icon: <AlignStartVertical /> },
  { edge: "hcenter", label: "Align centre", icon: <AlignCenterVertical /> },
  { edge: "right", label: "Align right", icon: <AlignEndVertical /> },
  { edge: "top", label: "Align top", icon: <AlignStartHorizontal /> },
  { edge: "vcenter", label: "Align middle", icon: <AlignCenterHorizontal /> },
  { edge: "bottom", label: "Align bottom", icon: <AlignEndHorizontal /> },
];

export function ArrangeSection({ layers }: { layers: Layer[] }) {
  const [linked, setLinked] = useState(true);
  const patchLayers = useEditorStore((s) => s.patchLayers);
  const single = layers.length === 1 ? layers[0] : null;

  const align = (edge: AlignEdge): void => {
    const { zine, spreadIndex, change } = useEditorStore.getState();
    if (!zine) return;
    const moves = alignLayers(zine, spreadIndex, layers, edge);
    change((z) => {
      for (const l of z.spreads[spreadIndex].layers) {
        const m = moves.get(l.id);
        if (m) Object.assign(l, m);
      }
    });
  };

  const set = (patch: Partial<Layer>, key: string): void => {
    if (single) patchLayers([single.id], patch, { key: `${key}:${single.id}` });
  };

  const resize = (dim: "width" | "height", v: number): void => {
    if (!single) return;
    const size = Math.max(0.5, v);
    const ratio = single.height / single.width;
    const isText = single.kind === "text";
    if (!linked || isText) set({ [dim]: size }, dim);
    else if (dim === "width") set({ width: size, height: size * ratio }, "size");
    else set({ height: size, width: size / ratio }, "size");
  };

  return (
    <Section title={single ? "Layout" : `${layers.length} layers`}>
      <div className="flex justify-between">
        {ALIGN.map((a) => (
          <button
            key={a.edge}
            type="button"
            aria-label={single ? `${a.label} (to page)` : a.label}
            title={single ? `${a.label} to page` : a.label}
            onClick={() => align(a.edge)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-3.5"
          >
            {a.icon}
          </button>
        ))}
      </div>

      {single ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField label="X" unit="mm" value={single.x} onChange={(x) => set({ x }, "x")} step={0.5} />
            <NumberField label="Y" unit="mm" value={single.y} onChange={(y) => set({ y }, "y")} step={0.5} />
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
            <NumberField label="W" unit="mm" value={single.width} onChange={(v) => resize("width", v)} step={0.5} min={0.5} />
            <NumberField
              label="H"
              unit="mm"
              value={single.height}
              onChange={(v) => resize("height", v)}
              step={0.5}
              min={0.5}
            />
            <IconToggle label={linked ? "Unlock proportions" : "Lock proportions"} pressed={linked} onPressedChange={setLinked}>
              {linked ? <Link2 /> : <Unlink2 />}
            </IconToggle>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-1.5">
            <NumberField
              label="°"
              ariaLabel="Rotation"
              value={single.rotation}
              onChange={(rotation) => set({ rotation: ((((rotation + 180) % 360) + 360) % 360) - 180 }, "rotation")}
              step={1}
              scrubPx={1}
            />
            <IconToggle label="Flip horizontal" pressed={single.flipX} onPressedChange={(flipX) => set({ flipX }, "flipX")}>
              <FlipHorizontal2 />
            </IconToggle>
            <IconToggle label="Flip vertical" pressed={single.flipY} onPressedChange={(flipY) => set({ flipY }, "flipY")}>
              <FlipVertical2 />
            </IconToggle>
          </div>
        </>
      ) : null}
    </Section>
  );
}
