import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { AdminPager } from "@/components/admin/AdminPager";
import { PadRows } from "@/components/admin/PadRows";
import { DataTable, mono, StackedCell, TableCard, TableCardHeader, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ADMIN_PAGE_SIZE } from "@/lib/admin";
import { formatBytes, formatDate } from "@/lib/format";
import type { AdminZineRow } from "@/lib/server/admin";

type Props = {
  userId: string;
  rows: AdminZineRow[];
  total: number;
  page: number;
};

export const ZINE_COLUMNS = ["w-80", "w-20", "w-28", "w-32", "w-14"];
export const ZINE_HEADERS = ["Zine", "Pages", "Size", "Last edited", ""];

export function ZinesTable({ userId, rows, total, page }: Props) {
  const hrefFor = (p: number): string => (p > 1 ? `/admin/users/${userId}?page=${p}` : `/admin/users/${userId}`);
  return (
    <TableCard>
      <TableCardHeader icon={<BookOpen />} title="Zines" note="Saved to this account, newest edit first" />
      <DataTable density="comfortable" columns={ZINE_COLUMNS} minWidth={560}>
          <Thead>
            <tr>
              {ZINE_HEADERS.map((h, i) => (
                <Th key={`${h}-${i}`} align={i === 1 || i === 2 ? "right" : "left"}>
                  {h || <span className="sr-only">Open</span>}
                </Th>
              ))}
            </tr>
          </Thead>
          <Tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={ZINE_COLUMNS.length} className="p-0">
                  <EmptyState
                    className="h-[calc(var(--row-h)*10)] justify-center"
          icon={<BookOpen />}
          title="No saved zines"
          description="This account hasn't saved a zine yet. A draft kept only in someone's browser doesn't show up here."
        />
                </td>
              </tr>
            ) : null}
            {rows.map((zine) => (
              <Tr key={zine.id}>
                <Td>
                  <Link href={`/admin/users/${userId}/zines/${zine.id}`} className="block rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <StackedCell primary={zine.title || "Untitled zine"} secondary={`${zine.widthMm} × ${zine.heightMm} mm`} />
                  </Link>
                </Td>
                <Td align="right" className={mono}>
                  {zine.pages}
                </Td>
                <Td align="right" className={mono}>
                  {formatBytes(zine.bytes)}
                </Td>
                <Td className={mono}>{formatDate(zine.updatedAt)}</Td>
                <Td align="right">
                  <Link
                    href={`/admin/users/${userId}/zines/${zine.id}`}
                    aria-label={`View ${zine.title || "Untitled zine"}`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4"
                  >
                    <ChevronRight />
                  </Link>
                </Td>
              </Tr>
            ))}
            {rows.length ? <PadRows count={ADMIN_PAGE_SIZE - rows.length} columns={ZINE_COLUMNS.length} /> : null}
          </Tbody>
        </DataTable>
      <AdminPager page={page} total={total} noun="zines" hrefFor={hrefFor} />
    </TableCard>
  );
}
