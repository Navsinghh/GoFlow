import type { CSSProperties, ReactNode } from "react";
import {
  Check,
  LogIn,
  LogOut,
  Maximize,
  MessagesSquare,
  Minus,
  Plus,
  Share2,
  Sparkles,
  Type,
  type LucideIcon,
} from "lucide-react";

/**
 * A picture of the editor, drawn at a fixed 1000 × 560 design size. `u()` turns
 * design units into lengths relative to the frame's width, so the whole scene
 * scales with the page instead of reflowing.
 */
const u = (n: number) => `${n / 10}cqw`;

const ADA = "#f472b6";
const LIN = "#f2b33d";

const HEADER = 24;
const ROW = 18;
const PORTS_TOP = 3;
const portColor = { any: "var(--color-port-any)", text: "var(--color-port-text)" };

interface Port {
  side: "in" | "out";
  label: string;
  type: keyof typeof portColor;
}

interface MockNode {
  id: string;
  title: string;
  icon: LucideIcon;
  x: number;
  y: number;
  w: number;
  fieldH: number;
  field: ReactNode;
  ports: Port[];
  /** Outline colour of the collaborator who has it selected. */
  selectedBy?: string;
}

const variable = (name: string) => <span className="text-port-text">{`{{${name}}}`}</span>;

const nodes: MockNode[] = [
  {
    id: "input",
    title: "Input",
    icon: LogIn,
    x: 180,
    y: 100,
    w: 150,
    fieldH: 44,
    field: "topic",
    ports: [{ side: "out", label: "topic", type: "text" }],
  },
  {
    id: "text",
    title: "Text",
    icon: Type,
    x: 375,
    y: 92,
    w: 170,
    fieldH: 56,
    field: <>Write a four-line poem about {variable("topic")}</>,
    ports: [
      { side: "in", label: "topic", type: "any" },
      { side: "out", label: "text", type: "text" },
    ],
    selectedBy: ADA,
  },
  {
    id: "llm",
    title: "LLM",
    icon: Sparkles,
    x: 590,
    y: 100,
    w: 150,
    fieldH: 44,
    field: variable("context"),
    ports: [
      { side: "in", label: "context", type: "any" },
      { side: "out", label: "response", type: "text" },
    ],
  },
  {
    id: "output",
    title: "Output",
    icon: LogOut,
    x: 785,
    y: 100,
    w: 150,
    fieldH: 44,
    field: "poem",
    ports: [{ side: "in", label: "poem", type: "text" }],
  },
];

const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));

function portPoint(id: string, index: number) {
  const node = byId[id]!;
  const port = node.ports[index]!;
  return {
    x: port.side === "in" ? node.x : node.x + node.w,
    y: node.y + HEADER + node.fieldH + PORTS_TOP + ROW * index + ROW / 2,
  };
}

const edges = [
  [portPoint("input", 0), portPoint("text", 0)],
  [portPoint("text", 1), portPoint("llm", 0)],
  [portPoint("llm", 1), portPoint("output", 0)],
];

const palette = [
  { icon: LogIn, label: "Input", hint: "A value you supply" },
  { icon: LogOut, label: "Output", hint: "A result it returns" },
  { icon: Type, label: "Text", hint: "A template" },
  { icon: Sparkles, label: "LLM", hint: "Generate text" },
];

