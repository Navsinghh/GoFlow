import { createDb } from "@flowcraft/db";
import { createCollabServer } from "./server";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const server = createCollabServer({
  // A long-running server holding row locks should use a direct connection, not
  // a transaction pooler. Neon provides it as DATABASE_URL_UNPOOLED.
  db: createDb(process.env.DATABASE_URL_UNPOOLED ?? required("DATABASE_URL")),
  secret: required("COLLAB_SECRET"),
  port: Number(process.env.PORT ?? 1234),
});

await server.listen();

// Flush pending saves before exiting so no edits are lost on deploys.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void server.destroy().then(() => process.exit(0)));
}
