import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ADMIN_PAGE_SIZE } from "@/lib/admin";
import { sql } from "@/lib/server/db";

// The owner's view of the accounts. Who counts as the owner is Clerk's `publicMetadata.role`,
// read from Clerk on every request (no session-token claim to configure per instance, and taking
// the role away works on the next request). Nothing here writes.

const DAY_MS = 24 * 60 * 60 * 1000;

const roleOf = cache(async (userId: string): Promise<string | undefined> => {
  const user = await (await clerkClient()).users.getUser(userId);
  const role = user.publicMetadata.role;
  return typeof role === "string" ? role : undefined;
});

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    return (await roleOf(userId)) === "admin";
  } catch (error) {
    console.error("[admin] could not read the role", error);
    return false;
  }
}

// For admin pages: signed out goes to sign-in, anyone else who isn't an admin gets the 404 page, so
// the area doesn't announce itself.
export async function requireAdmin(): Promise<string> {
  const { userId } = await auth.protect();
  if (!(await isAdmin(userId))) notFound();
  return userId;
}

// For admin routes: the caller, or the 404 to return.
export async function adminRoute(): Promise<{ userId: string } | NextResponse> {
  const { userId } = await auth();
  if (!userId || !(await isAdmin(userId))) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return { userId };
}

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  joinedAt: number;
  lastActiveAt: number | null;
};

export type AdminUserRow = AdminUser & { zines: number; storageBytes: number; lastEditedAt: string | null };

type ClerkUser = Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>>;

function toAdminUser(user: ClerkUser): AdminUser {
  const email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "(no email)";
  return {
    id: user.id,
    email,
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    joinedAt: user.createdAt,
    lastActiveAt: user.lastActiveAt ?? user.lastSignInAt,
  };
}

// One page of users, newest first, with what each has made.
export async function listAdminUsers({ page, query }: { page: number; query: string }): Promise<{ rows: AdminUserRow[]; total: number }> {
  const clerk = await clerkClient();
  const { data, totalCount } = await clerk.users.getUserList({
    limit: ADMIN_PAGE_SIZE,
    offset: (page - 1) * ADMIN_PAGE_SIZE,
    query: query || undefined,
    orderBy: "-created_at",
  });
  const ids = data.map((u) => u.id);
  const stats = ids.length
    ? await sql`
        select u as user_id,
          (select count(*)::int from zines z where z.user_id = u) as zines,
          (select max(z.updated_at) from zines z where z.user_id = u) as last_edited,
          (select coalesce(sum(a.size_bytes), 0)::float8 from assets a where a.user_id = u) as storage
        from unnest(${ids}::text[]) as u`
    : [];
  const byId = new Map(stats.map((s) => [String(s.user_id), s]));
  const rows = data.map((user) => {
    const s = byId.get(user.id);
    return {
      ...toAdminUser(user),
      zines: Number(s?.zines ?? 0),
      storageBytes: Number(s?.storage ?? 0),
      lastEditedAt: s?.last_edited ? new Date(String(s.last_edited)).toISOString() : null,
    };
  });
  return { rows, total: totalCount };
}

export type AdminTotals = { users: number; newUsers: number; zines: number; usersWithZines: number; assets: number; storageBytes: number };

export async function adminTotals(): Promise<AdminTotals> {
  const clerk = await clerkClient();
  const [all, recent, db] = await Promise.all([
    clerk.users.getCount(),
    clerk.users.getUserList({ limit: 1, createdAtAfter: Date.now() - 7 * DAY_MS }),
    sql`
      select
        (select count(*)::int from zines) as zines,
        (select count(distinct user_id)::int from zines) as users_with_zines,
        (select count(*)::int from assets) as assets,
        (select coalesce(sum(size_bytes), 0)::float8 from assets) as storage`,
  ]);
  return {
    users: all,
    newUsers: recent.totalCount,
    zines: Number(db[0].zines),
    usersWithZines: Number(db[0].users_with_zines),
    assets: Number(db[0].assets),
    storageBytes: Number(db[0].storage),
  };
}

// Null when there's no such user.
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  try {
    return toAdminUser(await (await clerkClient()).users.getUser(userId));
  } catch (error) {
    console.error("[admin] user lookup failed", userId, error);
    return null;
  }
}

export type AdminZineRow = {
  id: string;
  title: string;
  updatedAt: string;
  pages: number;
  widthMm: number;
  heightMm: number;
  bytes: number;
};

export async function listUserZines(userId: string, page: number): Promise<{ rows: AdminZineRow[]; total: number }> {
  const rows = await sql`
    select id, title, updated_at,
      jsonb_array_length(doc->'spreads') as spreads,
      (doc->'trim'->>'widthMm')::float as width_mm,
      (doc->'trim'->>'heightMm')::float as height_mm,
      octet_length(doc::text) as bytes,
      count(*) over () as total
    from zines where user_id = ${userId}
    order by updated_at desc
    limit ${ADMIN_PAGE_SIZE} offset ${(page - 1) * ADMIN_PAGE_SIZE}`;
  return {
    rows: rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      updatedAt: new Date(String(r.updated_at)).toISOString(),
      pages: (Number(r.spreads) - 1) * 2,
      widthMm: Number(r.width_mm),
      heightMm: Number(r.height_mm),
      bytes: Number(r.bytes),
    })),
    total: rows.length ? Number(rows[0].total) : 0,
  };
}

// The stored image or font behind an asset, whoever owns it. Null when the row doesn't exist.
export async function assetKey(assetId: string): Promise<string | null> {
  const rows = await sql`select r2_key from assets where id = ${assetId}`;
  return rows.length ? String(rows[0].r2_key) : null;
}
