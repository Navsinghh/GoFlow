import { Shapes, Users, Workflow } from "lucide-react";
import { SectionHeading } from "./shared";

const steps = [
  {
    icon: Shapes,
    title: "Sketch the process",
    body: "Drop shapes, sticky notes and arrows to agree on how things should work. Diagrams never break a pipeline.",
  },
  {
    icon: Workflow,
    title: "Wire up the workflow",
    body: "Turn the steps into typed nodes. The live run check tells you exactly what's missing before you run.",
  },
  {
    icon: Users,
    title: "Build it together",
    body: "Invite your team, talk next to the changes, and let autosave and versions keep every step safe.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 border-y border-line/50 bg-panel/20 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="How it works" title="From whiteboard to working pipeline">
          One canvas takes you from the first sketch to a workflow your whole team understands.
        </SectionHeading>
        <div className="relative mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3">
          {/* A connection running between the cards, like edges between nodes. */}
          <svg aria-hidden viewBox="0 0 100 2" preserveAspectRatio="none" className="absolute top-[3.75rem] left-[16%] hidden h-0.5 w-[68%] md:block">
            <path
              d="M0 1H100"
              stroke="var(--color-accent)"
              strokeOpacity="0.6"
              strokeWidth="2"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              className="motion-safe:animate-edge-flow"
            />
          </svg>
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="relative rounded-2xl border border-line bg-panel p-6 text-center">
              {i > 0 && <Port side="in" />}
              {i < steps.length - 1 && <Port side="out" />}
              <div className="relative mx-auto grid size-14 place-items-center rounded-2xl border border-accent/30 bg-bg text-accent shadow-[0_0_32px_-8px_rgb(0_163_255/0.7)]">
                <Icon className="size-6" />
                <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-accent font-mono text-xs font-semibold text-bg">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Port({ side }: { side: "in" | "out" }) {
  return (
    <span
      aria-hidden
      className={`absolute top-[3.75rem] hidden size-3 -translate-y-1/2 rounded-full border-2 border-bg bg-accent md:block ${side === "in" ? "-left-1.5" : "-right-1.5"}`}
    />
  );
}
