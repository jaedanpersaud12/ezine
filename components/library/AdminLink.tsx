"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

// Only a courtesy: public metadata is readable in the browser, and the admin pages check the role
// again on the server, so hiding this proves nothing and showing it grants nothing.
export function AdminLink() {
  const { user } = useUser();
  if (user?.publicMetadata.role !== "admin") return null;
  return (
    <Link href="/admin" className="rounded-md px-2 py-1 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring">
      Admin
    </Link>
  );
}
