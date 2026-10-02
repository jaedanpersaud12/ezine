import { Users, type LucideIcon } from "lucide-react";

// The admin sidebar, as data. `match` says which paths light the entry up.
export type AdminNavItem = { key: string; label: string; href: string; icon: LucideIcon; match: (pathname: string) => boolean };

export const ADMIN_NAV: { label: string; items: AdminNavItem[] }[] = [
  {
    label: "Accounts",
    items: [
      {
        key: "users",
        label: "Users",
        href: "/admin",
        icon: Users,
        // The root matches exactly; user and zine pages belong to it by prefix.
        match: (pathname) => pathname === "/admin" || pathname.startsWith("/admin/users"),
      },
    ],
  },
];
