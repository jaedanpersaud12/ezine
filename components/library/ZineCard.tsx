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

const recent = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const older = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

function edited(iso: string): string {
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (minutes > -1) return "Edited just now";
  if (minutes > -60) return `Edited ${recent.format(minutes, "minute")}`;
  if (minutes > -60 * 24) return `Edited ${recent.format(Math.round(minutes / 60), "hour")}`;
  if (minutes > -60 * 24 * 7) return `Edited ${recent.format(Math.round(minutes / 1440), "day")}`;
  return `Edited ${older.format(new Date(iso))}`;
}

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
    <div className={cn("group flex flex-col gap-3 transition-opacity", pending && "pointer-events-none opacity-40")}>
      <Link
        href={`/zines/${zine.id}`}
        className="flex aspect-[4/5] items-center justify-center rounded-lg bg-muted outline-none transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring"
      >
        {/* The cover at its trim proportions, in its own colours (page content, not UI). */}
        <div
          className="w-[62%] rounded-xs shadow-sm ring-1 ring-border transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:rotate-[-1.5deg]"
          style={{ aspectRatio: `${zine.widthMm} / ${zine.heightMm}`, backgroundColor: zine.coverColor }}
        />
      </Link>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/zines/${zine.id}`} className="min-w-0 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <p className="truncate text-sm font-medium">{zine.title || "Untitled zine"}</p>
          <p className="text-xs text-subtle-foreground">
            {zine.pages} pages, {edited(zine.updatedAt)}
          </p>
        </Link>
        <HoldToConfirm
          onConfirm={remove}
          confirmLabel="Deleted"
          duration={1200}
          className="h-7 shrink-0 px-2 text-xs opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          Hold to delete
        </HoldToConfirm>
      </div>
    </div>
  );
}
