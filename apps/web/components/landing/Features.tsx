import type { ReactNode } from "react";
import {
  Check,
  Copy,
  GitBranch,
  Globe,
  History,
  ListChecks,
  MessagesSquare,
  Pencil,
  Plus,
  Shapes,
  Share2,
  Sparkles,
  Type,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "./shared";

const ADA = "#f472b6";
const LIN = "#f2b33d";

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
      <SectionHeading eyebrow="Features" title="Everything you need to think in flows">
        Two modes on one canvas, built for teams from the first click.
      </SectionHeading>
      <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2" icon={Shapes} title="Diagram mode" visual={<DiagramVisual />}>
          Process, decision, start and end shapes, sticky notes and labels. Resize, restyle and connect them from any side.
        </Card>
        <Card icon={Users} title="Live together" visual={<LiveVisual />}>
          Everyone in a flow sees each other&apos;s edits, cursors and selections the moment they happen.
        </Card>
        <Card icon={Workflow} title="Workflow mode" visual={<WorkflowVisual />}>
          Typed nodes that pass data along. Type <code className="font-mono text-port-text">{"{{topic}}"}</code> and a
          matching input appears.
        </Card>
        <Card className="md:col-span-2" icon={MessagesSquare} title="Chat with the change history" visual={<ChatVisual />}>
          Messages and edits share one timeline, so &ldquo;Ada deleted the LLM node&rdquo; sits right next to the
          conversation about it.
        </Card>
        <Card icon={History} title="Versions" visual={<VersionsVisual />}>
          Named saves plus automatic snapshots while you work. Restore with one click, and undo the restore too.
        </Card>
        <Card icon={Share2} title="Sharing" visual={<ShareVisual />}>
          Invite editors or viewers, even before they sign up, or publish a view-only public link.
        </Card>
        <Card icon={ListChecks} title="Live run check" visual={<RunCheckVisual />}>
          Loops, missing inputs and mismatched types are flagged as you build, long before anything runs.
        </Card>
      </div>
    </section>
  );
}

