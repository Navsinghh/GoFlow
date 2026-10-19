import { Boxes, Database, GitMerge, ShieldCheck } from "lucide-react";

const points = [
  {
    icon: GitMerge,
    title: "Conflict-free editing",
    body: "Yjs CRDTs synced through a self-hosted Hocuspocus server, so simultaneous edits merge instead of overwriting each other.",
  },
  {
    icon: Boxes,
    title: "One definition per node",
    body: "Each node type is a single typed entry. The palette, canvas, settings form and validation are all generated from it.",
  },
  {
    icon: Database,
    title: "Durable by design",
    body: "Three layers of debounced autosave, named versions and a full change history in Postgres, merged under row locks.",
  },
  {
    icon: ShieldCheck,
    title: "Secure and tested",
    body: "OAuth sign-in, signed real-time tokens and role checks on every request, with integration tests against real Postgres and WebSockets.",
  },
];

const stack = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "React Flow",
  "Yjs",
  "Hocuspocus",
  "tRPC",
  "TanStack Query",
  "Better Auth",
  "Drizzle ORM",
  "PostgreSQL",
  "Tailwind CSS 4",
  "Zod",
  "Vitest",
  "Turborepo",
];

export function UnderTheHood() {
  return (
    <section id="under-the-hood" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-24 pb-8 sm:px-6 sm:pt-32 sm:pb-12">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-accent uppercase">Under the hood</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Engineered like a production app</h2>
          <p className="mt-4 text-lg text-pretty text-muted">
            A full-stack TypeScript monorepo, built the way real collaborative tools are built.
          </p>
          <dl className="mt-10 grid gap-6 sm:grid-cols-2">
            {points.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <dt className="flex items-center gap-2 font-medium">
                  <span className="grid size-8 place-items-center rounded-lg border border-line bg-panel text-accent">
                    <Icon className="size-4" />
                  </span>
                  {title}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Architecture />
      </div>
      <ul className="mt-16 flex flex-wrap justify-center gap-2" aria-label="Tech stack">
        {stack.map((name) => (
          <li key={name} className="rounded-full border border-line bg-panel/60 px-3 py-1 font-mono text-xs text-fg/80">
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}

const archNodes = [
  { id: "browser", x: 8, y: 146, title: "Browser", sub: "React Flow · Yjs", dot: "#60a5fa" },
  { id: "web", x: 236, y: 36, title: "Website", sub: "Next.js on Vercel", dot: "#e6edf7" },
  { id: "collab", x: 236, y: 256, title: "Collab server", sub: "Hocuspocus on Cloud Run", dot: "#2dd4bf" },
  { id: "db", x: 464, y: 146, title: "Postgres", sub: "Neon", dot: "#a78bfa" },
] as const;

type ArchId = (typeof archNodes)[number]["id"];

const W = 156;
const H = 62;

function link(from: ArchId, to: ArchId) {
  const a = archNodes.find((n) => n.id === from)!;
  const b = archNodes.find((n) => n.id === to)!;
  const [ax, ay, bx, by] = [a.x + W, a.y + H / 2, b.x, b.y + H / 2];
  return `M${ax} ${ay} C${ax + 34} ${ay} ${bx - 34} ${by} ${bx} ${by}`;
}

const wires = [
  { d: link("browser", "web"), label: "HTTPS", x: 194, y: 118 },
  { d: link("browser", "collab"), label: "WebSocket", x: 194, y: 236 },
  { d: link("web", "db") },
  { d: link("collab", "db") },
];

function Architecture() {
  return (
    <div className="relative rounded-2xl border border-line bg-canvas bg-[radial-gradient(#173350_1px,transparent_1px)] p-4 [background-size:16px_16px] shadow-[0_30px_80px_-40px_rgb(0_163_255/0.5)]">
      <svg
        viewBox="0 0 628 340"
        className="w-full"
        role="img"
        aria-label="Architecture: the browser talks to the website on Vercel over HTTPS and to the collaboration server on Cloud Run over a WebSocket; both store data in Postgres on Neon."
      >
        {wires.map((wire) => (
          <g key={wire.d}>
            <path d={wire.d} fill="none" stroke="var(--color-accent)" strokeOpacity="0.7" strokeWidth="1.6" strokeDasharray="4 4" className="motion-safe:animate-edge-flow" />
            {wire.label && (
              <text x={wire.x} y={wire.y} fontSize="11" fill="#8aa1bd" fontFamily="var(--font-mono)" textAnchor="end">
                {wire.label}
              </text>
            )}
          </g>
        ))}
        {archNodes.map((n) => (
          <g key={n.id} fontFamily="var(--font-sans)">
            <rect x={n.x} y={n.y} width={W} height={H} rx="10" fill="#0a2238" stroke="#1b3d5c" />
            <path d={`M${n.x} ${n.y + 10}a10 10 0 0 1 10-10h${W - 20}a10 10 0 0 1 10 10v14h-${W}z`} fill="#10304d" opacity="0.7" />
            <circle cx={n.x + 14} cy={n.y + 12} r="4" fill={n.dot} />
            <text x={n.x + 25} y={n.y + 16.5} fontSize="12.5" fill="#e6edf7" fontWeight="500">
              {n.title}
            </text>
            <text x={n.x + 12} y={n.y + 46} fontSize="11" fill="#8aa1bd">
              {n.sub}
            </text>
            {n.id !== "browser" && <circle cx={n.x} cy={n.y + H / 2} r="4.5" fill="var(--color-accent)" stroke="#04192c" strokeWidth="2" />}
            {n.id !== "db" && <circle cx={n.x + W} cy={n.y + H / 2} r="4.5" fill="var(--color-accent)" stroke="#04192c" strokeWidth="2" />}
          </g>
        ))}
      </svg>
    </div>
  );
}
