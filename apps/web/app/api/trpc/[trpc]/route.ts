import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/collab";
import { mailer } from "@/lib/email";
import { env } from "@/lib/env";
import { appRouter } from "@/server/trpc/router";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const session = await auth.api.getSession({ headers: req.headers });
      return { db, user: session?.user ?? null, mailer, appUrl: env.BETTER_AUTH_URL, publish: publishEvent };
    },
  });

export { handler as GET, handler as POST };
