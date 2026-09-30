"use client";

import { SegmentedControl } from "@/components/interior/segmented-control";
import { ColorField } from "@/components/editor/fields/ColorField";
import { NumberField } from "@/components/editor/fields/NumberField";
import { Row, Section } from "@/components/editor/fields/Section";
import { DEFAULT_INK } from "@/lib/zine/palettes";
import type { ShapeLayer } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

const SHAPES = [
  { value: "rect", label: "Rect" },
  { value: "ellipse", label: "Ellipse" },
  { value: "triangle", label: "Tri" },
  { value: "line", label: "Line" },
];

function isShape(v: string): v is ShapeLayer["shape"] {
  return v === "rect" || v === "ellipse" || v === "triangle" || v === "line";
}

export function ShapeSection({ layer }: { layer: ShapeLayer }) {
  const patchLayers = useEditorStore((s) => s.patchLayers);
  const set = (patch: Partial<ShapeLayer>, key?: string): void =>
    patchLayers([layer.id], patch, key ? { key: `${key}:${layer.id}` } : undefined);
  const isLine = layer.shape === "line";

  return (
    <Section title="Shape">
      <SegmentedControl
        label="Shape"
        options={SHAPES}
        value={layer.shape}
        className="w-full"
        onValueChange={(v) => {
          if (!isShape(v)) return;
          // A line needs a stroke to be visible; everything else starts filled.
          if (v === "line") set({ shape: v, height: 1, stroke: layer.stroke ?? layer.fill ?? DEFAULT_INK, fill: null });
          else set({ shape: v, height: isLine ? layer.width : layer.height, fill: layer.fill ?? layer.stroke });
        }}
      />
      {!isLine ? (
        <Row label="Fill">
          <ColorField label="Fill" nullable value={layer.fill} onChange={(fill) => set({ fill }, "fill")} />
        </Row>
      ) : null}
      <Row label="Stroke">
        <ColorField label="Stroke" nullable={!isLine} value={layer.stroke} onChange={(stroke) => set({ stroke }, "stroke")} />
      </Row>
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField label="Wt" ariaLabel="Stroke width" unit="mm" value={layer.strokeWidthMm} min={0} max={50} step={0.1} precision={2} onChange={(strokeWidthMm) => set({ strokeWidthMm }, "sw")} />
        {layer.shape === "rect" ? (
          <NumberField label="R" ariaLabel="Corner radius" unit="mm" value={layer.cornerRadiusMm} min={0} max={200} step={0.5} onChange={(cornerRadiusMm) => set({ cornerRadiusMm }, "radius")} />
        ) : null}
      </div>
    </Section>
  );
}
