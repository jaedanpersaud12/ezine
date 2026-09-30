"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StatusScreen } from "@/components/status/StatusScreen";
import { Button, buttonVariants } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
};

// Any page that throws while rendering. Zines save as you go, so the message can say so.
export default function ErrorPage({ error, retry }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      title="Something went wrong."
      message="This page hit a problem it couldn't recover from. Anything saved before it happened is still there."
    >
      <Button onClick={() => retry()}>Try again</Button>
      <Link href="/" className={buttonVariants({ variant: "ghost" })}>
        Go home
      </Link>
    </StatusScreen>
  );
}
