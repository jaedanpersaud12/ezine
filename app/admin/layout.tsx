import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/server/admin";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

// The first gate. A layout isn't re-run on client navigation, so every page and route under here
// checks again on its own.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
