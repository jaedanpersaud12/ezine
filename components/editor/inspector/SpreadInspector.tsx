"use client";

import { Minus, Plus } from "lucide-react";
import { Dropdown } from "@/components/interior/dropdown";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { ColorField } from "@/components/editor/fields/ColorField";
import { NumberField } from "@/components/editor/fields/NumberField";
import { FoliosSection } from "@/components/editor/inspector/FoliosSection";
import { Row, Section } from "@/components/editor/fields/Section";
import { TRIMS, type TrimId } from "@/lib/book/trim";
import { pageCount, pageStep, spreadLabel } from "@/lib/zine/schema";
import { MAX_PAGES, useEditorStore } from "@/stores/editor";

const CUSTOM = "custom";
const BINDINGS = [
  { value: "saddle", label: "Saddle stitch" },
  { value: "none", label: "None" },
];
const TRIM_ITEMS = [
  ...Object.values(TRIMS).map((t) => ({ value: t.id, label: t.label, hint: `${t.widthMm} × ${t.heightMm}` })),
  { value: CUSTOM, label: "Custom", hint: "any size" },
];

function isTrimId(v: string): v is TrimId {
  return v in TRIMS;
}

// Shown when nothing is selected: this spread, and the book as a whole.
export function SpreadInspector() {
  const zine = useEditorStore((s) => s.zine);
  const spreadIndex = useEditorStore((s) => s.spreadIndex);
  const change = useEditorStore((s) => s.change);
  const setPageCount = useEditorStore((s) => s.setPageCount);
  const setBinding = useEditorStore((s) => s.setBinding);
  if (!zine) return null;

  const spread = zine.spreads[spreadIndex];
  const step = pageStep(zine);

  return (
    <>
      <Section id="spread" title={spreadLabel(zine, spreadIndex)}>
        <Row label="Colour">
          <ColorField
            label="Spread colour"
            nullable
            value={spread.background}
            onChange={(background) =>
              change(
                (z) => {
                  z.spreads[spreadIndex].background = background;
                },
                { key: `bg:${spread.id}` },
              )
            }
          />
        </Row>
        <p className="text-[11px] leading-relaxed text-subtle-foreground">
          Runs to the bleed. Leave empty to show the paper.
        </p>
      </Section>

      <Section id="book" title="Book">
        <Row label="Trim">
          <Dropdown
            label="Trim size"
            items={TRIM_ITEMS}
            value={zine.trim.presetId ?? CUSTOM}
            className="w-full"
            triggerClassName="h-7 rounded-md border-transparent bg-muted/70 px-2 text-xs font-normal"
            menuClassName="min-w-52"
            onChange={(v) =>
              change((z) => {
                if (isTrimId(v)) {
                  z.trim = { presetId: v, widthMm: TRIMS[v].widthMm, heightMm: TRIMS[v].heightMm };
                } else {
                  z.trim.presetId = null;
                }
              })
            }
          />
        </Row>
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField
            label="W"
            unit="mm"
            value={zine.trim.widthMm}
            min={40}
            max={420}
            onChange={(w) =>
              change(
                (z) => {
                  z.trim = { ...z.trim, presetId: null, widthMm: w };
                },
                { key: "trim" },
              )
            }
          />
          <NumberField
            label="H"
            unit="mm"
            value={zine.trim.heightMm}
            min={40}
            max={420}
            onChange={(h) =>
              change(
                (z) => {
                  z.trim = { ...z.trim, presetId: null, heightMm: h };
                },
                { key: "trim" },
              )
            }
          />
        </div>
        <Row label="Paper">
          <ColorField
            label="Paper"
            palette="paper"
            value={zine.paper.color}
            onChange={(c) =>
              c &&
              change(
                (z) => {
                  z.paper.color = c;
                },
                { key: "paper" },
              )
            }
          />
        </Row>
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField
            label="Bleed"
            unit="mm"
            value={zine.bleedMm}
            min={0}
            max={10}
            step={0.5}
            onChange={(v) =>
              change(
                (z) => {
                  z.bleedMm = v;
                },
                { key: "bleed" },
              )
            }
          />
          <NumberField
            label="Safe"
            unit="mm"
            value={zine.safeMm}
            min={0}
            max={30}
            step={0.5}
            onChange={(v) =>
              change(
                (z) => {
                  z.safeMm = v;
                },
                { key: "safe" },
              )
            }
          />
        </div>
        <Row label="Binding">
          <SegmentedControl
            label="Binding"
            options={BINDINGS}
            value={zine.binding}
            className="w-full"
            onValueChange={(v) => (v === "saddle" || v === "none") && setBinding(v)}
          />
        </Row>
        <Row label="Pages">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1">
            <button
              type="button"
              aria-label={`Remove ${step} pages`}
              title={`Remove the last ${step} pages`}
              disabled={pageCount(zine) <= 4}
              onClick={() => setPageCount(pageCount(zine) - step)}
              className="flex size-7 items-center justify-center rounded-md bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 [&_svg]:size-3.5"
            >
              <Minus />
            </button>
            <NumberField
              label="#"
              ariaLabel="Page count"
              value={pageCount(zine)}
              min={4}
              max={MAX_PAGES}
              step={step}
              precision={0}
              scrubPx={12}
              onChange={setPageCount}
            />
            <button
              type="button"
              aria-label={`Add ${step} pages`}
              title={`Add ${step} pages before the back cover`}
              disabled={pageCount(zine) >= MAX_PAGES}
              onClick={() => setPageCount(pageCount(zine) + step)}
              className="flex size-7 items-center justify-center rounded-md bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 [&_svg]:size-3.5"
            >
              <Plus />
            </button>
          </div>
        </Row>
        <p className="text-[11px] leading-relaxed text-subtle-foreground">
          {zine.binding === "saddle"
            ? "Stapled through the fold, so pages come in fours: one folded sheet each."
            : "Loose leaves or digital: pages come in twos, one leaf each."}{" "}
          Pages are added or removed at the back.
        </p>
      </Section>

      <FoliosSection />
    </>
  );
}
