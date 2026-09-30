import { auth } from "@clerk/nextjs/server";
import { EditorEntry } from "@/components/editor/EditorEntry";
import { Library } from "@/components/library/Library";
import { authEnabled } from "@/lib/auth";
import { listZines } from "@/lib/server/zines";

// Signed out, "/" is the on-device editor. Signed in, it's the list of zines in the account.
export default async function Home() {
  const { userId } = authEnabled ? await auth() : { userId: null };
  if (!userId) return <EditorEntry source={{ kind: "local" }} />;
  return <Library zines={await listZines(userId)} />;
}
