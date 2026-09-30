import "server-only";
import { neon } from "@neondatabase/serverless";

// Neon over HTTP: one round trip per query, no pool to manage in serverless functions.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const sql = neon(url);
