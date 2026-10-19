import Link from "next/link";
import { Play } from "lucide-react";
import { Brand } from "@/components/Brand";
import { StartLink, secondaryButton } from "./shared";

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="px-4 pb-24 sm:px-6 sm:pb-32">
      <div className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-3xl border border-accent/30 bg-panel px-6 py-16 text-center sm:px-16 sm:py-20">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgb(0_163_255/0.28),transparent_65%)]" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(#1b3d5c_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] [background-size:20px_20px]"
        />
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Start mapping in seconds</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-muted">
          Open the playground without an account, or sign up to save your flows and invite your team.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <StartLink signedIn={signedIn} />
          <Link href="/playground" className={secondaryButton}>
            <Play className="size-4" /> Try the playground
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <Brand href="/" />
          <p>Diagrams and AI workflows, together.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/playground" className="transition hover:text-fg">
            Playground
          </Link>
          <Link href="/sign-in" className="transition hover:text-fg">
            Sign in
          </Link>
          <a href="#roadmap" className="transition hover:text-fg">
            Roadmap
          </a>
        </nav>
      </div>
    </footer>
  );
}
