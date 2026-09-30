"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveCloudZine } from "@/lib/editor/cloud";
import { clearZine, loadZine } from "@/lib/editor/persist";
import type { Zine } from "@/lib/zine/schema";

// A zine started while signed out lives only in this browser. Offer to move it into the account.
export function LocalDraftCard() {
  const router = useRouter();
  const [draft, setDraft] = useState<Zine | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  useEffect(() => {
    void loadZine().then(setDraft);
  }, []);

  async function save(zine: Zine): Promise<void> {
    setState("saving");
    try {
      await saveCloudZine(zine);
      await clearZine();
      router.push(`/zines/${zine.id}`);
    } catch (error) {
      console.error("Could not save the local draft", error);
      setState("error");
    }
  }

  if (!draft) return null;
  return (
    <div className="mb-6 flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground">
      <CloudUpload className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">“{draft.title}” is only on this device</p>
        <p className="text-xs text-muted-foreground">
          {state === "error" ? "Couldn't save it. Check your connection and try again." : "Save it to your account to keep it and open it anywhere."}
        </p>
      </div>
      <Button size="sm" onClick={() => void save(draft)} disabled={state === "saving"}>
        {state === "saving" ? "Saving…" : "Save to account"}
      </Button>
    </div>
  );
}
