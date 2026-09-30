import { authEnabled } from "@/lib/auth";
import type { Asset, Zine } from "@/lib/zine/schema";
import { getBlob, putBlob } from "@/lib/editor/persist";

// Account storage: documents go to Neon via /api/zines, asset bytes go straight to R2 through
// presigned URLs. IndexedDB stays in front as a cache so images don't re-download every load.
//
// Invariant: a document is only saved after every asset it references has finished uploading,
// so anything in a saved doc's `assets` is safe to fetch.

type ApiResult<T> = { success: boolean; data?: T; error?: string };

const uploads = new Map<string, Promise<void>>();

async function api<T>(input: string, init?: RequestInit): Promise<T | undefined> {
  const res = await fetch(input, init);
  const body = (await res.json()) as ApiResult<T>;
  if (!res.ok || !body.success) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body.data;
}

// Assets in a document loaded from the server are already uploaded.
export function markUploaded(zine: Zine): void {
  for (const id of Object.keys(zine.assets)) uploads.set(id, Promise.resolve());
}

function uploadAsset(asset: Asset): Promise<void> {
  let pending = uploads.get(asset.id);
  if (!pending) {
    pending = (async () => {
      const blob = await getBlob(asset.id);
      if (!blob) throw new Error(`Asset ${asset.name} is missing from this device`);
      const data = await api<{ url: string }>("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id, kind: asset.kind, mime: asset.mime, size: blob.size }),
      });
      if (!data) throw new Error("No upload URL");
      const put = await fetch(data.url, { method: "PUT", body: blob, headers: { "Content-Type": asset.mime } });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
    })();
    // A failed upload is retried on the next save.
    pending.catch(() => uploads.delete(asset.id));
    uploads.set(asset.id, pending);
  }
  return pending;
}

export async function saveCloudZine(zine: Zine): Promise<void> {
  await Promise.all(Object.values(zine.assets).map(uploadAsset));
  await api("/api/zines/" + zine.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(zine),
  });
}

// Bytes for an asset this device hasn't seen: fetch from R2 and keep a local copy.
export async function fetchCloudBlob(id: string): Promise<Blob | null> {
  if (!authEnabled) return null;
  try {
    const res = await fetch(`/api/assets/${id}`);
    if (!res.ok) return null;
    const body = (await res.json()) as ApiResult<{ url: string }>;
    if (!body.data) return null;
    const file = await fetch(body.data.url);
    if (!file.ok) return null;
    const blob = await file.blob();
    await putBlob(id, blob).catch((error: unknown) => console.error("Could not cache asset", id, error));
    return blob;
  } catch (error) {
    console.error("Could not fetch asset", id, error);
    return null;
  }
}
