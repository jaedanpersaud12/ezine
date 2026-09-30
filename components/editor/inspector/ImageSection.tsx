"use client";

import { Contrast, FlipHorizontal, Maximize2, SunMedium } from "lucide-react";
import { SliderDetents } from "@/components/interior/slider-detents";
import { ColorField } from "@/components/editor/fields/ColorField";
import { FilterToggle } from "@/components/editor/fields/FilterToggle";
import { Row, Section } from "@/components/editor/fields/Section";
import { Button } from "@/components/ui/button";
import { fillPage, fillSpread } from "@/lib/editor/align";
import { effectiveDpi, LOW_DPI, spreadGeometry, type ImageFilters, type ImageLayer } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";
import { cn } from "@/lib/utils";

export function ImageSection({ layer }: { layer: ImageLayer }) {
  const zine = useEditorStore((s) => s.zine);
  const spreadIndex = useEditorStore((s) => s.spreadIndex);
  const patchLayers = useEditorStore((s) => s.patchLayers);
  if (!zine) return null;

  const dpi = Math.round(effectiveDpi(layer));
  const low = dpi < LOW_DPI;
  const facing = spreadGeometry(zine, spreadIndex).pages === 2;
  const setFilters = (f: Partial<ImageFilters>, key?: string): void =>
    patchLayers([layer.id], { filters: { ...layer.filters, ...f } }, key ? { key: `${key}:${layer.id}` } : undefined);

  return (
    <Section
      id="image"
      title="Image"
      action={
        <span
          title={low ? `Below ${LOW_DPI} dpi at this size — it may print soft` : "Print resolution at this size"}
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-[10.5px] tabular-nums",
            low ? "bg-warning-subtle text-warning" : "bg-muted text-muted-foreground",
          )}
        >
          {dpi} dpi
        </span>
      }
    >
      <div className={cn("grid gap-1.5", facing ? "grid-cols-2" : "grid-cols-1")}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => patchLayers([layer.id], fillPage(zine, spreadIndex, layer))}
        >
          <Maximize2 /> Fill page
        </Button>
        {facing ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => patchLayers([layer.id], fillSpread(zine, spreadIndex, layer))}
          >
            <FlipHorizontal /> Across fold
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <FilterToggle label="B&W" pressed={layer.filters.grayscale} onPressedChange={(grayscale) => setFilters({ grayscale })}>
          <Contrast />
        </FilterToggle>
        <FilterToggle label="Invert" pressed={layer.filters.invert} onPressedChange={(invert) => setFilters({ invert })}>
          <SunMedium />
        </FilterToggle>
      </div>
      <Row label="Ink tint">
        <ColorField label="Ink tint" nullable value={layer.filters.tint} onChange={(tint) => setFilters({ tint }, "tint")} />
      </Row>

      <SliderDetents
        label="Brightness"
        value={Math.round(layer.filters.brightness * 100)}
        min={-100}
        max={100}
        detents={[0]}
        haptic={false}
        format={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
        onValueChange={(v) => setFilters({ brightness: v / 100 }, "brightness")}
      />
      <SliderDetents
        label="Contrast"
        value={Math.round(layer.filters.contrast * 100)}
        min={-100}
        max={100}
        detents={[0]}
        haptic={false}
        format={(v) => (v > 0 ? `+${Math.round(v)}` : String(Math.round(v)))}
        onValueChange={(v) => setFilters({ contrast: v / 100 }, "contrast")}
      />
      <Row label="Source">
        <span className="truncate text-right font-mono text-[11px] text-subtle-foreground">
          {layer.srcWidthPx} × {layer.srcHeightPx} px
        </span>
      </Row>
    </Section>
  );
}
