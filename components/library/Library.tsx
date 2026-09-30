import { UserButton } from "@clerk/nextjs";
import { LocalDraftCard } from "@/components/library/LocalDraftCard";
import { NewZineButton } from "@/components/library/NewZineButton";
import { ZineCard } from "@/components/library/ZineCard";
import type { ZineSummary } from "@/lib/server/zines";

type Props = {
  zines: ZineSummary[];
};

export function Library({ zines }: Props) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3 text-card-foreground">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-[13px] font-bold text-primary-foreground" aria-hidden>
          z
        </span>
        <span className="flex-1 px-2 text-sm font-medium">Your zines</span>
        <UserButton />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Library</h1>
            <p className="text-sm text-muted-foreground">
              {zines.length ? `${zines.length} ${zines.length === 1 ? "zine" : "zines"}, saved to your account.` : "Nothing here yet."}
            </p>
          </div>
          <NewZineButton />
        </div>

        <LocalDraftCard />

        {zines.length ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
            {zines.map((zine) => (
              <li key={zine.id}>
                <ZineCard zine={zine} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
            Start a new zine and it saves here as you work.
          </div>
        )}
      </main>
    </div>
  );
}
