// Why a save didn't go through, in terms the save status can explain and act on.
//   offline     the network is down; saves resume when it's back
//   signed-out  the session ended (401); signing in again lets the save through
//   upload      an image or font didn't reach storage; `assetIds` says which
//   missing     an image or font isn't on this device and never reached storage, so retrying
//               can't help; removing or replacing it can
//   server      the API failed or answered with something unexpected
//   storage     this browser refused the write (usually out of space)
export type SaveFailureReason = "offline" | "signed-out" | "upload" | "missing" | "server" | "storage";

export type SaveFailure = { reason: SaveFailureReason; assetIds: string[] };

export class SaveError extends Error {
  readonly failure: SaveFailure;

  constructor(reason: SaveFailureReason, message: string, assetIds: string[] = []) {
    super(message);
    this.name = "SaveError";
    this.failure = { reason, assetIds };
  }
}

// Anything thrown by a save, as a failure the UI can show. Unknown errors count as the server's.
export function toSaveFailure(error: unknown): SaveFailure {
  if (error instanceof SaveError) return error.failure;
  return { reason: "server", assetIds: [] };
}

// fetch() only throws for network failures; tell "you're offline" apart from "it's unreachable".
export function networkError(error: unknown): SaveError {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const message = error instanceof Error ? error.message : String(error);
  return offline ? new SaveError("offline", message) : new SaveError("server", message);
}
