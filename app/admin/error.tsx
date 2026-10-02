"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
};

// One failing admin screen keeps the shell and a way back.
export default function AdminError({ error, retry }: Props) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-start gap-3 py-16">
      <h1 className="font-heading text-2xl font-semibold">This screen couldn&apos;t load.</h1>
      <p className="text-sm text-muted-foreground">Something went wrong reading the accounts. Nothing was changed.</p>
      {error.digest ? <p className="font-mono text-xs text-muted-foreground">Reference {error.digest}</p> : null}
      <div className="flex gap-2 pt-1">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/admin" className={buttonVariants({ variant: "ghost" })}>
          Back to users
        </Link>
      </div>
    </div>
  );
}
