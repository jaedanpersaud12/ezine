"use client";

import { useEffect, useRef } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/stores/editor";

// Only rendered for account zines, where Clerk is always present. Signs in over the editor (no
// navigation, so unsaved edits stay put) and saves as soon as the session is back.
export function SignInAgainButton() {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const wasSignedIn = useRef(isSignedIn);

  useEffect(() => {
    if (isSignedIn && !wasSignedIn.current) useEditorStore.getState().retrySave();
    wasSignedIn.current = isSignedIn;
  }, [isSignedIn]);

  return (
    <Button size="sm" onClick={() => openSignIn()}>
      Sign in
    </Button>
  );
}
