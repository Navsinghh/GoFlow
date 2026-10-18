import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://nav@localhost/flowcraft_test?host=/var/run/postgresql" },
    // Integration tests share one database.
    fileParallelism: false,
  },
});
