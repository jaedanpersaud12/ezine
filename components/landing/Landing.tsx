import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LandingBook } from "@/components/landing/LandingBook";
import { StartButton } from "@/components/landing/StartButton";

// The signed-out front door: one screen, one action. The book on the right is the real reader.
export function Landing() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8">
        <span className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary font-heading text-[13px] font-bold text-primary-foreground" aria-hidden>
            z
          </span>
          <span className="text-sm font-semibold tracking-tight">Zine Builder</span>
        </span>
        <SignInButton mode="modal">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </SignInButton>
      </header>

      <main className="grid flex-1 grid-cols-1 content-start items-center gap-8 lg:content-center px-4 pb-8 md:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 lg:pb-12">
        <section className="animate-in fade-in slide-in-from-bottom-2 flex max-w-xl flex-col gap-6 pt-6 duration-700 lg:pt-0">
          <h1 className="font-heading text-4xl font-semibold leading-[1.05] tracking-tighter text-balance md:text-5xl lg:text-6xl">
            Make a zine in your browser.
          </h1>
          <p className="max-w-[46ch] text-base leading-relaxed text-muted-foreground md:text-lg">
            Lay out pages with photos, type and drawings, then flip through the finished book in 3D. No account needed.
          </p>
          <div>
            <StartButton />
          </div>
        </section>

        <LandingBook />
      </main>
    </div>
  );
}