export function HeroCanvas() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-px rounded-[22px] bg-linear-to-b from-accent/60 via-line to-line/0" />
      <div
        role="img"
        aria-label="The Flowcraft editor: a workflow from Input through Text and LLM to Output, a small flowchart below it, two collaborators' cursors and the team chat."
        className="@container relative aspect-[1000/560] overflow-hidden rounded-[21px] bg-canvas shadow-[0_40px_120px_-30px_rgb(0_163_255/0.45)]"
      >
        <TopBar />
        <Palette />
        <div
          className="absolute inset-0"
          style={{
            left: u(150),
            top: u(44),
            backgroundImage: `radial-gradient(#1f4466 ${u(1.1)}, transparent ${u(1.3)})`,
            backgroundSize: `${u(20)} ${u(20)}`,
          }}
        />
        <Wires />
        {nodes.map((node) => (
          <Node key={node.id} node={node} />
        ))}
        <StickyNote />
        <ZoomControls />
        <Chat />
        <StatusPill />
        <Minimap />
        <Cursor name="Ada" color={ADA} className="motion-safe:animate-cursor-ada" style={{ left: "44cqw", top: "15cqw" }} />
        <Cursor name="Lin" color={LIN} className="motion-safe:animate-cursor-lin" style={{ left: "33cqw", top: "42.5cqw" }} />
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div
      className="absolute inset-x-0 top-0 flex items-center border-b border-line bg-panel"
      style={{ height: u(44), paddingInline: u(16), gap: u(10), fontSize: u(11.5) }}
    >
      <span className="font-mono text-accent">flowcraft</span>
      <span
        className="rounded-full border border-accent/40 bg-accent/10 font-mono text-accent"
        style={{ fontSize: u(8), paddingInline: u(5) }}
      >
        v1
      </span>
      <span className="text-line">/</span>
      <span>Launch plan</span>
      <div className="ml-auto flex items-center" style={{ gap: u(14) }}>
        <div className="flex">
          {[
            ["A", ADA],
            ["L", LIN],
            ["Y", "var(--color-accent)"],
          ].map(([initial, color], i) => (
            <span
              key={initial}
              className="grid place-items-center rounded-full border-2 border-panel font-semibold text-bg"
              style={{ width: u(22), height: u(22), marginLeft: i ? u(-6) : 0, background: color, fontSize: u(9) }}
            >
              {initial}
            </span>
          ))}
        </div>
        <span className="flex items-center text-muted" style={{ gap: u(4) }}>
          <Check style={{ width: u(12), height: u(12) }} /> Saved
        </span>
        <span
          className="flex items-center rounded-md bg-accent font-medium text-bg"
          style={{ gap: u(5), padding: `${u(5)} ${u(10)}` }}
        >
          <Share2 style={{ width: u(11), height: u(11) }} /> Share
        </span>
      </div>
    </div>
  );
}