function Card({
  className = "",
  icon: Icon,
  title,
  visual,
  children,
}: {
  className?: string;
  icon: LucideIcon;
  title: string;
  visual: ReactNode;
  children: ReactNode;
}) {
  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel/50 transition duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_24px_60px_-30px_rgb(0_163_255/0.55)] ${className}`}
    >
      <div
        aria-hidden
        className="relative h-52 overflow-hidden border-b border-line/70 bg-canvas bg-[radial-gradient(#173350_1px,transparent_1px)] [background-size:16px_16px]"
      >
        {visual}
      </div>
      <div className="p-6">
        <h3 className="flex items-center gap-2 font-medium">
          <Icon className="size-4 text-accent" />
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </article>
  );
}

function DiagramVisual() {
  const dash = { stroke: "#8aa1bd", strokeWidth: 1.5, strokeDasharray: "4 4", markerEnd: "url(#feature-arrow)" };
  return (
    <svg viewBox="0 0 560 208" className="absolute inset-0 size-full" fontFamily="var(--font-sans)">
      <defs>
        <marker id="feature-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="#8aa1bd" />
        </marker>
      </defs>
      <text x="48" y="48" fontSize="13" fill="#8aa1bd">
        Customer journey
      </text>
      <rect x="48" y="82" width="120" height="44" rx="22" fill="#173a36" stroke="#2fbf71" strokeOpacity="0.5" />
      <text x="108" y="108" fontSize="13" fill="#e6edf7" textAnchor="middle">
        Sign up
      </text>
      <path d="M168 104H220" {...dash} className="motion-safe:animate-edge-flow" />
      <polygon points="276,48 332,104 276,160 220,104" fill="#3a2a17" stroke="#f2b33d" strokeOpacity="0.5" />
      <text x="276" y="108" fontSize="12" fill="#e6edf7" textAnchor="middle">
        Paid plan?
      </text>
      <path d="M332 104H382" {...dash} className="motion-safe:animate-edge-flow" />
      <rect x="384" y="82" width="124" height="44" rx="8" fill="#1c2a44" stroke="#5b6b8c" />
      <text x="446" y="108" fontSize="13" fill="#e6edf7" textAnchor="middle">
        Onboard
      </text>
      {/* The rotation and the float animation both set a transform, so they live on separate groups. */}
      <g transform="rotate(4 452 170)">
        <g className="motion-safe:animate-float">
          <rect x="404" y="146" width="98" height="46" rx="2" fill="#e8c547" />
          <text x="414" y="166" fontSize="11" fill="#2b2205">
            Follow up in
          </text>
          <text x="414" y="181" fontSize="11" fill="#2b2205">
            3 days
          </text>
        </g>
      </g>
    </svg>
  );
}

function LiveVisual() {
  return (
    <div className="absolute inset-0">
      <div className="absolute top-4 right-4 flex">
        {[
          ["A", ADA],
          ["L", LIN],
          ["M", "#2dd4bf"],
        ].map(([initial, color], i) => (
          <span
            key={initial}
            className="grid size-7 place-items-center rounded-full border-2 border-canvas text-xs font-semibold text-bg"
            style={{ background: color, marginLeft: i ? -8 : 0 }}
          >
            {initial}
          </span>
        ))}
        <span className="-ml-2 grid size-7 place-items-center rounded-full border-2 border-canvas bg-raised text-[10px] text-muted">
          +2
        </span>
      </div>
      <div
        className="absolute top-1/2 left-1/2 w-44 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-panel shadow-xl shadow-black/40"
        style={{ outline: `2px solid ${ADA}`, outlineOffset: 3 }}
      >
        <div className="flex items-center gap-2 rounded-t-xl border-b border-line bg-raised/60 px-3 py-1.5 text-xs">
          <Sparkles className="size-3.5 text-accent" /> LLM
        </div>
        <div className="p-2.5">
          <div className="rounded-md border border-line bg-bg px-2 py-1.5 font-mono text-[11px] text-fg/90">
            Summarise <span className="text-port-text">{"{{notes}}"}</span>
          </div>
        </div>
      </div>
      <Pointer name="Ada" color={ADA} className="top-[30%] left-[62%] motion-safe:animate-float" />
      <Pointer name="Lin" color={LIN} className="top-[64%] left-[18%] motion-safe:animate-float [animation-delay:-3s]" />
    </div>
  );
}

function Pointer({ name, color, className }: { name: string; color: string; className: string }) {
  return (
    <div className={`absolute ${className}`}>
      <svg viewBox="0 0 16 16" className="size-[18px]" style={{ color }}>
        <path d="M1.5 1.5l4.8 12.6 1.9-5.4 5.4-1.9z" fill="currentColor" stroke="#011627" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <span
        className="absolute top-4 left-3.5 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-bg"
        style={{ background: color }}
      >
        {name}
      </span>
    </div>
  );
}

function WorkflowVisual() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="w-60 rounded-xl border border-line bg-panel text-xs shadow-xl shadow-black/40">
        <div className="flex items-center gap-2 rounded-t-xl border-b border-line bg-raised/60 px-3 py-1.5">
          <Type className="size-3.5 text-accent" /> Text
        </div>
        <div className="p-2">
          <div className="rounded-md border border-line bg-bg px-2 py-1 font-mono text-[11px] text-fg/90">
            Summarise <span className="text-port-text">{"{{article}}"}</span>
          </div>
        </div>
        <div className="border-t border-line py-1">
          <PortRow side="in" label="article" type="any" className="motion-safe:animate-port-pop" />
          <PortRow side="out" label="text" type="text" />
        </div>
      </div>
      <div className="flex gap-3 font-mono text-[10px] text-muted">
        {(["text", "json", "file", "image"] as const).map((type) => (
          <span key={type} className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: `var(--color-port-${type})` }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}

function PortRow({ side, label, type, className = "" }: { side: "in" | "out"; label: string; type: string; className?: string }) {
  return (
    <div className={`relative flex items-center gap-1.5 px-3 py-1 ${side === "out" ? "justify-end" : ""} ${className}`}>
      <span
        className={`absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-panel ${side === "in" ? "-left-[5px]" : "-right-[5px]"}`}
        style={{ background: `var(--color-port-${type})` }}
      />
      {label}
      <span className="font-mono text-[10px] text-muted">{type}</span>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6">
      <div className="flex w-full max-w-md flex-col gap-2.5 text-xs">
        <TimelineEvent icon={Plus} delay={0}>
          <b className="font-medium text-fg">Ada</b> added &ldquo;Translate&rdquo; (LLM)
        </TimelineEvent>
        <Message delay={1.5} name="Lin" color={LIN}>
          Should it translate to Hindi too?
        </Message>
        <TimelineEvent icon={Pencil} delay={3}>
          <b className="font-medium text-fg">You</b> renamed &ldquo;Text&rdquo; to &ldquo;Prompt&rdquo;
        </TimelineEvent>
        <Message delay={4.5} mine>
          Done, have a look!
        </Message>
      </div>
    </div>
  );
}

function TimelineEvent({ icon: Icon, delay, children }: { icon: LucideIcon; delay: number; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-muted motion-safe:animate-chat-in" style={{ animationDelay: `${delay}s` }}>
      <span className="grid size-5 place-items-center rounded-full bg-raised">
        <Icon className="size-3" />
      </span>
      <span>{children}</span>
    </div>
  );
}

function Message({ delay, name, color, mine, children }: { delay: number; name?: string; color?: string; mine?: boolean; children: ReactNode }) {
  return (
    <div className={`flex flex-col motion-safe:animate-chat-in ${mine ? "items-end" : "items-start"}`} style={{ animationDelay: `${delay}s` }}>
      {name && (
        <span className="mb-0.5 text-[10px] font-medium" style={{ color }}>
          {name}
        </span>
      )}
      <span className={`rounded-2xl px-3 py-1.5 ${mine ? "rounded-br-sm bg-accent text-bg" : "rounded-bl-sm bg-raised text-fg"}`}>
        {children}
      </span>
    </div>
  );
}

function VersionsVisual() {
  const versions = [
    { label: "Before the demo", meta: "Saved by you · 2 min ago", current: true },
    { label: "Auto-save", meta: "12 min ago" },
    { label: "First draft", meta: "Yesterday" },
  ];
  return (
    <div className="absolute inset-0 grid place-items-center">
      <ol className="w-64 space-y-3.5 border-l border-line pl-5 text-xs">
        {versions.map((v) => (
          <li key={v.label} className="relative">
            <span
              className={`absolute top-1 -left-[25px] size-2.5 rounded-full border-2 border-canvas ${v.current ? "bg-accent shadow-[0_0_10px_rgb(0_163_255/0.8)]" : "bg-line"}`}
            />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={v.current ? "font-medium text-fg" : "text-fg/80"}>{v.label}</p>
                <p className="text-[11px] text-muted">{v.meta}</p>
              </div>
              {v.label === "Auto-save" && (
                <span className="rounded-md border border-line bg-raised px-2 py-1 text-[11px] text-fg/90">Restore</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ShareVisual() {
  return (
    <div className="absolute inset-0 grid place-items-center px-5">
      <div className="w-full max-w-[18rem] space-y-3 text-xs">
        <div className="flex gap-1.5">
          <span className="flex-1 truncate rounded-md border border-line bg-bg px-2.5 py-2 text-muted">lin@team.dev</span>
          <span className="rounded-md border border-line bg-raised px-2.5 py-2">Editor</span>
          <span className="rounded-md bg-accent px-3 py-2 font-medium text-bg">Invite</span>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="size-3.5 text-accent" /> Public link
            </span>
            <span className="flex h-4 w-7 items-center rounded-full bg-accent p-0.5">
              <span className="ml-auto size-3 rounded-full bg-bg" />
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-bg px-2.5 py-1.5 font-mono text-[10px] text-muted">
            <span className="truncate">flowcraftapp.vercel.app/share/k9Xq…</span>
            <Copy className="size-3 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RunCheckVisual() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="w-60 space-y-2 text-xs">
        {[
          { icon: GitBranch, label: "No loops" },
          { icon: Workflow, label: "Port types match" },
          { icon: Check, label: "Every input connected" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2">
            <Icon className="size-3.5 text-muted" />
            <span className="flex-1">{label}</span>
            <span className="grid size-4 place-items-center rounded-full bg-ok/20 text-ok">
              <Check className="size-3" />
            </span>
          </div>
        ))}
        <div className="mx-auto mt-3 w-fit rounded-full border border-ok/30 bg-ok/10 px-3 py-1 text-ok">✓ Ready to run</div>
      </div>
    </div>
  );
}
