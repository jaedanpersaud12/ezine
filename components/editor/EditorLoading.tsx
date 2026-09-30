import { cn } from "@/lib/utils";

type Props = {
  // What's happening, when it's worth saying (e.g. saving a draft into the account).
  message?: string;
};

// The editor's frame with nothing in it, so the real one fades in without a layout jump.
export function EditorLoading({ message }: Props) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background" aria-busy="true">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary font-heading text-[13px] font-bold text-primary-foreground" aria-hidden>
          z
        </span>
        <span className="ml-2 h-3 w-32 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted">
            <div className="aspect-[148/210] h-[62%] rounded-xs bg-card shadow-sm" />
            {message ? (
              <p
                role="status"
                className={cn(
                  "absolute bottom-6 rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-sm",
                  "animate-in fade-in slide-in-from-bottom-1 duration-300",
                )}
              >
                {message}
              </p>
            ) : null}
          </div>
          <div className="h-28 shrink-0 border-t border-border bg-card" />
        </div>
        <div className="hidden w-72 shrink-0 border-l border-border bg-card md:block" />
      </div>
    </div>
  );
}
