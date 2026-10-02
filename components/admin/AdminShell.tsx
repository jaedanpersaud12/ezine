import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { AdminNav } from "@/components/admin/AdminNav";

// The frame around every admin screen: a sticky header, a fixed sidebar, and the content.
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 bg-background text-foreground [scrollbar-gutter:stable]">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border md:flex">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary font-heading text-[13px] font-bold text-primary-foreground" aria-hidden>
            z
          </span>
          <span className="text-sm font-semibold tracking-tight">Zine Builder</span>
        </div>
        <AdminNav />
        <div className="mt-auto border-t border-border p-3">
          <Link href="/" className="flex h-9 items-center rounded-lg px-3 text-[13.5px] font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring">
            Back to your zines
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col tracking-tight">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Admin</span>
          <span className="h-4 w-px bg-border" aria-hidden />
          <Link href="/admin" className="text-sm font-medium md:hidden">
            Users
          </Link>
          <div className="flex-1" />
          <UserButton />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
