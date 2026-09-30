import { authEnabled } from "@/lib/auth";
import type { Asset, Zine } from "@/lib/zine/schema";
import { getBlob, putBlob } from "@/lib/editor/persist";
import { networkError, SaveError } from "@/lib/editor/saveError";

// Account storage: documents go to Neon via /api/zines, asset bytes go straight to R2 through
// presigned URLs. IndexedDB stays in front as a cache so images don't re-download every load.
//
// Invariant: a document is only saved after every asset it references has finished uploading,
// so anything in a saved doc's `assets` is safe to fetch.

type ApiResult<T> = { success: boolean; data?: T; error?: string };

const uploads = new Map<string, Promise<void>>();

// Failures come out as SaveErrors, so the save status can say what went wrong.
async function api<T>(input: string, init?: RequestInit): Promise<T | undefined> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (error) {
    throw networkError(error);
  }
  if (res.status === 401) throw new SaveError("signed-out", "Signed out");
  // A proxy or crash page can answer with HTML, so the body may not parse.
  const body = (await res.json().catch(() => null)) as ApiResult<T> | null;
  if (!res.ok || !body?.success) throw new SaveError("server", body?.error ?? `Request failed (${res.status})`);
  return body.data;
}

// Assets in a document loaded from the server are already uploaded.
export function markUploaded(zine: Zine): void {
  for (const id of Object.keys(zine.assets)) uploads.set(id, Promise.resolve());
}

async function sendAsset(asset: Asset): Promise<void> {
  const blob = await getBlob(asset.id);
  if (!blob) throw new SaveError("upload", `Asset ${asset.name} is missing from this device`, [asset.id]);
  const data = await api<{ url: string }>("/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: asset.id, kind: asset.kind, mime: asset.mime, size: blob.size }),
  });
  if (!data) throw new SaveError("upload", "No upload URL", [asset.id]);
  let put: Response;
  try {
    put = await fetch(data.url, { method: "PUT", body: blob, headers: { "Content-Type": asset.mime } });
  } catch (error) {
    const failure = networkError(error);
    throw failure.failure.reason === "offline" ? failure : new SaveError("upload", failure.message, [asset.id]);
  }
  if (!put.ok) throw new SaveError("upload", `Upload failed (${put.status})`, [asset.id]);
}

function uploadAsset(asset: Asset): Promise<void> {
  let pending = uploads.get(asset.id);
  if (!pending) {
    pending = sendAsset(asset).catch((error: unknown) => {
      // Offline and signed out are about the session, not this file; anything else is the file's.
      if (error instanceof SaveError && error.failure.reason !== "server") throw error;
      throw new SaveError("upload", error instanceof Error ? error.message : String(error), [asset.id]);
    });
    // A failed upload is retried on the next save.
    pending.catch(() => uploads.delete(asset.id));
    uploads.set(asset.id, pending);
  }
  return pending;
}

// Every asset is attempted, so a failure can name all the files that didn't make it.
async function uploadAll(zine: Zine): Promise<void> {
  const results = await Promise.allSettled(Object.values(zine.assets).map(uploadAsset));
  const errors: unknown[] = results.flatMap((r) => (r.status === "rejected" ? [r.reason] : []));
  if (!errors.length) return;
  const session = errors.find((e) => e instanceof SaveError && e.failure.reason !== "upload");
  if (session) throw session;
  const assetIds = errors.flatMap((e) => (e instanceof SaveError ? e.failure.assetIds : []));
  throw new SaveError("upload", `${assetIds.length} upload(s) failed`, assetIds);
}

export async function saveCloudZine(zine: Zine): Promise<void> {
  await uploadAll(zine);
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