function Palette() {
  return (
    <div
      className="absolute left-0 border-r border-line bg-panel"
      style={{ top: u(44), bottom: 0, width: u(150), padding: u(10), fontSize: u(10.5) }}
    >
      <div className="grid grid-cols-2 rounded-md bg-bg text-center" style={{ padding: u(3), fontSize: u(9.5) }}>
        <span className="text-muted" style={{ paddingBlock: u(4) }}>
          Diagram
        </span>
        <span className="rounded bg-raised" style={{ paddingBlock: u(4) }}>
          Workflow
        </span>
      </div>
      <p className="font-medium tracking-wider text-muted" style={{ marginTop: u(16), fontSize: u(8) }}>
        NODES
      </p>
      {palette.map(({ icon: Icon, label, hint }) => (
        <div key={label} className="flex items-center" style={{ gap: u(8), marginTop: u(10) }}>
          <span className="grid place-items-center rounded-md bg-bg text-accent" style={{ width: u(26), height: u(26) }}>
            <Icon style={{ width: u(13), height: u(13) }} />
          </span>
          <span>
            <span className="block">{label}</span>
            <span className="block text-muted" style={{ fontSize: u(8.5) }}>
              {hint}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Connections and the flowchart, drawn in the same 1000 × 560 space as the nodes. */
function Wires() {
  return (
    <svg viewBox="0 0 1000 560" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <marker id="hero-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="#8aa1bd" />
        </marker>
      </defs>
      {edges.map(([a, b], i) => (
        <path
          key={i}
          d={`M${a!.x} ${a!.y} C${a!.x + 32} ${a!.y} ${b!.x - 32} ${b!.y} ${b!.x} ${b!.y}`}
          fill="none"
          stroke="var(--color-port-text)"
          strokeOpacity="0.8"
          strokeWidth="1.6"
          strokeDasharray="4 4"
          className="motion-safe:animate-edge-flow"
        />
      ))}
      <g fontFamily="var(--font-sans)" textAnchor="middle" fill="#e6edf7">
        <text x="200" y="338" textAnchor="start" fontSize="11" fill="#8aa1bd">
          Launch process
        </text>
        <rect x="200" y="360" width="120" height="40" rx="20" fill="#173a36" stroke="#2fbf71" strokeOpacity="0.5" />
        <text x="260" y="384.5" fontSize="12">
          New idea
        </text>
        <path d="M320 380H382" stroke="#8aa1bd" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#hero-arrow)" className="motion-safe:animate-edge-flow" />
        <polygon points="430,334 476,380 430,426 384,380" fill="#3a2a17" stroke="#f2b33d" strokeOpacity="0.5" />
        <text x="430" y="384" fontSize="11">
          Worth it?
        </text>
        <path d="M476 380H516" stroke="#8aa1bd" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#hero-arrow)" className="motion-safe:animate-edge-flow" />
        <rect x="518" y="360" width="120" height="40" rx="6" fill="#1c2a44" stroke="#5b6b8c" />
        <text x="578" y="384.5" fontSize="12">
          Build it
        </text>
      </g>
    </svg>
  );
}

function Node({ node }: { node: MockNode }) {
  const Icon = node.icon;
  return (
    <div
      className="absolute rounded-[0.9cqw] border border-line bg-panel shadow-[0_1.2cqw_3cqw_-1cqw_rgb(0_0_0/0.55)]"
      style={{
        left: u(node.x),
        top: u(node.y),
        width: u(node.w),
        fontSize: u(11.5),
        outline: node.selectedBy ? `${u(2)} solid ${node.selectedBy}` : undefined,
        outlineOffset: u(3),
      }}
    >
      <div
        className="flex items-center rounded-t-[0.9cqw] border-b border-line bg-raised/60"
        style={{ height: u(HEADER), gap: u(6), paddingInline: u(9) }}
      >
        <Icon className="text-accent" style={{ width: u(12), height: u(12) }} />
        {node.title}
      </div>
      <div style={{ height: u(node.fieldH), padding: u(7) }}>
        <div
          className="h-full rounded-[0.4cqw] border border-line bg-bg font-mono text-fg/90"
          style={{ fontSize: u(9.5), padding: `${u(4)} ${u(7)}`, lineHeight: 1.45 }}
        >
          {node.field}
        </div>
      </div>
      <div className="border-t border-line" style={{ paddingTop: u(PORTS_TOP), paddingBottom: u(3) }}>
        {node.ports.map((port) => (
          <div
            key={port.side + port.label}
            className={`relative flex items-center ${port.side === "out" ? "justify-end" : ""}`}
            style={{ height: u(ROW), paddingInline: u(10), gap: u(5), fontSize: u(9.5) }}
          >
            <span
              className="absolute top-1/2 -translate-y-1/2 rounded-full border-panel"
              style={{
                width: u(9),
                height: u(9),
                borderWidth: u(1.6),
                background: portColor[port.type],
                ...(port.side === "in" ? { left: u(-5) } : { right: u(-5) }),
              }}
            />
            {port.label}
            <span className="font-mono text-muted" style={{ fontSize: u(8) }}>
              {port.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StickyNote() {
  return (
    <div
      className="absolute -rotate-3 bg-[#e8c547] text-[#2b2205] shadow-[0_1cqw_2cqw_-1cqw_rgb(0_0_0/0.5)]"
      style={{ left: u(668), top: u(346), width: u(92), height: u(78), padding: u(8), fontSize: u(10), lineHeight: 1.35 }}
    >
      Launch on Friday! Ada owns the prompt.
    </div>
  );
}

function ZoomControls() {
  return (
    <div className="absolute flex flex-col overflow-hidden rounded-md border border-line" style={{ left: u(164), top: u(470) }}>
      {[Plus, Minus, Maximize].map((Icon, i) => (
        <span
          key={i}
          className="grid place-items-center border-line bg-panel text-fg/80 not-first:border-t"
          style={{ width: u(22), height: u(22) }}
        >
          <Icon style={{ width: u(11), height: u(11) }} />
        </span>
      ))}
    </div>
  );
}

function Chat() {
  return (
    <div
      className="absolute rounded-[0.9cqw] border border-line bg-panel/95 shadow-[0_1.5cqw_4cqw_-1cqw_rgb(0_0_0/0.6)]"
      style={{ left: u(772), top: u(246), width: u(208), padding: u(11), fontSize: u(9.5) }}
    >
      <div className="flex items-center font-medium" style={{ gap: u(6), marginBottom: u(9), fontSize: u(11) }}>
        <MessagesSquare className="text-accent" style={{ width: u(13), height: u(13) }} /> Chat
      </div>
      <div className="flex flex-col" style={{ gap: u(7) }}>
        <ChatEvent delay={0}>
          <b className="font-medium text-fg">Ada</b> added “LLM”
        </ChatEvent>
        <ChatBubble delay={1.4} name="Lin" color={LIN}>
          Can it translate the poem too?
        </ChatBubble>
        <ChatEvent delay={2.8}>
          <b className="font-medium text-fg">Ada</b> edited “Text”
        </ChatEvent>
        <ChatBubble delay={4.2} mine>
          Next on the list!
        </ChatBubble>
      </div>
    </div>
  );
}

function ChatEvent({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <div className="flex items-center text-muted motion-safe:animate-chat-in" style={{ gap: u(5), animationDelay: `${delay}s` }}>
      <span className="grid place-items-center rounded-full bg-raised" style={{ width: u(13), height: u(13) }}>
        <Plus style={{ width: u(8), height: u(8) }} />
      </span>
      <span>{children}</span>
    </div>
  );
}

function ChatBubble({
  delay,
  name,
  color,
  mine,
  children,
}: {
  delay: number;
  name?: string;
  color?: string;
  mine?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col motion-safe:animate-chat-in ${mine ? "items-end" : "items-start"}`} style={{ animationDelay: `${delay}s` }}>
      {name && (
        <span className="font-medium" style={{ color, fontSize: u(8.5), marginBottom: u(2) }}>
          {name}
        </span>
      )}
      <span
        className={mine ? "rounded-[0.8cqw] bg-accent text-bg" : "rounded-[0.8cqw] bg-raised text-fg"}
        style={{ padding: `${u(5)} ${u(9)}` }}
      >
        {children}
      </span>
    </div>
  );
}

function StatusPill() {
  return (
    <div
      className="absolute -translate-x-1/2 rounded-full border border-line bg-panel/95 text-muted"
      style={{ left: u(575), top: u(520), padding: `${u(5)} ${u(12)}`, fontSize: u(9.5) }}
    >
      9 nodes · 5 connections · <span className="text-ok">✓ Ready to run</span>
    </div>
  );
}

/** The canvas overview: workflow nodes in blue, shapes in grey, as in the real minimap. */
function Minimap() {
  const scale = (x: number, y: number, w: number, h: number) => ({
    x: 4 + (x - 150) * 0.1318,
    y: 4 + (y - 44) * 0.1124,
    width: w * 0.1318,
    height: h * 0.1124,
  });
  const workflow = nodes.map((n) => scale(n.x, n.y, n.w, HEADER + n.fieldH + PORTS_TOP + ROW * n.ports.length + 4));
  const shapes = [scale(200, 360, 120, 40), scale(384, 334, 92, 92), scale(518, 360, 120, 40), scale(668, 346, 92, 78)];
  return (
    <svg
      viewBox="0 0 120 66"
      className="absolute rounded-md border border-line bg-panel"
      style={{ left: u(858), top: u(478), width: u(120), height: u(66) }}
      aria-hidden
    >
      {workflow.map((r, i) => (
        <rect key={i} {...r} rx="1" fill="var(--color-accent)" opacity="0.85" />
      ))}
      {shapes.map((r, i) => (
        <rect key={i} {...r} rx="1" fill="#5b6b8c" />
      ))}
    </svg>
  );
}

function Cursor({ name, color, className, style }: { name: string; color: string; className: string; style: CSSProperties }) {
  return (
    <div className={`absolute z-10 ${className}`} style={style}>
      <svg viewBox="0 0 16 16" style={{ width: u(17), height: u(17), color }}>
        <path d="M1.5 1.5l4.8 12.6 1.9-5.4 5.4-1.9z" fill="currentColor" stroke="#011627" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <span
        className="absolute rounded-full font-medium whitespace-nowrap text-bg"
        style={{ left: u(13), top: u(15), background: color, fontSize: u(9), padding: `${u(1.5)} ${u(7)}` }}
      >
        {name}
      </span>
    </div>
  );
}
