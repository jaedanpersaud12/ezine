import { SaveError } from "@/lib/editor/saveError";
import { zineSchema, type Zine } from "@/lib/zine/schema";

// On-device storage. Signed out, this holds the one working zine; signed in, documents live in the
// account (lib/editor/cloud.ts) and the blob store here doubles as a cache of their assets.

const DB_NAME = "zine-builder";
const DB_VERSION = 1;
const DOCS = "docs";
const BLOBS = "blobs";
const CURRENT = "current";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DOCS);
      req.result.createObjectStore(BLOBS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
  });
  return dbPromise;
}

// Settles when the transaction does, not when its request does: a write only counts once it's
// committed, and running out of space shows up as the commit aborting after the request succeeded.
async function run<T>(store: string, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = op(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result);
    tx.onabort = () => reject(tx.error ?? req.error ?? new Error("IndexedDB transaction aborted"));
    tx.onerror = () => reject(tx.error ?? req.error ?? new Error("IndexedDB request failed"));
  });
}

export async function loadZine(): Promise<Zine | null> {
  try {
    const raw: unknown = await run(DOCS, "readonly", (s) => s.get(CURRENT));
    if (raw === undefined) return null;
    const parsed = zineSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("Saved zine failed validation; starting fresh", parsed.error);
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.error("Could not load the saved zine", error);
    return null;
  }
}

export async function saveZine(zine: Zine): Promise<void> {
  try {
    await run(DOCS, "readwrite", (s) => s.put(zine, CURRENT));
  } catch (error) {
    throw new SaveError("storage", error instanceof Error ? error.message : String(error));
  }
}

export async function putBlob(id: string, blob: Blob): Promise<void> {
  await run(BLOBS, "readwrite", (s) => s.put(blob, id));
}

export async function getBlob(id: string): Promise<Blob | null> {
  const value: unknown = await run(BLOBS, "readonly", (s) => s.get(id));
  return value instanceof Blob ? value : null;
}

// Account zines keep a copy here until the server has it, so edits survive a failed save followed
// by leaving the page: a session ending mid-edit redirects to sign-in, a tab closed offline.
function pendingKey(id: string): string {
  return `pending:${id}`;
}

export async function savePending(zine: Zine): Promise<void> {
  try {
    await run(DOCS, "readwrite", (s) => s.put(zine, pendingKey(zine.id)));
  } catch (error) {
    throw new SaveError("storage", error instanceof Error ? error.message : String(error));
  }
}

// Opening a zine waits on this, so a stuck IndexedDB (it happens) can't hold the editor up.
const PENDING_READ_MS = 2000;

// The unsaved copy of this zine, if one is newer than what the server sent.
export async function loadPending(id: string, serverUpdatedAt: string): Promise<Zine | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.error("Reading the unsaved copy timed out", id);
      resolve(null);
    }, PENDING_READ_MS);
  });
  const read = (async (): Promise<Zine | null> => {
    const parsed = zineSchema.safeParse(await run(DOCS, "readonly", (s) => s.get(pendingKey(id))));
    return parsed.success && parsed.data.updatedAt > serverUpdatedAt ? parsed.data : null;
  })().catch((error: unknown) => {
    console.error("Could not read the unsaved copy", id, error);
    return null;
  });
  try {
    return await Promise.race([read, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Once the server has this version. A newer copy (edits made while the save was in flight) stays.
// One transaction for the check and the delete, so a newer copy written in between can't be lost.
export async function clearPending(zine: Zine): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DOCS, "readwrite");
    const store = tx.objectStore(DOCS);
    const key = pendingKey(zine.id);
    const req = store.get(key);
    req.onsuccess = () => {
      const stored = zineSchema.safeParse(req.result);
      if (!(stored.success && stored.data.updatedAt > zine.updatedAt)) store.delete(key);
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

// After the draft moves to an account. Asset blobs stay as a cache.
export async function clearZine(): Promise<void> {
  await run(DOCS, "readwrite", (s) => s.delete(CURRENT));
}
