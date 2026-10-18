import pg from "pg";

/**
 * Turns a libpq-style connection string (as Neon and local Postgres hand out)
 * into node-postgres settings:
 * - `sslmode=require` is made explicit as `verify-full`, which is what pg
 *   already does for it (it warns when it has to assume)
 * - `channel_binding=require` maps to pg's SCRAM-SHA-256-PLUS support
 * Unix-socket strings (`?host=/var/run/postgresql`) work as they are.
 */
export function poolConfig(url: string): pg.PoolConfig {
  const parsed = new URL(url);
  if (parsed.searchParams.get("sslmode") === "require") parsed.searchParams.set("sslmode", "verify-full");
  const channelBinding = parsed.searchParams.get("channel_binding");
  parsed.searchParams.delete("channel_binding");
  return { connectionString: parsed.toString(), enableChannelBinding: channelBinding === "require" };
}

export function createPool(url: string, config: pg.PoolConfig = {}) {
  return new pg.Pool({ ...poolConfig(url), ...config });
}
