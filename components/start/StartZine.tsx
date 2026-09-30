"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorLoading } from "@/components/editor/EditorLoading";
import { createZineAction } from "@/actions/zines";
import { claimLocalDraft } from "@/lib/editor/claim";

let creating: Promise<string | null> | null = null;

// A draft left in this browser wins over a blank zine: it's what the person was just making.
function start(): Promise<string | null> {
  creating ??= (async () => {
    try {
      const claimed = await claimLocalDraft();
      if (claimed) return claimed;
      const result = await createZineAction();
      return result.success && result.id ? result.id : null;
    } finally {
      creating = null;
    }
  })();
  return creating;
}

export function StartZine() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    start()
      .then((id) => {
        if (cancelled) return;
        if (id) router.replace(`/zines/${id}`);
        else setFailed(true);
      })
      .catch((error: unknown) => {
        console.error("Could not start a zine", error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return <EditorLoading message={failed ? "Couldn't create a zine. Refresh to try again." : "Starting a new zine…"} />;
}
