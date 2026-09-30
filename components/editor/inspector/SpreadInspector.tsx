"use client";

import { Minus, Plus } from "lucide-react";
import { Dropdown } from "@/components/interior/dropdown";
import { ColorField } from "@/components/editor/fields/ColorField";
import { NumberField } from "@/components/editor/fields/NumberField";
import { Row, Section } from "@/components/editor/fields/Section";
import { TRIMS, type TrimId } from "@/lib/book/trim";
import { pageCount, spreadLabel } from "@/lib/zine/schema";
import { removablePair, useEditorStore } from "@/stores/editor";

const CUSTOM = "custom";
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
  const addPages = useEditorStore((s) => s.addPages);
  const removePages = useEditorStore((s) => s.removePages);
  if (!zine) return null;

  const spread = zine.spreads[spreadIndex];
  const canRemove = removablePair(zine, spreadIndex) !== null;

  return (
    <>
      <Section title={spreadLabel(zine, spreadIndex)}>
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

      <Section title="Book">
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
        <Row label="Pages">
          <div className="flex items-center justify-between rounded-md bg-muted/70 p-0.5">
            <button
              type="button"
              aria-label="Remove 4 pages"
              title={canRemove ? "Remove this sheet (4 pages)" : "Open an inside spread to remove pages"}
              disabled={!canRemove}
              onClick={() => removePages(spreadIndex)}
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40 [&_svg]:size-3.5"
            >
              <Minus />
            </button>
            <span className="font-mono text-xs tabular-nums">{pageCount(zine)}</span>
            <button
              type="button"
              aria-label="Add 4 pages"
              title="Add a sheet (4 pages) after this spread"
              onClick={addPages}
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground [&_svg]:size-3.5"
            >
              <Plus />
            </button>
          </div>
        </Row>
        <p className="text-[11px] leading-relaxed text-subtle-foreground">
          Saddle stitched, so pages come in fours: one folded sheet each.
        </p>
      </Section>
    </>
  );
}
