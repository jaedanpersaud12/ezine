import "server-only";
import { AwsClient } from "aws4fetch";

// R2 through its S3 API. The browser moves the bytes itself with short-lived presigned URLs,
// so uploads never pass through (or hit the body limit of) our functions.

const PRESIGN_SECONDS = 60 * 10;

function config(): { client: AwsClient; base: string } {
  const { R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 is not configured (R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
  }
  return {
    client: new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" }),
    base: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`,
  };
}

async function presign(key: string, method: "GET" | "PUT"): Promise<string> {
  const { client, base } = config();
  const url = new URL(`${base}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(PRESIGN_SECONDS));
  const signed = await client.sign(url.toString(), { method, aws: { signQuery: true } });
  return signed.url;
}

export function presignPut(key: string): Promise<string> {
  return presign(key, "PUT");
}

export function presignGet(key: string): Promise<string> {
  return presign(key, "GET");
}

export async function deleteObject(key: string): Promise<void> {
  const { client, base } = config();
  const res = await client.fetch(`${base}/${key}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed (${res.status})`);
}
