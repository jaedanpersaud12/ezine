"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { flushLocalDraft } from "@/lib/editor/claim";
import { useEditorStore } from "@/stores/editor";

// Signed-out editing: sign in (or up) and come straight back to this zine, now in the account.
// The draft's id becomes its account id, so /zines/<id> is where it'll live; ClaimDraft moves it there.
export function SaveToAccountButton() {
  const zineId = useEditorStore((s) => s.zine?.id);
  if (!zineId) return null;
  const back = `/zines/${zineId}`;

  return (
    <SignInButton mode="modal" forceRedirectUrl={back} signUpForceRedirectUrl={back}>
      <Button
        size="sm"
        variant="outline"
        // Sign-in can leave the page (OAuth), so write the draft first. SignInButton awaits this
        // before opening, so the write lands before any redirect.
        onClick={() => flushLocalDraft().catch((error: unknown) => console.error("Could not save the draft", error))}
      >
        Sign in to save
      </Button>
    </SignInButton>
  );
}
