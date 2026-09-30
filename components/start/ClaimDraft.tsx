"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { EditorLoading } from "@/components/editor/EditorLoading";
import { claimLocalDraft } from "@/lib/editor/claim";

type Props = {
  id: string;
};

// Where sign-in lands someone who was editing signed out: /zines/<their draft's id>, before the
// draft exists in the account. Save it, then let the server render the real editor.
export function ClaimDraft({ id }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"claiming" | "missing" | "error">("claiming");

  useEffect(() => {
    let cancelled = false;
    claimLocalDraft(id)
      .then((claimed) => {
        if (cancelled) return;
        if (claimed) router.refresh();
        else setState("missing");
      })
      .catch((error: unknown) => {
        console.error("Could not save the draft to the account", error);
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (state === "claiming") return <EditorLoading message="Saving your zine to your account…" />;
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="font-heading text-xl font-semibold tracking-tight">
        {state === "missing" ? "This zine isn't in your account" : "Your zine didn't save"}
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {state === "missing"
          ? "It may belong to another account, or it was deleted."
          : "It's still safe in this browser. Check your connection and try again."}
      </p>
      <div className="flex gap-2">
        {state === "error" ? (
          <button type="button" className={buttonVariants({ size: "sm" })} onClick={() => window.location.reload()}>
            Try again
          </button>
        ) : null}
        <Link href="/" className={buttonVariants({ size: "sm", variant: state === "error" ? "outline" : "default" })}>
          Your zines
        </Link>
      </div>
    </main>
  );
}
