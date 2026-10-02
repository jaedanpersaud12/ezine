import { cn } from "@/lib/utils";

// One instrument panel, not a row of boxes: hairlines between tiles come from a 1px gap over the
// border colour. Tile heights are fixed so a tile with a long hint matches one without.
export function StatStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 overflow-hidden rounded-2xl bg-card shadow-border", className)}>
      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">{children}</div>
    </div>
  );
}

type StatProps = {
  label: string;
  value: React.ReactNode;
  // What the figure is made of or compared to; a figure alone is trivia.
  hint: React.ReactNode;
};

export function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="bg-card p-4">
      <p className="h-4 text-[10px] font-semibold tracking-[0.13em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-heading text-3xl leading-none tabular-nums">{value}</p>
      <p className="mt-1 h-4 truncate text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
