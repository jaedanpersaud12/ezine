"use client";

import { ColorField } from "@/components/editor/fields/ColorField";
import { NumberField } from "@/components/editor/fields/NumberField";
import { Row, Section } from "@/components/editor/fields/Section";
import type { DrawLayer } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

export function DrawSection({ layer }: { layer: DrawLayer }) {
  const patchLayers = useEditorStore((s) => s.patchLayers);
  const set = (patch: Partial<DrawLayer>, key: string): void => patchLayers([layer.id], patch, { key: `${key}:${layer.id}` });

  return (
    <Section title="Stroke">
      <Row label="Colour">
        <ColorField label="Stroke colour" value={layer.stroke} onChange={(stroke) => stroke && set({ stroke }, "stroke")} />
      </Row>
      <NumberField label="Wt" ariaLabel="Stroke width" unit="mm" value={layer.strokeWidthMm} min={0.1} max={50} step={0.1} precision={2} onChange={(strokeWidthMm) => set({ strokeWidthMm }, "sw")} />
    </Section>
  );
}
