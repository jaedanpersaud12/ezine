import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";

// Neon over HTTP: one round trip per query, no pool to manage in serverless functions.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Local development (docker-compose.yml): the same driver, pointed at Neon's HTTP proxy in front
// of a plain Postgres.
const LOCAL_HOST = "db.localtest.me";
const LOCAL_PROXY_PORT = 4445;
if (new URL(url).hostname === LOCAL_HOST) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:${LOCAL_PROXY_PORT}/sql`;
}

export const sql = neon(url);
