"use client";

import { useRef } from "react";
import { CaseUpper, CaseLower, Italic } from "lucide-react";
import { Dropdown } from "@/components/interior/dropdown";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { ColorField } from "@/components/editor/fields/ColorField";
import { IconToggle } from "@/components/editor/fields/IconToggle";
import { NumberField } from "@/components/editor/fields/NumberField";
import { Row, Section } from "@/components/editor/fields/Section";
import { importFont, uploadedFontId } from "@/lib/editor/assets";
import { builtInFont, FONTS } from "@/lib/zine/fonts";
import type { TextLayer } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

const UPLOAD = "__upload";

const WEIGHT_NAMES: Record<number, string> = {
  100: "Thin",
  200: "Extra light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
  800: "Extra bold",
  900: "Black",
};

const ALIGN = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
];

function isAlign(v: string): v is TextLayer["align"] {
  return v === "left" || v === "center" || v === "right" || v === "justify";
}

export function TextSection({ layer }: { layer: TextLayer }) {
  const zine = useEditorStore((s) => s.zine);
  const patchLayers = useEditorStore((s) => s.patchLayers);
  const fontInput = useRef<HTMLInputElement>(null);
  if (!zine) return null;

  const set = (patch: Partial<TextLayer>, key?: string): void =>
    patchLayers([layer.id], patch, key ? { key: `${key}:${layer.id}` } : undefined);

  const uploads = Object.values(zine.assets).filter((a) => a.kind === "font");
  const fontItems = [
    ...FONTS.map((f) => ({ value: f.id, label: f.label, hint: f.category })),
    ...uploads.map((a) => ({ value: uploadedFontId(a.id), label: a.name, hint: "Yours" })),
    { value: UPLOAD, label: "Upload a font…", hint: "otf ttf woff" },
  ];

  const font = builtInFont(layer.fontFamily);
  const weights = font?.weights ?? [400, 700];
  const canItalic = font?.italic ?? true;

  const chooseFont = (id: string): void => {
    if (id === UPLOAD) {
      fontInput.current?.click();
      return;
    }
    const next = builtInFont(id);
    const nextWeights = next?.weights ?? [400, 700];
    // Keep the weight if the new face has it, otherwise take the nearest one it does.
    const weight = nextWeights.reduce((a, b) => (Math.abs(b - layer.fontWeight) < Math.abs(a - layer.fontWeight) ? b : a));
    set({ fontFamily: id, fontWeight: weight, italic: layer.italic && (next?.italic ?? true) });
  };

  return (
    <Section id="type" title="Type">
      <Dropdown
        label="Font"
        items={fontItems}
        value={layer.fontFamily}
        className="w-full"
        triggerClassName="h-8 rounded-md border-transparent bg-muted/70 px-2.5 text-[13px]"
        menuClassName="w-full min-w-0"
        onChange={chooseFont}
      />
      <input
        ref={fontInput}
        type="file"
        accept=".otf,.ttf,.woff,.woff2"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const asset = await importFont(file);
            useEditorStore.getState().change((z) => {
              z.assets[asset.id] = asset;
            });
            set({ fontFamily: uploadedFontId(asset.id), fontWeight: 400, italic: false });
          } catch (error) {
            console.error("Font upload failed", error);
          }
        }}
      />

      <div className="grid grid-cols-[1fr_auto] gap-1.5">
        <Dropdown
          label="Weight"
          items={weights.map((w) => ({ value: String(w), label: WEIGHT_NAMES[w] ?? String(w), hint: String(w) }))}
          value={String(layer.fontWeight)}
          className="w-full"
          triggerClassName="h-7 rounded-md border-transparent bg-muted/70 px-2 text-xs font-normal"
          menuClassName="min-w-40"
          onChange={(v) => set({ fontWeight: Number(v) })}
        />
        <IconToggle label="Italic" pressed={layer.italic} onPressedChange={(italic) => canItalic && set({ italic })}>
          <Italic />
        </IconToggle>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <NumberField label="Size" value={layer.fontSizePt} unit="pt" min={1} max={1000} step={0.5} onChange={(fontSizePt) => set({ fontSizePt }, "size")} />
        <NumberField label="Lead" ariaLabel="Line height" value={layer.lineHeight} min={0.5} max={4} step={0.05} precision={2} scrubPx={4} onChange={(lineHeight) => set({ lineHeight }, "lead")} />
        <NumberField label="Trk" ariaLabel="Letter spacing" value={layer.letterSpacing} min={-300} max={2000} step={5} precision={0} onChange={(letterSpacing) => set({ letterSpacing }, "track")} />
      </div>

      <SegmentedControl
        label="Alignment"
        options={ALIGN}
        value={layer.align}
        className="w-full"
        onValueChange={(v) => isAlign(v) && set({ align: v })}
      />

      <Row label="Colour">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-1">
          <ColorField label="Text colour" value={layer.color} onChange={(c) => c && set({ color: c }, "color")} />
          <IconToggle label="UPPERCASE" pressed={false} onPressedChange={() => set({ text: layer.text.toUpperCase() })}>
            <CaseUpper />
          </IconToggle>
          <IconToggle label="lowercase" pressed={false} onPressedChange={() => set({ text: layer.text.toLowerCase() })}>
            <CaseLower />
          </IconToggle>
        </div>
      </Row>
    </Section>
  );
}
