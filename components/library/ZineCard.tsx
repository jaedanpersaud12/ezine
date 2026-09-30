"use client";

import { useTransition } from "react";
import Link from "next/link";
import { HoldToConfirm } from "@/components/interior/hold-to-confirm";
import { deleteZineAction } from "@/actions/zines";
import type { ZineSummary } from "@/lib/server/zines";
import { cn } from "@/lib/utils";

type Props = {
  zine: ZineSummary;
};

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function ZineCard({ zine }: Props) {
  const [pending, startTransition] = useTransition();

  function remove(): void {
    startTransition(async () => {
      try {
        const result = await deleteZineAction(zine.id);
        if (!result.success) console.error("Could not delete zine", result.error);
      } catch (error) {
        console.error("Could not delete zine", error);
      }
    });
  }

  return (
    <div className={cn("group flex flex-col gap-2 transition-opacity", pending && "pointer-events-none opacity-40")}>
      <Link
        href={`/zines/${zine.id}`}
        className="flex items-center justify-center rounded-lg border border-border bg-muted p-5 outline-none transition-colors hover:border-ring focus-visible:ring-1 focus-visible:ring-ring"
      >
        {/* The cover at its trim proportions. */}
        <div
          className="flex w-3/4 items-end rounded-sm bg-card p-3 shadow-sm"
          style={{ aspectRatio: `${zine.widthMm} / ${zine.heightMm}` }}
        >
          <span className="line-clamp-3 font-heading text-sm font-semibold leading-tight text-card-foreground">{zine.title}</span>
        </div>
      </Link>
      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{zine.title}</p>
          <p className="text-xs text-subtle-foreground tabular-nums">
            {zine.pages} pages · {dateFormat.format(new Date(zine.updatedAt))}
          </p>
        </div>
        <HoldToConfirm onConfirm={remove} confirmLabel="Deleted" duration={1200} className="h-7 shrink-0 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
          Hold to delete
        </HoldToConfirm>
      </div>
    </div>
  );
}
