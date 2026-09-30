"use client";

import { Dropdown } from "@/components/interior/dropdown";
import { SliderDetents } from "@/components/interior/slider-detents";
import { Row, Section } from "@/components/editor/fields/Section";
import { BLEND_MODES, type BlendMode, type Layer } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

const BLEND_ITEMS = BLEND_MODES.map((m) => ({
  value: m,
  label: m === "normal" ? "Normal" : m.replace("-", " ").replace(/^\w/, (c) => c.toUpperCase()),
  hint: m === "multiply" ? "overprint" : undefined,
}));

function isBlend(v: string): v is BlendMode {
  return (BLEND_MODES as readonly string[]).includes(v);
}

export function AppearanceSection({ layers }: { layers: Layer[] }) {
  const patchLayers = useEditorStore((s) => s.patchLayers);
  const ids = layers.map((l) => l.id);
  const first = layers[0];

  return (
    <Section title="Appearance">
      <SliderDetents
        label="Opacity"
        value={Math.round(first.opacity * 100)}
        min={0}
        max={100}
        detents={[0, 25, 50, 75, 100]}
        format={(v) => `${Math.round(v)}%`}
        haptic={false}
        onValueChange={(v) => patchLayers(ids, { opacity: v / 100 }, { key: `opacity:${ids.join()}` })}
      />
      <Row label="Blend">
        <Dropdown
          label="Blend"
          items={BLEND_ITEMS}
          value={first.blend}
          className="w-full"
          triggerClassName="h-7 rounded-md border-transparent bg-muted/70 px-2 text-xs font-normal"
          menuClassName="min-w-44"
          onChange={(v) => isBlend(v) && patchLayers(ids, { blend: v })}
        />
      </Row>
    </Section>
  );
}
