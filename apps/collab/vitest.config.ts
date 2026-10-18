import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Its own database: turbo runs this suite in parallel with the web app's, and both truncate tables.
    env: {
      DATABASE_URL:
        process.env.COLLAB_TEST_DATABASE_URL ?? "postgres://nav@localhost/flowcraft_collab_test?host=/var/run/postgresql",
    },
    testTimeout: 10_000,
  },
});
