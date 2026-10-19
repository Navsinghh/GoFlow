import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { HeroCanvas } from "./HeroCanvas";
import { GradientText, StartLink, secondaryButton } from "./shared";

export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative isolate">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1b3d5c_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)] [background-size:24px_24px]" />
        <div className="absolute -top-56 left-1/2 h-[600px] w-[min(1000px,140vw)] -translate-x-1/2 rounded-full bg-accent/25 blur-[130px]" />
        <div className="absolute top-[480px] -left-48 h-[420px] w-[520px] rounded-full bg-port-text/10 blur-[120px]" />
        <div className="absolute top-[560px] -right-48 h-[420px] w-[520px] rounded-full bg-port-json/15 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-16 text-center sm:px-6 sm:pt-24">
        <a
          href="#roadmap"
          className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-medium text-accent transition hover:bg-accent/15"
        >
          <Sparkles className="size-3.5" />
          v2 is on its way: AI workflows that actually run
          <ArrowRight className="size-3.5" />
        </a>
        <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-semibold tracking-tight sm:text-7xl">
          Map it out.{" "}
          <span className="block">
            <GradientText>Then make it run.</GradientText>
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-muted sm:text-xl">
          Diagrams and AI workflows on one live, collaborative canvas. Sketch a process, design the pipeline next to it, and
          build it together in real time.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <StartLink signedIn={signedIn} />
          <Link href="/playground" className={secondaryButton}>
            <Play className="size-4" /> Try the playground
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">No account needed for the playground · free while in v1</p>
      </div>

      <div className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <HeroCanvas />
      </div>
    </section>
  );
}
