"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { claimLocalDraft } from "@/lib/editor/claim";
import { loadZine } from "@/lib/editor/persist";

// A zine made signed out, then left behind when someone signed in from the home page instead of
// the editor. Nothing to decide: it moves into the account and shows up in the list.
export function DraftSync() {
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const draft = await loadZine();
        if (!draft) return;
        const id = await claimLocalDraft(draft.id);
        if (cancelled || !id) return;
        setSaved(draft.title);
        router.refresh();
      } catch (error) {
        console.error("Could not move the browser draft into the account", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(null), 5000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  return (
    <AnimatePresence>
      {saved ? (
        <motion.p
          role="status"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 bottom-6 mx-auto w-fit rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-sm"
        >
          Saved “{saved}” from this browser to your account
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
