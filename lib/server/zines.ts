import "server-only";
import { newZine } from "@/lib/zine/create";
import { zineSchema, type Zine } from "@/lib/zine/schema";
import { sql } from "@/lib/server/db";
import { deleteObject } from "@/lib/server/r2";

// Zine documents in Neon, scoped to their Clerk owner. Every query filters on user_id,
// so a zine id alone never reads or writes someone else's work.

export type ZineSummary = { id: string; title: string; updatedAt: string; pages: number; widthMm: number; heightMm: number };

export async function listZines(userId: string): Promise<ZineSummary[]> {
  const rows = await sql`
    select id, title, updated_at,
      jsonb_array_length(doc->'spreads') as spreads,
      (doc->'trim'->>'widthMm')::float as width_mm,
      (doc->'trim'->>'heightMm')::float as height_mm
    from zines where user_id = ${userId}
    order by updated_at desc`;
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
    pages: (Number(r.spreads) - 1) * 2,
    widthMm: Number(r.width_mm),
    heightMm: Number(r.height_mm),
  }));
}

export async function getZine(userId: string, id: string): Promise<Zine | null> {
  const rows = await sql`select doc from zines where id = ${id} and user_id = ${userId}`;
  if (!rows.length) return null;
  const parsed = zineSchema.safeParse(rows[0].doc);
  if (!parsed.success) {
    console.error("[zines] stored doc failed validation", id, parsed.error);
    return null;
  }
  return parsed.data;
}

export async function createZine(userId: string): Promise<string> {
  const zine = newZine();
  await sql`insert into zines (id, user_id, title, doc) values (${zine.id}, ${userId}, ${zine.title}, ${JSON.stringify(zine)})`;
  return zine.id;
}

// Insert or overwrite. Returns false when the id belongs to another user.
export async function saveZine(userId: string, zine: Zine): Promise<boolean> {
  const rows = await sql`
    insert into zines (id, user_id, title, doc, updated_at)
    values (${zine.id}, ${userId}, ${zine.title}, ${JSON.stringify(zine)}, now())
    on conflict (id) do update
      set title = excluded.title, doc = excluded.doc, updated_at = now()
      where zines.user_id = excluded.user_id
    returning id`;
  return rows.length > 0;
}

// Removes the zine, then any of its assets no other zine of this user still uses.
export async function deleteZine(userId: string, id: string): Promise<boolean> {
  const deleted = await sql`delete from zines where id = ${id} and user_id = ${userId} returning doc`;
  if (!deleted.length) return false;
  const doc = zineSchema.safeParse(deleted[0].doc);
  const assetIds = doc.success ? Object.keys(doc.data.assets) : [];
  if (!assetIds.length) return true;

  const orphans = await sql`
    select a.id, a.r2_key from assets a
    where a.user_id = ${userId} and a.id = any(${assetIds}::uuid[])
      and not exists (select 1 from zines z where z.user_id = ${userId} and z.doc->'assets' ? a.id::text)`;
  for (const orphan of orphans) {
    try {
      await deleteObject(String(orphan.r2_key));
      await sql`delete from assets where id = ${orphan.id}`;
    } catch (error) {
      // Leave the row so a later cleanup can retry; the zine itself is already gone.
      console.error("[zines] asset cleanup failed", orphan.id, error);
    }
  }
  return true;
}
