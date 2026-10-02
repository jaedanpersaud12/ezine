import { BookOpen } from "lucide-react";
import { LoadingScreen, PageHeaderSkeleton, TableSkeleton } from "@/components/admin/skeleton";
import { ZINE_COLUMNS, ZINE_HEADERS } from "@/components/admin/ZinesTable";

export default function Loading() {
  return (
    <LoadingScreen>
      <PageHeaderSkeleton back={{ href: "/admin", label: "All users" }} />
      <TableSkeleton title="Zines" icon={<BookOpen />} columns={ZINE_COLUMNS} headers={ZINE_HEADERS} />
    </LoadingScreen>
  );
}
