import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { connect } from "./connect";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const client = connect(url, { max: 1, onnotice: () => {} });
await migrate(drizzle(client), { migrationsFolder: new URL("../migrations", import.meta.url).pathname });
await client.end();
console.log(`Migrated ${new URL(url).pathname.slice(1)}`);
