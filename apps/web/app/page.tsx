import Link from "next/link";
import { Shapes, Sparkles, Users, Workflow } from "lucide-react";

const features = [
  { icon: Shapes, title: "Diagram mode", body: "Shapes, sticky notes and connectors for flow maps of any kind." },
  { icon: Workflow, title: "Workflow mode", body: "Typed nodes and {{variables}} that compile into a runnable pipeline." },
  { icon: Users, title: "Built for teams", body: "Every flow is a CRDT document, ready for live multiplayer editing." },
  { icon: Sparkles, title: "AI native", body: "LLM nodes powered by Claude, with generate-a-flow from a prompt." },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-16 sm:px-6 sm:py-24">
      <p className="font-mono text-sm text-accent">flowcraft</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
        Map it out. Then make it run.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted">
        Diagrams and executable AI workflows on one canvas. Sketch a process, wire it into a pipeline, and keep every
        flow saved to your account.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/playground"
          className="rounded-lg bg-accent px-5 py-3 font-medium text-bg transition hover:brightness-110"
        >
          Open the playground
        </Link>
      </div>
      <div className="mt-20 grid gap-4 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-line bg-panel p-6">
            <Icon className="size-5 text-accent" />
            <h2 className="mt-4 font-medium">{title}</h2>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
