import Link from "next/link";

type Props = {
  title: string;
  message: string;
  // Buttons or links; the home link is always there.
  children?: React.ReactNode;
};

// Full-page state for the moments the app can't show what was asked for: a missing page, a
// crash. Same header mark as the landing page, so it still reads as this app.
export function StatusScreen({ title, message, children }: Props) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary font-heading text-[13px] font-bold text-primary-foreground" aria-hidden>
            z
          </span>
          <span className="text-sm font-semibold tracking-tight">Zine Builder</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center px-4 pb-16 md:px-8">
        <section className="flex max-w-md flex-col gap-4">
          <h1 className="font-heading text-3xl font-semibold tracking-tighter text-balance">{title}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{message}</p>
          <div className="flex flex-wrap items-center gap-2 pt-2">{children}</div>
        </section>
      </main>
    </div>
  );
}
