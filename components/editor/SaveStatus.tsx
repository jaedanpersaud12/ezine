"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Popover } from "@/components/interior/popover";
import { SignInAgainButton } from "@/components/editor/SignInAgainButton";
import { Button } from "@/components/ui/button";
import type { SaveFailure } from "@/lib/editor/saveError";
import type { Zine } from "@/lib/zine/schema";
import { useEditorStore } from "@/stores/editor";

type Props = {
  // Editing a zine saved to the signed-in account (vs. one kept only in this browser).
  cloud: boolean;
};

const LABEL = { idle: "", saving: "Saving…", saved: "Saved", error: "Not saved" } as const;
// Signed out, "Saved" would oversell it: the work only lives in this browser.
const LOCAL_LABEL = { ...LABEL, saved: "Saved in this browser" } as const;

function uploadTitle(zine: Zine | null, assetIds: string[]): string {
  const kinds = assetIds.map((id) => zine?.assets[id]?.kind ?? "image");
  if (kinds.length > 1) return `${kinds.length} files didn't upload`;
  return kinds[0] === "font" ? "A font didn't upload" : "An image didn't upload";
}

function explain(failure: SaveFailure, zine: Zine | null): { title: string; body: string } {
  switch (failure.reason) {
    case "offline":
      return { title: "You're offline", body: "Your changes are kept here and will save when you're back online." };
    case "signed-out":
      return { title: "You've been signed out", body: "Sign in again to keep saving. Your changes are kept here until then." };
    case "upload":
      return {
        title: uploadTitle(zine, failure.assetIds),
        body: "Everything else is waiting on it, and it's marked in the layers panel. Check your connection and try again.",
      };
    case "storage":
      return {
        title: "This browser is out of space",
        body: "Your latest changes couldn't be kept here. Free up some space, or sign in to save to your account.",
      };
    case "server":
      return { title: "Couldn't reach the server", body: "Your changes are kept here and we'll keep trying every few seconds." };
  }
}

// The save indicator in the top bar. When a save fails it becomes a button that says why and
// offers the fix.
export function SaveStatus({ cloud }: Props) {
  const saveState = useEditorStore((s) => s.saveState);
  const saveError = useEditorStore((s) => s.saveError);
  const zine = useEditorStore((s) => s.zine);
  const [open, setOpen] = useState(false);
  const label = (cloud ? LABEL : LOCAL_LABEL)[saveState];

  if (saveState === "error" && saveError) {
    const { title, body } = explain(saveError, zine);
    const retry = (): void => {
      setOpen(false);
      useEditorStore.getState().retrySave();
    };
    return (
      <Popover
        label="Why this isn't saved"
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        align="start"
        triggerClassName="h-6 rounded-md border-transparent bg-transparent px-1.5 text-xs font-normal text-destructive hover:bg-muted"
        className="w-72"
        trigger={label}
      >
        <div className="flex flex-col gap-2 p-3">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
          <div className="flex justify-end pt-1">
            {saveError.reason === "signed-out" && cloud ? (
              <SignInAgainButton />
            ) : (
              <Button size="sm" onClick={retry}>
                Retry
              </Button>
            )}
          </div>
        </div>
      </Popover>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {label ? (
        <motion.span
          key={saveState}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          className="text-xs text-subtle-foreground"
        >
          {label}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
