import "server-only";
import { createDb, type Db } from "@flowcraft/db";
import { env } from "./env";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: Db };
export const db = globalForDb.db ?? createDb(env.DATABASE_URL);
if (process.env.NODE_ENV !== "production") globalForDb.db = db;
