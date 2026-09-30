import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { EditorEntry } from "@/components/editor/EditorEntry";
import { authEnabled } from "@/lib/auth";
import { getZine } from "@/lib/server/zines";

export default async function ZinePage({ params }: PageProps<"/zines/[id]">) {
  if (!authEnabled) notFound();
  const { userId } = await auth.protect();
  const { id } = await params;
  const zine = await getZine(userId, id);
  if (!zine) notFound();
  return <EditorEntry source={{ kind: "cloud", zine }} />;
}
