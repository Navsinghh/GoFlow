import { Bot, History, Play, Sparkles, Undo2, Wand2, type LucideIcon } from "lucide-react";
import { GradientText, SectionHeading } from "./shared";

const upcoming: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Play, title: "Run your workflows", body: "Watch every step light up live, with free built-in AI or your own key." },
  { icon: Bot, title: "Agents with tools", body: "AI that browses, calculates and calls apps, and asks before risky actions." },
  { icon: Wand2, title: "Sketch → Workflow", body: "Draw a flowchart, click Make it run, and the AI builds the workflow." },
  { icon: History, title: "Time-travel runs", body: "Replay any run step by step, fix a step, and re-run from there." },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="relative isolate scroll-mt-20 pt-20 pb-24 sm:pt-28 sm:pb-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 h-[480px] w-[min(900px,120vw)] -translate-x-1/2 rounded-full bg-port-json/10 blur-[140px]" />
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Coming in v2" title={<>AI that <GradientText>actually runs</GradientText></>}>
          Free built-in AI or your own key, with every step lighting up live for the whole team.
        </SectionHeading>
        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AiTeammate />
          {upcoming.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-dashed border-line bg-panel/40 p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-lg border border-line bg-bg text-muted">
                  <Icon className="size-4" />
                </span>
                <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] text-muted">Coming soon</span>
              </div>
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiTeammate() {
  return (
    <article className="relative rounded-2xl bg-linear-to-b from-accent/60 via-port-json/40 to-line p-px md:col-span-2 lg:col-span-1 lg:row-span-2">
      <div className="flex h-full flex-col rounded-[15px] bg-panel p-6">
        <div className="flex items-center justify-between">
          <span className="grid size-9 place-items-center rounded-lg bg-accent/15 text-accent">
            <Sparkles className="size-4" />
          </span>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">Coming soon</span>
        </div>
        <h3 className="mt-4 text-lg font-medium">An AI teammate on the canvas</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Ask in the chat and it edits the flow live, with its own cursor, in front of everyone. One click reverts it.
        </p>
        <div aria-hidden className="mt-6 flex flex-1 flex-col justify-end gap-3 rounded-xl border border-line bg-canvas p-4 text-xs">
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-bg">
            @ai add a step that translates the answer to Hindi
          </div>
          <div className="flex items-start gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-linear-to-br from-accent to-port-json text-bg">
              <Sparkles className="size-3.5" />
            </span>
            <div className="flex-1 rounded-2xl rounded-tl-sm border border-line bg-raised px-3 py-2">
              <p className="text-fg">
                Added <b className="font-medium">Translate</b> (LLM) after <b className="font-medium">Write poem</b> and connected it.
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
                <span>Flowcraft AI · just now</span>
                <span className="inline-flex items-center gap-1 text-accent">
                  <Undo2 className="size-3" /> Revert
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
