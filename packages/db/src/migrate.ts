import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool } from "./connect";

// Migrations need a direct connection, not a transaction pooler. Neon provides
// it as DATABASE_URL_UNPOOLED; locally DATABASE_URL is already direct.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const pool = createPool(url, { max: 1 });
await migrate(drizzle({ client: pool }), { migrationsFolder: new URL("../migrations", import.meta.url).pathname });
await pool.end();
console.log(`Migrated ${new URL(url).pathname.slice(1)}`);
