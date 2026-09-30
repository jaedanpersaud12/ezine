import "server-only";
import { z } from "zod";
import { sql } from "@/lib/server/db";
import { presignGet, presignPut } from "@/lib/server/r2";

export const MAX_ASSET_BYTES = 40 * 1024 * 1024;

export const assetUploadSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["image", "font"]),
  mime: z.string().max(100),
  size: z.number().int().positive().max(MAX_ASSET_BYTES),
});

export type AssetUpload = z.infer<typeof assetUploadSchema>;

function keyFor(userId: string, assetId: string): string {
  return `users/${userId}/assets/${assetId}`;
}

// Registers the asset to this user and hands back a URL the browser can PUT the bytes to.
// Null when the id is already taken by someone else.
export async function startUpload(userId: string, upload: AssetUpload): Promise<string | null> {
  const key = keyFor(userId, upload.id);
  const rows = await sql`
    insert into assets (id, user_id, kind, mime, size_bytes, r2_key)
    values (${upload.id}, ${userId}, ${upload.kind}, ${upload.mime}, ${upload.size}, ${key})
    on conflict (id) do update set mime = excluded.mime, size_bytes = excluded.size_bytes
      where assets.user_id = excluded.user_id
    returning r2_key`;
  if (!rows.length) return null;
  return presignPut(key);
}

export async function downloadUrl(userId: string, assetId: string): Promise<string | null> {
  const rows = await sql`select r2_key from assets where id = ${assetId} and user_id = ${userId}`;
  if (!rows.length) return null;
  return presignGet(String(rows[0].r2_key));
}
