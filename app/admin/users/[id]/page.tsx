import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ZinesTable } from "@/components/admin/ZinesTable";
import { formatDate } from "@/lib/format";
import { getAdminUser, listUserZines, requireAdmin } from "@/lib/server/admin";

export const metadata = { title: "User" };

export default async function AdminUserPage({ params, searchParams }: PageProps<"/admin/users/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const raw = (await searchParams).page;
  const page = Math.max(1, Math.floor(Number(Array.isArray(raw) ? raw[0] : raw)) || 1);

  const user = await getAdminUser(id);
  if (!user) notFound();
  const zines = await listUserZines(id, page);

  const summary = [user.name, `Joined ${formatDate(user.joinedAt)}`, `Last active ${formatDate(user.lastActiveAt)}`].filter(Boolean).join(" · ");
  return (
    <>
      <AdminPageHeader title={user.email} summary={summary} back={{ href: "/admin", label: "All users" }} />
      <ZinesTable userId={id} rows={zines.rows} total={zines.total} page={page} />
    </>
  );
}
