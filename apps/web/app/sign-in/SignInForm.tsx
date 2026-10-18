"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface Props {
  callbackURL: string;
  providers: { google: boolean; github: boolean };
}

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

const buttonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-60";

export function SignInForm({ callbackURL, providers }: Props) {
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

  const anyOAuth = providers.google || providers.github;
  return (
    <div className="mt-8 space-y-6">
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

      {anyOAuth && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <div className="space-y-2">
            {(["google", "github"] as const)
              .filter((provider) => providers[provider])
              .map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => authClient.signIn.social({ provider, callbackURL })}
                  className={`${buttonClass} border border-line bg-panel hover:bg-raised`}
                >
                  Continue with {provider === "google" ? "Google" : "GitHub"}
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
