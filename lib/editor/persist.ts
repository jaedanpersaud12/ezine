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

async function run<T>(store: string, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
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
  await run(DOCS, "readwrite", (s) => s.put(zine, CURRENT));
}

export async function putBlob(id: string, blob: Blob): Promise<void> {
  await run(BLOBS, "readwrite", (s) => s.put(blob, id));
}

export async function getBlob(id: string): Promise<Blob | null> {
  const value: unknown = await run(BLOBS, "readonly", (s) => s.get(id));
  return value instanceof Blob ? value : null;
}

// After the draft moves to an account. Asset blobs stay as a cache.
export async function clearZine(): Promise<void> {
  await run(DOCS, "readwrite", (s) => s.delete(CURRENT));
}
