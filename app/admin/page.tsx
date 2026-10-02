import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Stat, StatStrip } from "@/components/admin/StatStrip";
import { UsersTable } from "@/components/admin/UsersTable";
import { formatBytes } from "@/lib/format";
import { adminTotals, listAdminUsers, requireAdmin } from "@/lib/server/admin";

export const metadata = { title: "Users" };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Math.floor(Number(first(params.page))) || 1);
  const query = first(params.q).trim().slice(0, 100);
  const [totals, list] = await Promise.all([adminTotals(), listAdminUsers({ page, query })]);

  return (
    <>
      <AdminPageHeader title="Users" summary="Everyone who has signed up, and what they've made" />
      <StatStrip>
        <Stat label="Users" value={totals.users} hint={`${totals.usersWithZines} have saved a zine`} />
        <Stat label="Zines" value={totals.zines} hint={totals.usersWithZines ? `across ${totals.usersWithZines} accounts` : "none saved yet"} />
        <Stat label="Storage" value={formatBytes(totals.storageBytes)} hint={`${totals.assets} images and fonts`} />
        <Stat label="New users" value={totals.newUsers} hint={`joined in the last 7 days, of ${totals.users}`} />
      </StatStrip>
      <UsersTable rows={list.rows} total={list.total} page={page} query={query} />
    </>
  );
}
