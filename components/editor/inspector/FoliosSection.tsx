"use client";

import { Dropdown } from "@/components/interior/dropdown";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { ColorField } from "@/components/editor/fields/ColorField";
import { NumberField } from "@/components/editor/fields/NumberField";
import { Row, Section } from "@/components/editor/fields/Section";
import { uploadedFontId } from "@/lib/editor/assets";
import { FONTS } from "@/lib/zine/fonts";
import { foliosOf } from "@/lib/zine/folios";
import type { Folios } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

const PLACEMENT = [
  { value: "off", label: "Off" },
  { value: "outer", label: "Outer" },
  { value: "centre", label: "Centre" },
];

// Automatic page numbers on every inside page.
export function FoliosSection() {
  const zine = useEditorStore((s) => s.zine);
  const change = useEditorStore((s) => s.change);
  if (!zine) return null;
  const f = foliosOf(zine);

  const set = (patch: Partial<Folios>, key?: string): void =>
    change(
      (z) => {
        z.folios = { ...foliosOf(z), ...patch };
      },
      key ? { key: `folios:${key}` } : undefined,
    );

  const fonts = [
    ...FONTS.map((font) => ({ value: font.id, label: font.label, hint: font.category })),
    ...Object.values(zine.assets)
      .filter((a) => a.kind === "font")
      .map((a) => ({ value: uploadedFontId(a.id), label: a.name, hint: "Yours" })),
  ];

  return (
    <Section id="folios" title="Page numbers">
      <SegmentedControl
        label="Page numbers"
        options={PLACEMENT}
        value={f.enabled ? f.position : "off"}
        className="w-full"
        onValueChange={(v) => {
          if (v === "off") set({ enabled: false });
          else if (v === "outer" || v === "centre") set({ enabled: true, position: v });
        }}
      />
      {f.enabled ? (
        <>
          <Dropdown
            label="Page number font"
            items={fonts}
            value={f.fontFamily}
            className="w-full"
            triggerClassName="h-7 rounded-md border-transparent bg-muted/70 px-2 text-xs font-normal"
            menuClassName="min-w-52"
            onChange={(fontFamily) => set({ fontFamily })}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField label="Size" unit="pt" value={f.sizePt} min={4} max={72} step={0.5} onChange={(sizePt) => set({ sizePt }, "size")} />
            <NumberField label="Up" ariaLabel="Distance from bottom" unit="mm" value={f.marginMm} min={0} max={40} step={0.5} onChange={(marginMm) => set({ marginMm }, "margin")} />
          </div>
          <Row label="Colour">
            <ColorField label="Page number colour" value={f.color} onChange={(color) => color && set({ color }, "color")} />
          </Row>
        </>
      ) : (
        <p className="text-[11px] leading-relaxed text-subtle-foreground">Numbers every inside page. Covers stay clean.</p>
      )}
    </Section>
  );
}
