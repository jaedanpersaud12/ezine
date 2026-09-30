import { neon, neonConfig } from "@neondatabase/serverless";

// Direct access to the local database (docker-compose.yml) for the signed-in tests: checking what
// a save wrote, and cleaning up after. Refuses anything but the local database, so a test run can
// never touch production.

const LOCAL_HOST = "db.localtest.me";

export function localDbUrl(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return new URL(url).hostname === LOCAL_HOST ? url : null;
}

function db(): ReturnType<typeof neon> {
  const url = localDbUrl();
  if (!url) throw new Error("Signed-in tests only run against the local database (see AGENTS.md)");
  neonConfig.fetchEndpoint = (host) => `http://${host}:4445/sql`;
  return neon(url);
}

export async function savedTitle(zineId: string): Promise<string | null> {
  const rows = (await db()`select title from zines where id = ${zineId}`) as { title: string }[];
  return rows[0]?.title ?? null;
}

export async function deleteZine(zineId: string): Promise<void> {
  const sql = db();
  const rows = (await sql`delete from zines where id = ${zineId} returning user_id, doc`) as {
    user_id: string;
    doc: { assets?: Record<string, unknown> };
  }[];
  const assetIds = Object.keys(rows[0]?.doc.assets ?? {});
  if (assetIds.length) await sql`delete from assets where id = any(${assetIds}::uuid[])`;
}
