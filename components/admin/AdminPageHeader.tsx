import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: React.ReactNode;
  // One line saying what the screen answers.
  summary?: React.ReactNode;
  back?: { href: string; label: string };
  children?: React.ReactNode;
};

// Sticky under the shell header, bleeding to the content edges, so the title and its controls stay
// put while a long table scrolls.
export function AdminPageHeader({ title, summary, back, children }: Props) {
  return (
    <div className="sticky top-14 z-10 -mx-4 -mt-4 mb-6 flex h-[4.5rem] items-center gap-4 bg-background/85 px-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8">
      <div className="min-w-0 flex-1">
        {back ? (
          <Link href={back.href} className="mb-1 flex w-fit items-center gap-0.5 text-[11px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-3">
            <ChevronLeft />
            {back.label}
          </Link>
        ) : null}
        <div className="flex items-baseline gap-3">
          <h1 className="shrink-0 font-heading text-2xl leading-none font-semibold">{title}</h1>
          {summary ? <p className="min-w-0 truncate text-xs text-muted-foreground">{summary}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
