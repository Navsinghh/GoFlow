import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { headers } from "next/headers";
import { cache } from "react";
import { schema } from "@flowcraft/db";
import { ensurePersonalWorkspace } from "@/server/workspaces";
import { db } from "./db";
import { sendMagicLinkEmail } from "./email";
import { emailSignIn, env } from "./env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET && {
        google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
      }),
    ...(env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET && {
        github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
      }),
  },
  account: { accountLinking: { enabled: true, trustedProviders: ["google", "github"] } },
  databaseHooks: {
    user: {
      create: { after: async (user) => void (await ensurePersonalWorkspace(db, user)) },
    },
  },
  plugins: [
    ...(emailSignIn ? [magicLink({ sendMagicLink: ({ email, url }) => sendMagicLinkEmail(email, url) })] : []),
    // Must be last: lets server actions set auth cookies.
    nextCookies(),
  ],
});

/** Session for the current request, deduplicated across a single render. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
