import Link from "next/link";
import { Bot, History, MessagesSquare, Play, Shapes, Sparkles, Users, Wand2, Workflow } from "lucide-react";
import { Brand } from "@/components/Brand";
import { WakeCollab } from "@/components/WakeCollab";
import { getSession } from "@/lib/auth";

const features = [
  { icon: Shapes, title: "Diagram mode", body: "Shapes, sticky notes and connectors for flow maps of any kind." },
  { icon: Workflow, title: "Workflow mode", body: "Design AI pipelines with typed nodes, {{variables}} and a live run check." },
  { icon: Users, title: "Live together", body: "Edit at the same time with live cursors, sharing, and a public view-only link." },
  { icon: MessagesSquare, title: "Chat and history", body: "Talk next to the changes people make, and restore any saved version." },
];

const comingNext = [
  { icon: Play, title: "Run your workflows", body: "Watch every step light up live, with free built-in AI or your own key." },
  { icon: Bot, title: "Agents with tools", body: "AI that browses, calculates and calls apps, and asks before risky actions." },
  { icon: Wand2, title: "Sketch → Workflow", body: "Draw a flowchart, click Make it run, and the AI builds the workflow." },
  { icon: History, title: "Time-travel runs", body: "Replay any run step by step, fix a step, and re-run from there." },
];

export default async function Home() {
  const session = await getSession();
  return (
    <main data-page-scroll className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-16 sm:px-6 sm:py-24">
      <WakeCollab />
      <Brand />
      <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
        Map it out. Then make it run.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted">
        Diagrams and AI workflows on one live, collaborative canvas. Sketch a process, design the pipeline next to it,
        and work on it together in real time.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={session ? "/dashboard" : "/sign-in"}
          className="rounded-lg bg-accent px-5 py-3 font-medium text-bg transition hover:brightness-110"
        >
          {session ? "Go to your flows" : "Get started free"}
        </Link>
        <Link
          href="/playground"
          className="rounded-lg border border-line bg-panel px-5 py-3 font-medium transition hover:bg-raised"
        >
          Try it without signing up
        </Link>
      </div>

      <section aria-labelledby="in-v1" className="mt-20">
        <h2 id="in-v1" className="text-sm font-medium text-muted">
          In v1, today
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-line bg-panel p-6">
              <Icon className="size-5 text-accent" />
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="in-v2" className="mt-16">
        <h2 id="in-v2" className="flex items-center gap-2 text-sm font-medium text-muted">
          <Sparkles className="size-4 text-accent" />
          Coming in v2: AI that actually runs
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {comingNext.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-dashed border-line p-6">
              <div className="flex items-center justify-between">
                <Icon className="size-5 text-muted" />
                <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] text-muted">Coming soon</span>
              </div>
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
