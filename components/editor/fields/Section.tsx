import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

// One titled group in the inspector.
export function Section({ title, action, children, className }: SectionProps) {
  return (
    <section className={cn("flex flex-col gap-2.5 border-b border-border px-4 py-3.5 last:border-b-0", className)}>
      <header className="flex h-5 items-center justify-between">
        <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

type RowProps = { label?: string; children: ReactNode; className?: string };

export function Row({ label, children, className }: RowProps) {
  return (
    <div className={cn("grid items-center gap-2", label ? "grid-cols-[64px_1fr]" : "grid-cols-1", className)}>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      {children}
    </div>
  );
}
