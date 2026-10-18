import { drizzle } from "drizzle-orm/postgres-js";
import { connect } from "./connect";
import * as schema from "./schema";

export * from "./schema";
export * from "./flow-doc";
export * from "./events";
export { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
export { schema, connect };

export function createDb(url: string) {
  return drizzle(connect(url, { max: 10 }), { schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;
