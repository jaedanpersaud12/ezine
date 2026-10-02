import { PageHeaderSkeleton, LoadingScreen, StatStripSkeleton, TableSkeleton } from "@/components/admin/skeleton";
import { USER_COLUMNS, USER_HEADERS } from "@/components/admin/UsersTable";
import { UsersRound } from "lucide-react";

export default function Loading() {
  return (
    <LoadingScreen>
      <PageHeaderSkeleton title="Users" />
      <StatStripSkeleton />
      <TableSkeleton title="Users" icon={<UsersRound />} columns={USER_COLUMNS} headers={USER_HEADERS} />
    </LoadingScreen>
  );
}
