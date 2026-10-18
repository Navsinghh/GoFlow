import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { getSession } from "@/lib/auth";
import { emailSignIn, oauthProviders } from "@/lib/env";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in · Flowcraft" };

const errors: Record<string, string> = {
  INVALID_TOKEN: "That sign-in link is invalid or was already used.",
  EXPIRED_TOKEN: "That sign-in link has expired. Request a new one.",
};

/** Only allow redirects back into this app. */
function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, error } = await searchParams;
  const callbackURL = safeNext(next);
  if (await getSession()) redirect(callbackURL);

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <Brand href="/" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Sign in or create an account</h1>
        <p className="mt-2 text-sm text-muted">Your flows are saved to your account, and there's no limit on how many.</p>
        {typeof error === "string" && (
          <p role="alert" className="mt-6 rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-fg">
            {errors[error] ?? "Something went wrong signing you in. Please try again."}
          </p>
        )}
        {emailSignIn || oauthProviders.github || oauthProviders.google ? (
          <SignInForm callbackURL={callbackURL} providers={oauthProviders} emailEnabled={emailSignIn} />
        ) : (
          <p className="mt-8 rounded-lg border border-line bg-panel p-4 text-sm text-muted">
            Sign-in isn't set up on this server yet. In the meantime you can{" "}
            <Link href="/playground" className="text-accent hover:underline">
              try Flowcraft without an account
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
