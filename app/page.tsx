import { auth } from "@clerk/nextjs/server";
import { EditorEntry } from "@/components/editor/EditorEntry";
import { Landing } from "@/components/landing/Landing";
import { Library } from "@/components/library/Library";
import { authEnabled } from "@/lib/auth";
import { listZines } from "@/lib/server/zines";

// Signed out, "/" is the front door; signed in, it's the account's zines.
// Without Clerk configured there are no accounts, so it's just the editor.
export default async function Home() {
  if (!authEnabled) return <EditorEntry source={{ kind: "local" }} />;
  const { userId } = await auth();
  if (!userId) return <Landing />;
  return <Library zines={await listZines(userId)} />;
}
