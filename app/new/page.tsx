import { auth } from "@clerk/nextjs/server";
import { EditorEntry } from "@/components/editor/EditorEntry";
import { StartZine } from "@/components/start/StartZine";
import { authEnabled } from "@/lib/auth";

export const metadata = { title: "New zine" };

// Signed out: the editor, saving to this browser. Signed in: a new zine in the account.
export default async function NewZinePage() {
  const { userId } = authEnabled ? await auth() : { userId: null };
  if (!userId) return <EditorEntry source={{ kind: "local" }} />;
  return <StartZine />;
}
