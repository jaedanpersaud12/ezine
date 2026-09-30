import { saveCloudZine } from "@/lib/editor/cloud";
import { clearZine, loadZine, saveZine } from "@/lib/editor/persist";
import { useEditorStore } from "@/stores/editor";

// Moving a signed-out draft into the account. The draft keeps its id, so the URL a sign-in
// redirects to (/zines/<draft id>) is the URL the saved zine ends up at.

let inflight: Promise<string | null> | null = null;

// Write the open zine to this browser now, not after the autosave delay. Called right before
// sign-in, which may leave the page (OAuth) before a pending autosave fires.
export async function flushLocalDraft(): Promise<void> {
  const zine = useEditorStore.getState().zine;
  if (zine) await saveZine(zine);
}

// Saves this browser's draft to the signed-in account and clears it locally. Resolves to the
// saved zine's id, or null when there's no draft (or it isn't the one asked for).
// Concurrent calls share one run, so a double-mounted effect can't claim twice.
export function claimLocalDraft(expectedId?: string): Promise<string | null> {
  inflight ??= (async () => {
    try {
      const draft = await loadZine();
      if (!draft || (expectedId && draft.id !== expectedId)) return null;
      await saveCloudZine(draft);
      await clearZine();
      return draft.id;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
