"use client";

import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

// Only rendered for account zines, where Clerk is always present. The server has stopped
// accepting this session but Clerk may still think it's live, and it won't open a sign-in over a
// live session. So end it and go through sign-in, then come straight back to this zine: the
// unsaved changes are kept in this browser (lib/editor/persist.ts) and restored on return.
export function SignInAgainButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  const signInAgain = (): void => {
    const back = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`;
    void signOut({ redirectUrl: back }).catch((error: unknown) => {
      console.error("Could not end the session", error);
      router.push(back);
    });
  };

  return (
    <Button size="sm" onClick={signInAgain}>
      Sign in
    </Button>
  );
}
