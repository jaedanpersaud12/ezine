import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { EditorEntry } from "@/components/editor/EditorEntry";
import { ClaimDraft } from "@/components/start/ClaimDraft";
import { authEnabled } from "@/lib/auth";
import { getZine } from "@/lib/server/zines";

export default async function ZinePage({ params }: PageProps<"/zines/[id]">) {
  if (!authEnabled) notFound();
  const { userId } = await auth.protect();
  const { id } = await params;
  const zine = await getZine(userId, id);
  // Not in the account yet: probably the draft this browser is about to hand over after sign-in.
  if (!zine) return <ClaimDraft id={id} />;
  return <EditorEntry key={zine.id} source={{ kind: "cloud", zine }} />;
}

export async function generateMetadata({ params }: PageProps<"/zines/[id]">) {
  if (!authEnabled) return {};
  const { userId } = await auth();
  const { id } = await params;
  const zine = userId ? await getZine(userId, id) : null;
  return { title: zine?.title ?? "Zine" };
}
