import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ZineViewer } from "@/components/admin/ZineViewer";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/format";
import { getAdminUser, requireAdmin } from "@/lib/server/admin";
import { getZine } from "@/lib/server/zines";
import { pageCount } from "@/lib/zine/schema";

export const metadata = { title: "Zine" };

// Read-only: the zine is read for its owner and drawn by the viewer; nothing on this page writes.
export default async function AdminZinePage({ params }: PageProps<"/admin/users/[id]/zines/[zineId]">) {
  await requireAdmin();
  const { id, zineId } = await params;
  const [owner, zine] = await Promise.all([getAdminUser(id), getZine(id, zineId)]);
  if (!owner || !zine) notFound();

  return (
    <>
      <AdminPageHeader
        title={zine.title || "Untitled zine"}
        summary={`${pageCount(zine)} pages · ${zine.trim.widthMm} × ${zine.trim.heightMm} mm · edited ${formatDate(zine.updatedAt)}`}
        back={{ href: `/admin/users/${id}`, label: owner.email }}
      >
        <StatusPill tone="info" dot={false}>
          Read-only
        </StatusPill>
      </AdminPageHeader>
      <ZineViewer zine={zine} />
    </>
  );
}
