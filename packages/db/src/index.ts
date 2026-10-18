import { drizzle } from "drizzle-orm/node-postgres";
import { createPool } from "./connect";
import * as schema from "./schema";

export * from "./schema";
export * from "./flow-doc";
export * from "./events";
export { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
export { schema, createPool };

export function createDb(url: string) {
  return drizzle({ client: createPool(url, { max: 10 }), schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;
