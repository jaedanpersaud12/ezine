import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ADMIN_PAGE_SIZE } from "@/lib/admin";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  total: number;
  noun: string;
  hrefFor: (page: number) => string;
};

const STEP = "flex size-8 items-center justify-center rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-4";

// Always rendered, even for one page, at a fixed height: the card is the same size whatever the data.
export function AdminPager({ page, total, noun, hrefFor }: Props) {
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * ADMIN_PAGE_SIZE + 1;
  const to = Math.min(total, page * ADMIN_PAGE_SIZE);
  return (
    <footer className="flex h-[52px] items-center justify-between border-t border-border px-4 text-xs text-muted-foreground">
      <p className="tabular-nums">
        {from}–{to} of {total} {noun}
      </p>
      <div className="flex items-center gap-1">
        <span className="px-2 tabular-nums">
          Page {Math.min(page, pages)} of {pages}
        </span>
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} aria-label="Previous page" className={cn(STEP, "hover:bg-muted hover:text-foreground")}>
            <ChevronLeft />
          </Link>
        ) : (
          <span aria-hidden className={cn(STEP, "opacity-35")}>
            <ChevronLeft />
          </span>
        )}
        {page < pages ? (
          <Link href={hrefFor(page + 1)} aria-label="Next page" className={cn(STEP, "hover:bg-muted hover:text-foreground")}>
            <ChevronRight />
          </Link>
        ) : (
          <span aria-hidden className={cn(STEP, "opacity-35")}>
            <ChevronRight />
          </span>
        )}
      </div>
    </footer>
  );
}
