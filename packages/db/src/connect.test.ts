import { describe, expect, it } from "vitest";
import { connect } from "./connect";

describe("connect", () => {
  it("turns off prepared statements for transaction poolers", () => {
    const pooled = connect("postgres://u:p@ep-cool-123-pooler.eu-central-1.aws.neon.tech/app?sslmode=require");
    const direct = connect("postgres://u:p@ep-cool-123.eu-central-1.aws.neon.tech/app?sslmode=require");
    expect(pooled.options.prepare).toBe(false);
    expect(direct.options.prepare).toBe(true);
  });

  it("supports Unix-socket connection strings", () => {
    const sql = connect("postgres://nav@localhost/flowcraft?host=/var/run/postgresql");
    expect(sql.options.path).toBe("/var/run/postgresql/.s.PGSQL.5432");
    expect(sql.options.database).toBe("flowcraft");
  });
});
