import Link from "next/link";
import { ChevronRight, Search, UsersRound, X } from "lucide-react";
import { AdminPager } from "@/components/admin/AdminPager";
import { PadRows } from "@/components/admin/PadRows";
import { Button } from "@/components/ui/button";
import { DataTable, mono, StackedCell, TableCard, TableCardHeader, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ADMIN_PAGE_SIZE } from "@/lib/admin";
import { formatBytes, formatDate } from "@/lib/format";
import type { AdminUserRow } from "@/lib/server/admin";

type Props = {
  rows: AdminUserRow[];
  total: number;
  page: number;
  query: string;
};

// Widths are each column's longest realistic value: dates and counts never truncate, the user cell
// (email over name) is the one that's allowed to.
export const USER_COLUMNS = ["w-80", "w-32", "w-32", "w-32", "w-20", "w-28", "w-14"];
export const USER_HEADERS = ["User", "Joined", "Last active", "Last edited", "Zines", "Storage", ""];

function hrefFor(query: string) {
  return (page: number): string => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };
}

export function UsersTable({ rows, total, page, query }: Props) {
  return (
    <TableCard>
      <TableCardHeader icon={<UsersRound />} title="Users" note={query ? `Matching “${query}”` : "Newest first"}>
        <form action="/admin" role="search" className="flex w-full max-w-md items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            aria-label="Search users"
            placeholder="Search by email or name"
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button type="submit" variant="secondary" size="icon" aria-label="Search">
            <Search />
          </Button>
          {query ? (
            <Link href="/admin" aria-label="Clear search" className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4">
              <X />
            </Link>
          ) : null}
        </form>
      </TableCardHeader>

      <DataTable density="comfortable" columns={USER_COLUMNS} minWidth={760}>
          <Thead>
            <tr>
              {USER_HEADERS.map((h, i) => (
                <Th key={`${h}-${i}`} align={i === 4 || i === 5 ? "right" : "left"}>
                  {h || <span className="sr-only">Open</span>}
                </Th>
              ))}
            </tr>
          </Thead>
          <Tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={USER_COLUMNS.length} className="p-0">
                  <EmptyState
                    className="h-[calc(var(--row-h)*10)] justify-center"
          icon={<UsersRound />}
          title={query ? "No one matches that search" : "No users yet"}
          description={query ? "Try part of an email address or a name." : "Accounts show up here as people sign up."}
          action={
            query ? (
              <Link href="/admin" className="text-xs font-medium underline underline-offset-4">
                Clear search
              </Link>
            ) : undefined
          }
        />
                </td>
              </tr>
            ) : null}
            {rows.map((user) => (
              <Tr key={user.id}>
                <Td>
                  <Link href={`/admin/users/${user.id}`} className="block rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <StackedCell primary={user.email} secondary={user.name || "No name"} />
                  </Link>
                </Td>
                <Td className={mono}>{formatDate(user.joinedAt)}</Td>
                <Td className={mono}>{formatDate(user.lastActiveAt)}</Td>
                <Td className={mono}>{user.lastEditedAt ? formatDate(user.lastEditedAt) : "Never"}</Td>
                <Td align="right" className={mono}>
                  {user.zines}
                </Td>
                <Td align="right" className={mono}>
                  {formatBytes(user.storageBytes)}
                </Td>
                <Td align="right">
                  <Link href={`/admin/users/${user.id}`} aria-label={`Open ${user.email}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4">
                    <ChevronRight />
                  </Link>
                </Td>
              </Tr>
            ))}
            {rows.length ? <PadRows count={ADMIN_PAGE_SIZE - rows.length} columns={USER_COLUMNS.length} /> : null}
          </Tbody>
        </DataTable>
      <AdminPager page={page} total={total} noun="users" hrefFor={hrefFor(query)} />
    </TableCard>
  );
}
