import postgres from "postgres";

/**
 * Creates a postgres.js client. Also accepts the libpq-style
 * `?host=/var/run/postgresql` parameter for Unix-socket connections, which
 * postgres.js doesn't understand on its own.
 */
export function connect(url: string, options: postgres.Options<{}> = {}) {
  const parsed = new URL(url);
  const socketDir = parsed.searchParams.get("host");
  if (socketDir?.startsWith("/")) {
    parsed.searchParams.delete("host");
    return postgres(parsed.toString(), { ...options, host: socketDir });
  }
  return postgres(url, options);
}
