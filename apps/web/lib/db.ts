import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { createDb, type Db } from "@flowcraft/db";
import { env } from "./env";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: Db };
export const db = globalForDb.db ?? createDb(env.DATABASE_URL);
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

// On Vercel, release idle connections before a function instance is suspended,
// so paused instances don't hold database connections open.
if (process.env.VERCEL) attachDatabasePool(db.$client);
