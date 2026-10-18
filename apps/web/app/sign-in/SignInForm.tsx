"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface Props {
  callbackURL: string;
  providers: { google: boolean; github: boolean };
  /** Off in production unless an email service is configured. */
  emailEnabled: boolean;
}

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

const buttonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-60";

export function SignInForm({ callbackURL, providers, emailEnabled }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const sendLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setState({ kind: "sending" });
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL,
      errorCallbackURL: "/sign-in",
    });
    setState(error ? { kind: "error", message: error.message ?? "Couldn't send the link." } : { kind: "sent", email });
  };

  if (state.kind === "sent") {
    return (
      <div className="mt-8 rounded-xl border border-line bg-panel p-5">
        <Mail className="size-5 text-accent" />
        <h2 className="mt-3 font-medium">Check your inbox</h2>
        <p className="mt-1 text-sm text-muted">
          We sent a sign-in link to <span className="text-fg">{state.email}</span>. It expires in 5 minutes.
        </p>
        {process.env.NODE_ENV === "development" && (
          <p className="mt-3 rounded-md bg-bg px-3 py-2 font-mono text-xs text-muted">
            Dev mode: without RESEND_API_KEY the link is printed in the terminal running the server.
          </p>
        )}
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          className="mt-4 text-sm text-accent hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const oauth = (["github", "google"] as const).filter((provider) => providers[provider]);
  return (
    <div className="mt-8 space-y-6">
      {oauth.length > 0 && (
        <div className="space-y-2">
          {oauth.map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => authClient.signIn.social({ provider, callbackURL })}
              className={`${buttonClass} border border-line bg-panel hover:bg-raised`}
            >
              {provider === "github" ? <GitHubMark /> : <GoogleMark />}
              Continue with {provider === "google" ? "Google" : "GitHub"}
            </button>
          ))}
        </div>
      )}

      {emailEnabled && (
        <>
          {oauth.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
          )}
          <form onSubmit={sendLink} className="space-y-3">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button type="submit" disabled={state.kind === "sending"} className={`${buttonClass} bg-accent text-bg hover:brightness-110`}>
              {state.kind === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
            {state.kind === "error" && (
              <p role="alert" className="text-sm text-danger">
                {state.message}
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}
