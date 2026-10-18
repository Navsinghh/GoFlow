import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/collab";
import { mailer } from "@/lib/email";
import { env } from "@/lib/env";
import { createCaller } from "./router";

/** tRPC caller for server components, bound to the current request's session. */
export const api = cache(async () => {
  const session = await getSession();
  return createCaller({ db, user: session?.user ?? null, mailer, appUrl: env.BETTER_AUTH_URL, publish: publishEvent });
});
