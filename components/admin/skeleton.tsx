import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Stat, StatStrip } from "@/components/admin/StatStrip";
import { DataTable, TableCard, TableCardHeader, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table-card";
import { ADMIN_PAGE_SIZE } from "@/lib/admin";
import { cn } from "@/lib/utils";

// A waiting screen built from the real containers, so content lands where the placeholders were.

// Inherits the type size of the slot it sits in; never `bg-muted`, which is too close to the ground.
export function Bar({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block h-[1em] animate-pulse rounded bg-foreground/10 align-middle", className)} />;
}

export function Block({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-foreground/10", className)} />;
}

export function LoadingScreen({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({ title, back }: { title?: React.ReactNode; back?: { href: string; label: string } }) {
  return <AdminPageHeader title={title ?? <Bar className="w-48" />} summary={<Bar className="w-72" />} back={back} />;
}

export function StatStripSkeleton() {
  return (
    <StatStrip>
      {["Users", "Zines", "Storage", "New users"].map((label) => (
        <Stat key={label} label={label} value={<Bar className="w-12" />} hint={<Bar className="w-32" />} />
      ))}
    </StatStrip>
  );
}

const TAPER = ["w-4/5", "w-3/5", "w-2/3", "w-1/2", "w-3/4"];

export function TableSkeleton({ title, icon, columns, headers }: { title: string; icon: React.ReactNode; columns: string[]; headers: string[] }) {
  return (
    <TableCard>
      <TableCardHeader icon={icon} title={title} note={<Bar className="w-56" />} />
      <DataTable density="comfortable" columns={columns} minWidth={720}>
        <Thead>
          <tr>
            {headers.map((h, i) => (
              <Th key={`${h}-${i}`}>{h}</Th>
            ))}
          </tr>
        </Thead>
        <Tbody>
          {Array.from({ length: ADMIN_PAGE_SIZE }, (_, row) => (
            <Tr key={row} className="hover:bg-transparent">
              {headers.map((h, i) => (
                <Td key={`${h}-${i}`}>{h ? <Bar className={TAPER[(row + i) % TAPER.length]} /> : null}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </DataTable>
      <footer className="flex h-[52px] items-center border-t border-border px-4">
        <Bar className="w-28 text-xs" />
      </footer>
    </TableCard>
  );
}

