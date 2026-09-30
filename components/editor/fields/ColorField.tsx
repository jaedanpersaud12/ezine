"use client";

import { useState } from "react";
import { Ban, Pipette } from "lucide-react";
import { Popover, type PopoverSide } from "@/components/interior/popover";
import { DEFAULT_INK, RISO_INKS, PAPERS, type Swatch } from "@/lib/zine/palettes";
import { cn } from "@/lib/utils";

type ColorFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  // Offer "none" (transparent) as a choice.
  nullable?: boolean;
  palette?: "ink" | "paper";
  side?: PopoverSide;
  className?: string;
};

const HEX = /^#?([0-9a-fA-F]{6})$/;

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

function eyeDropper(): EyeDropperCtor | null {
  if (typeof window === "undefined" || !("EyeDropper" in window)) return null;
  return (window as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper;
}

function SwatchButton({ swatch, active, onPick }: { swatch: Swatch; active: boolean; onPick: (hex: string) => void }) {
  return (
    <button
      type="button"
      title={swatch.name}
      aria-label={swatch.name}
      onClick={() => onPick(swatch.hex)}
      className={cn(
        "size-6 rounded-full ring-1 ring-foreground/10 ring-inset transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "ring-2 ring-foreground ring-offset-2 ring-offset-popover",
      )}
      style={{ backgroundColor: swatch.hex }}
    />
  );
}

// A swatch that opens ink presets, a full picker, a hex field and (where supported) an eyedropper.
export function ColorField({
  label,
  value,
  onChange,
  nullable = false,
  palette = "ink",
  side = "left",
  className,
}: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const swatches = palette === "paper" ? PAPERS : RISO_INKS;
  const Dropper = eyeDropper();

  const pick = (hex: string | null): void => onChange(hex ? hex.toLowerCase() : null);

  return (
    <Popover
      label={label}
      open={open}
      onOpenChange={setOpen}
      side={side}
      align="start"
      triggerClassName={cn(
        "h-7 w-full justify-start gap-2 rounded-md border-transparent bg-muted/70 px-1.5 text-xs font-normal hover:bg-muted",
        className,
      )}
      className="w-60"
      trigger={
        <>
          <span
            className={cn(
              "size-4 shrink-0 rounded-sm ring-1 ring-foreground/15 ring-inset",
              !value && "bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_2px,var(--background)_2px,var(--background)_4px)]",
            )}
            style={value ? { backgroundColor: value } : undefined}
          />
          <span className="font-mono text-[11.5px] uppercase tabular-nums text-foreground">{value ?? "None"}</span>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-medium text-muted-foreground">{palette === "paper" ? "Paper stock" : "Riso inks"}</p>
        <div className="grid grid-cols-8 gap-1.5">
          {swatches.map((s) => (
            <SwatchButton key={s.hex} swatch={s} active={value === s.hex} onPick={pick} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-foreground/15 ring-inset">
            <span className="absolute inset-0" style={{ backgroundColor: value ?? "transparent" }} />
            <input
              type="color"
              aria-label="Custom colour"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={value ?? DEFAULT_INK}
              onChange={(e) => pick(e.target.value)}
            />
          </label>
          <input
            aria-label="Hex"
            className="h-7 min-w-0 flex-1 rounded-md bg-muted/70 px-2 font-mono text-[11.5px] uppercase text-foreground outline-none focus:ring-1 focus:ring-ring"
            value={hexDraft ?? value ?? ""}
            placeholder="#RRGGBB"
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={(e) => {
              const m = HEX.exec(e.target.value.trim());
              if (m) pick(`#${m[1]}`);
              setHexDraft(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          {Dropper ? (
            <button
              type="button"
              aria-label="Pick a colour from the screen"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={async () => {
                try {
                  const { sRGBHex } = await new Dropper().open();
                  pick(sRGBHex);
                } catch {
                  // Cancelled.
                }
              }}
            >
              <Pipette className="size-3.5" />
            </button>
          ) : null}
          {nullable ? (
            <button
              type="button"
              aria-label="No colour"
              onClick={() => pick(null)}
              className={cn(
                "flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                value === null && "bg-accent text-accent-foreground",
              )}
            >
              <Ban className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </Popover>
  );
}
