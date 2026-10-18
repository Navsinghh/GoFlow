import "server-only";
import { z } from "zod";

const optional = z.string().min(1).optional();

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "Generate one with: openssl rand -base64 32"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  /** Shared with apps/collab to sign real-time session tokens. */
  COLLAB_SECRET: z.string().min(32, "Generate one with: openssl rand -base64 32"),
  /** Server-to-server address of apps/collab (not exposed to browsers). */
  COLLAB_INTERNAL_URL: z.url().default("http://localhost:1234"),
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("Flowcraft <onboarding@resend.dev>"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,
});

export const env = schema.parse(process.env);

/** OAuth providers that have credentials configured. */
export const oauthProviders = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
};
