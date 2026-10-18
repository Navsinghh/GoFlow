import { describe, expect, it } from "vitest";
import { parse } from "pg-connection-string";
import { poolConfig } from "./connect";

const neon = "postgresql://u:p@ep-cool-123-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

describe("poolConfig", () => {
  it("translates Neon's libpq settings for node-postgres", () => {
    const config = poolConfig(neon);
    expect(config.enableChannelBinding).toBe(true);
    const parsed = parse(config.connectionString!);
    expect(parsed).toMatchObject({ host: "ep-cool-123-pooler.c-2.us-east-1.aws.neon.tech", database: "neondb", sslmode: "verify-full" });
    expect(parsed).not.toHaveProperty("channel_binding");
  });

  it("keeps Unix-socket connection strings working", () => {
    const parsed = parse(poolConfig("postgres://nav@localhost/flowcraft?host=/var/run/postgresql").connectionString!);
    expect(parsed).toMatchObject({ host: "/var/run/postgresql", database: "flowcraft", user: "nav" });
  });
});
