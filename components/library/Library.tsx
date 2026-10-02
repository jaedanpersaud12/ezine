import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { AdminLink } from "@/components/library/AdminLink";
import { DraftSync } from "@/components/library/DraftSync";
import { NewZineButton } from "@/components/library/NewZineButton";
import { ZineCard } from "@/components/library/ZineCard";
import type { ZineSummary } from "@/lib/server/zines";

type Props = {
  zines: ZineSummary[];
};

export function Library({ zines }: Props) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary font-heading text-[13px] font-bold text-primary-foreground" aria-hidden>
            z
          </span>
          <span className="text-sm font-semibold tracking-tight">Zine Builder</span>
        </Link>
        <div className="flex-1" />
        <AdminLink />
        <UserButton />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 md:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Your zines</h1>
          {zines.length ? <NewZineButton /> : null}
        </div>

        {zines.length ? (
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {zines.map((zine) => (
              <li key={zine.id}>
                <ZineCard zine={zine} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed border-border px-6 py-20 text-center">
            <div className="aspect-[148/210] w-16 -rotate-3 rounded-xs border border-border bg-card shadow-sm" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium">No zines yet</p>
              <p className="text-sm text-muted-foreground">Start one and it saves here as you work.</p>
            </div>
            <NewZineButton />
          </div>
        )}
      </main>
      <DraftSync />
    </div>
  );
}
