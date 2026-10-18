import postgres from "postgres";

/**
 * Creates a postgres.js client. Handles two connection-string details
 * postgres.js doesn't on its own:
 * - the libpq-style `?host=/var/run/postgresql` parameter for Unix sockets
 * - poolers in transaction mode (e.g. Neon's `-pooler` hosts), which don't
 *   support prepared statements, so those are turned off for them
 */
export function connect(url: string, options: postgres.Options<{}> = {}) {
  const parsed = new URL(url);
  const pooled = parsed.hostname.includes("-pooler");
  const merged: postgres.Options<{}> = pooled ? { prepare: false, ...options } : options;

  const socketDir = parsed.searchParams.get("host");
  if (socketDir?.startsWith("/")) {
    parsed.searchParams.delete("host");
    return postgres(parsed.toString(), { ...merged, host: socketDir });
  }
  return postgres(url, merged);
}
